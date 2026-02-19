"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function followUser(targetUserId: string) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };
    if (session.user.id === targetUserId) return { error: "Cannot follow yourself" };

    const existingFollow = await prisma.follow.findUnique({
        where: {
            followerId_followingId: {
                followerId: session.user.id,
                followingId: targetUserId,
            },
        },
    });

    if (existingFollow) {
        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: session.user.id,
                    followingId: targetUserId,
                },
            },
        });
        return { following: false };
    } else {
        await prisma.follow.create({
            data: {
                followerId: session.user.id,
                followingId: targetUserId,
            },
        });
        // Notification
        await prisma.notification.upsert({
            where: { id: `${session.user.id}-follow-${targetUserId}` },
            update: {},
            create: {
                id: `${session.user.id}-follow-${targetUserId}`,
                type: "FOLLOW",
                recipientId: targetUserId,
                senderId: session.user.id,
            },
        });
        return { following: true };
    }
}

const profileSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    bio: z.string().max(160).optional(),
    location: z.string().max(30).optional(),
    website: z.string().url().optional().or(z.literal("")),
    image: z.string().url().optional().or(z.literal("")),
    coverImage: z.string().url().optional().or(z.literal("")),
});

export async function updateProfile(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Not authenticated" };

    const raw = {
        name: formData.get("name") as string,
        bio: formData.get("bio") as string,
        location: formData.get("location") as string,
        website: formData.get("website") as string,
        image: formData.get("image") as string,
        coverImage: formData.get("coverImage") as string,
    };

    const validated = profileSchema.safeParse(raw);
    if (!validated.success) return { error: validated.error.issues[0].message };

    const updated = await prisma.user.update({
        where: { id: session.user.id },
        data: {
            name: validated.data.name,
            bio: validated.data.bio || null,
            location: validated.data.location || null,
            website: validated.data.website || null,
            image: validated.data.image || null,
            coverImage: validated.data.coverImage || null,
        },
    });

    revalidatePath(`/profile/${updated.username}`);
    return { success: true };
}

export async function markNotificationsRead() {
    const session = await auth();
    if (!session?.user?.id) return;

    await prisma.notification.updateMany({
        where: { recipientId: session.user.id, read: false },
        data: { read: true },
    });

    revalidatePath("/notifications");
}

