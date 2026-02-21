import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TweetCard, TweetWithAuthor } from "@/components/tweet-card";
import { Bookmark } from "lucide-react";
import { T } from "@/components/translated-text";

export default async function BookmarksPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const bookmarks = await prisma.bookmark.findMany({
        where: { userId: session.user.id },
        include: {
            tweet: {
                include: {
                    author: {
                        select: { id: true, name: true, username: true, image: true, verified: true },
                    },
                    _count: { select: { likes: true, retweets: true, replies: true, bookmarks: true } },
                    likes: { where: { userId: session.user.id }, select: { userId: true } },
                    retweets: { where: { userId: session.user.id }, select: { userId: true } },
                    bookmarks: { where: { userId: session.user.id }, select: { userId: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    const tweets = bookmarks.map((b) => ({
        ...b.tweet,
        isLiked: b.tweet.likes.length > 0,
        isRetweeted: b.tweet.retweets.length > 0,
        isBookmarked: true,
        currentUserId: session.user.id,
    })) as TweetWithAuthor[];

    return (
        <div>
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
                <h1 className="text-xl font-bold"><T k="bookmarks" /></h1>
                <p className="text-xs text-muted-foreground">@{session.user.username}</p>
            </div>

            {tweets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Bookmark className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2"><T k="noBookmarks" /></h3>
                    <p className="text-muted-foreground max-w-xs">
                        <T k="noBookmarksDesc" />
                    </p>
                </div>
            ) : (
                tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
            )}
        </div>
    );
}
