import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TweetCard, TweetWithAuthor } from "@/components/tweet-card";
import { TweetComposer } from "@/components/tweet-composer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveFeedBanner } from "@/components/live-feed-banner";
import { KeywordNotifier } from "@/components/keyword-notifier";
import { AudioTweetComposer } from "@/components/audio-tweet-composer";

async function getTweets(userId: string, tab: "for-you" | "following") {
    const whereClause =
        tab === "following"
            ? {
                parentId: null,
                author: {
                    followers: { some: { followerId: userId } },
                },
            }
            : { parentId: null };

    const tweets = await prisma.tweet.findMany({
        where: whereClause,
        include: {
            author: {
                select: { id: true, name: true, username: true, image: true, verified: true },
            },
            _count: { select: { likes: true, retweets: true, replies: true, bookmarks: true } },
            likes: { where: { userId }, select: { userId: true } },
            retweets: { where: { userId }, select: { userId: true } },
            bookmarks: { where: { userId }, select: { userId: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return tweets.map((tweet) => ({
        ...tweet,
        isLiked: tweet.likes.length > 0,
        isRetweeted: tweet.retweets.length > 0,
        isBookmarked: tweet.bookmarks.length > 0,
        currentUserId: userId,
    })) as TweetWithAuthor[];
}

export default async function HomePage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const [forYouTweets, followingTweets] = await Promise.all([
        getTweets(session.user.id, "for-you"),
        getTweets(session.user.id, "following"),
    ]);

    // Anchor timestamp — newest tweet at page load time, used by LiveFeedBanner polling
    const latestTweetAt = forYouTweets[0]?.createdAt?.toISOString() ?? new Date().toISOString();

    return (
        <div>
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border">
                <h1 className="px-4 py-3 text-xl font-bold">Home</h1>
            </div>

            <Tabs defaultValue="for-you">
                <div className="sticky top-[57px] z-10 backdrop-blur-md bg-background/80 border-b border-border">
                    <TabsList className="w-full rounded-none bg-transparent h-auto">
                        <TabsTrigger
                            value="for-you"
                            className="flex-1 rounded-none py-4 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                        >
                            For you
                        </TabsTrigger>
                        <TabsTrigger
                            value="following"
                            className="flex-1 rounded-none py-4 text-sm font-semibold data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                        >
                            Following
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="for-you" className="mt-0">
                    {/* Tweet composer */}
                    <div className="border-b border-border px-4 py-3">
                        <TweetComposer />
                    </div>

                    {/* Audio tweet composer */}
                    <div className="border-b border-border px-4 py-3">
                        <AudioTweetComposer />
                    </div>

                    {/* Live "new tweets" banner — polls every 30s */}
                    <LiveFeedBanner latestTweetAt={latestTweetAt} />

                    {/* Keyword notifier — fires browser notification for 'cricket'/'science' tweets */}
                    <KeywordNotifier tweets={forYouTweets.map(t => ({ id: t.id, content: t.content, author: t.author }))} />

                    {forYouTweets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <p className="text-muted-foreground">No tweets yet. Be the first to post!</p>
                        </div>
                    ) : (
                        forYouTweets.map((tweet) => (
                            <TweetCard key={tweet.id} tweet={tweet} />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="following" className="mt-0">
                    {followingTweets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                            <h3 className="text-xl font-bold mb-2">Follow people to see their tweets</h3>
                            <p className="text-muted-foreground">
                                When you follow someone, their tweets will show up here.
                            </p>
                        </div>
                    ) : (
                        followingTweets.map((tweet) => (
                            <TweetCard key={tweet.id} tweet={tweet} />
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
