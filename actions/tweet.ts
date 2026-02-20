"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createAudioTweet(content: string, audioUrl: string) {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Not authenticated");

    await prisma.tweet.create({
        data: {
            content,
            audioUrl,
            authorId: session.user.id,
        },
    });

    revalidatePath("/");
}


const tweetSchema = z.object({
    content: z.string().min(1, "Tweet cannot be empty").max(280, "Tweet is too long"),
    image: z.string().url().optional().or(z.literal("")),
    parentId: z.string().optional(),
});

export type TweetState = {
    error?: string;
    success?: boolean;
};

export async function createTweet(formData: FormData): Promise<TweetState> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    // ── Plan limit check ──
    const PLAN_LIMITS: Record<string, number> = { free: 1, bronze: 3, silver: 5, gold: -1 };
    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true, tweetCount: true, planExpiresAt: true },
    });

    if (dbUser) {
        // Reset count if plan has expired (fall back to free)
        const plan = dbUser.planExpiresAt && dbUser.planExpiresAt < new Date()
            ? "free"
            : (dbUser.plan ?? "free");

        const limit = PLAN_LIMITS[plan] ?? 1;
        if (limit !== -1 && dbUser.tweetCount >= limit) {
            const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
            return {
                error: `You've reached your tweet limit for the ${planLabel} plan (${limit} tweet${limit !== 1 ? "s" : ""}/month). Upgrade to post more.`,
            };
        }
    }

    const raw = {
        content: formData.get("content") as string,
        image: (formData.get("image") as string) || undefined,
        parentId: (formData.get("parentId") as string) || undefined,
    };

    const validated = tweetSchema.safeParse(raw);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const { content, image, parentId } = validated.data;

    const tweet = await prisma.tweet.create({
        data: {
            content,
            image: image || null,
            authorId: session.user.id,
            parentId: parentId || null,
        },
    });

    // Increment tweet count for plan tracking
    await prisma.user.update({
        where: { id: session.user.id },
        data: { tweetCount: { increment: 1 } },
    });

    // Create notification for reply
    if (parentId) {
        const parentTweet = await prisma.tweet.findUnique({
            where: { id: parentId },
            select: { authorId: true },
        });
        if (parentTweet && parentTweet.authorId !== session.user.id) {
            await prisma.notification.create({
                data: {
                    type: "REPLY",
                    recipientId: parentTweet.authorId,
                    senderId: session.user.id,
                    tweetId: tweet.id,
                },
            });
        }
    }

    revalidatePath("/");
    if (parentId) revalidatePath(`/tweet/${parentId}`);

    return { success: true };
}

export async function deleteTweet(tweetId: string): Promise<TweetState> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const tweet = await prisma.tweet.findUnique({
        where: { id: tweetId },
        select: { authorId: true },
    });

    if (!tweet) return { error: "Tweet not found" };
    if (tweet.authorId !== session.user.id) return { error: "Not authorized" };

    await prisma.tweet.delete({ where: { id: tweetId } });

    revalidatePath("/");
    revalidatePath(`/profile/${session.user.username}`);

    return { success: true };
}

export async function likeTweet(tweetId: string): Promise<TweetState> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const existingLike = await prisma.like.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existingLike) {
        await prisma.like.delete({
            where: { userId_tweetId: { userId: session.user.id, tweetId } },
        });
    } else {
        await prisma.like.create({
            data: { userId: session.user.id, tweetId },
        });
        // Notification
        const tweet = await prisma.tweet.findUnique({
            where: { id: tweetId },
            select: { authorId: true },
        });
        if (tweet && tweet.authorId !== session.user.id) {
            await prisma.notification.upsert({
                where: {
                    // we use a workaround since there's no unique on type+sender+tweet
                    id: `${session.user.id}-like-${tweetId}`,
                },
                update: {},
                create: {
                    id: `${session.user.id}-like-${tweetId}`,
                    type: "LIKE",
                    recipientId: tweet.authorId,
                    senderId: session.user.id,
                    tweetId,
                },
            });
        }
    }

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath("/bookmarks");
    revalidatePath(`/tweet/${tweetId}`);
    return { success: true };
}

export async function retweetTweet(tweetId: string): Promise<TweetState> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const existingRetweet = await prisma.retweet.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existingRetweet) {
        await prisma.retweet.delete({
            where: { userId_tweetId: { userId: session.user.id, tweetId } },
        });
    } else {
        await prisma.retweet.create({
            data: { userId: session.user.id, tweetId },
        });
        const tweet = await prisma.tweet.findUnique({
            where: { id: tweetId },
            select: { authorId: true },
        });
        if (tweet && tweet.authorId !== session.user.id) {
            await prisma.notification.upsert({
                where: { id: `${session.user.id}-retweet-${tweetId}` },
                update: {},
                create: {
                    id: `${session.user.id}-retweet-${tweetId}`,
                    type: "RETWEET",
                    recipientId: tweet.authorId,
                    senderId: session.user.id,
                    tweetId,
                },
            });
        }
    }

    revalidatePath("/");
    revalidatePath("/explore");
    revalidatePath(`/tweet/${tweetId}`);
    return { success: true };
}

export async function bookmarkTweet(tweetId: string): Promise<TweetState> {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const existingBookmark = await prisma.bookmark.findUnique({
        where: { userId_tweetId: { userId: session.user.id, tweetId } },
    });

    if (existingBookmark) {
        await prisma.bookmark.delete({
            where: { userId_tweetId: { userId: session.user.id, tweetId } },
        });
    } else {
        await prisma.bookmark.create({
            data: { userId: session.user.id, tweetId },
        });
    }

    revalidatePath("/");
    revalidatePath("/bookmarks");
    revalidatePath(`/tweet/${tweetId}`);
    return { success: true };
}

