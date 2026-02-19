import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TweetCard, TweetWithAuthor } from "@/components/tweet-card";
import { TweetComposer } from "@/components/tweet-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function TweetDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await auth();

    const tweet = await prisma.tweet.findUnique({
        where: { id },
        include: {
            author: {
                select: { id: true, name: true, username: true, image: true, verified: true },
            },
            _count: { select: { likes: true, retweets: true, replies: true, bookmarks: true } },
            likes: session?.user?.id
                ? { where: { userId: session.user.id }, select: { userId: true } }
                : false,
            retweets: session?.user?.id
                ? { where: { userId: session.user.id }, select: { userId: true } }
                : false,
            bookmarks: session?.user?.id
                ? { where: { userId: session.user.id }, select: { userId: true } }
                : false,
            replies: {
                include: {
                    author: {
                        select: { id: true, name: true, username: true, image: true, verified: true },
                    },
                    _count: { select: { likes: true, retweets: true, replies: true, bookmarks: true } },
                    likes: session?.user?.id
                        ? { where: { userId: session.user.id }, select: { userId: true } }
                        : false,
                    retweets: session?.user?.id
                        ? { where: { userId: session.user.id }, select: { userId: true } }
                        : false,
                    bookmarks: session?.user?.id
                        ? { where: { userId: session.user.id }, select: { userId: true } }
                        : false,
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!tweet) notFound();

    const tweetWithMeta = {
        ...tweet,
        isLiked: Array.isArray(tweet.likes) && tweet.likes.length > 0,
        isRetweeted: Array.isArray(tweet.retweets) && tweet.retweets.length > 0,
        isBookmarked: Array.isArray(tweet.bookmarks) && tweet.bookmarks.length > 0,
        currentUserId: session?.user?.id ?? null,
    } as TweetWithAuthor;

    const replies = tweet.replies.map((r) => ({
        ...r,
        isLiked: Array.isArray(r.likes) && r.likes.length > 0,
        isRetweeted: Array.isArray(r.retweets) && r.retweets.length > 0,
        isBookmarked: Array.isArray(r.bookmarks) && r.bookmarks.length > 0,
        currentUserId: session?.user?.id ?? null,
    })) as TweetWithAuthor[];

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border flex items-center gap-6 px-4 py-3">
                <Link href="/" className="p-2 rounded-full hover:bg-foreground/10 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold">Post</h1>
            </div>

            {/* Main tweet expanded */}
            <div className="px-4 py-4 border-b border-border">
                <div className="flex items-center gap-3 mb-3">
                    <Link href={`/profile/${tweet.author.username}`}>
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={tweet.author.image ?? undefined} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                {((tweet.author.name ?? tweet.author.username ?? "U")[0] ?? "U").toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </Link>
                    <div>
                        <div className="flex items-center gap-1">
                            <Link href={`/profile/${tweet.author.username}`} className="font-bold hover:underline">
                                {tweet.author.name ?? tweet.author.username}
                            </Link>
                            {tweet.author.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground">@{tweet.author.username}</p>
                    </div>
                </div>

                <p className="text-xl leading-relaxed mb-4 whitespace-pre-wrap">{tweet.content}</p>

                <p className="text-sm text-muted-foreground border-b border-border pb-3 mb-3">
                    {formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true })}
                </p>

                {/* Stats */}
                <div className="flex gap-4 text-sm border-b border-border pb-3 mb-3">
                    <span><strong>{tweet._count.retweets}</strong> <span className="text-muted-foreground">Reposts</span></span>
                    <span><strong>{tweet._count.likes}</strong> <span className="text-muted-foreground">Likes</span></span>
                    <span><strong>{tweet._count.bookmarks}</strong> <span className="text-muted-foreground">Bookmarks</span></span>
                </div>
            </div>

            {/* Reply composer */}
            {session?.user && (
                <div className="border-b border-border px-4 py-3">
                    <TweetComposer parentId={tweet.id} placeholder="Post your reply" />
                </div>
            )}

            {/* Replies */}
            {replies.map((reply) => (
                <TweetCard key={reply.id} tweet={reply} />
            ))}

            {replies.length === 0 && (
                <div className="flex flex-col items-center py-16 text-center">
                    <p className="text-muted-foreground">No replies yet. Be the first to reply!</p>
                </div>
            )}
        </div>
    );
}
