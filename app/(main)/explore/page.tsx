import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TweetCard, TweetWithAuthor } from "@/components/tweet-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExploreSearch } from "@/components/explore-search";
import { TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "@/components/follow-button";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { T } from "@/components/translated-text";

async function getTrendingHashtags() {
    const tweets = await prisma.tweet.findMany({
        select: { content: true },
        orderBy: { createdAt: "desc" },
        take: 500,
    });
    const counts: Record<string, number> = {};
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;
    for (const tweet of tweets) {
        for (const match of tweet.content.matchAll(hashtagRegex)) {
            const tag = `#${match[1]}`;
            counts[tag] = (counts[tag] ?? 0) + 1;
        }
    }
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([tag, count]) => ({ tag, count }));
}

export default async function ExplorePage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const session = await auth();
    const { q } = await searchParams;
    const query = q?.trim() ?? "";

    // Base tweet query builder
    const tweetSelect = {
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
    } as const;

    const toMeta = (t: any): TweetWithAuthor => ({
        ...t,
        isLiked: Array.isArray(t.likes) && t.likes.length > 0,
        isRetweeted: Array.isArray(t.retweets) && t.retweets.length > 0,
        isBookmarked: Array.isArray(t.bookmarks) && t.bookmarks.length > 0,
        currentUserId: session?.user?.id ?? null,
    });

    if (query) {
        // ── Search mode ───────────────────────────────────────────
        const [tweetResults, userResults] = await Promise.all([
            prisma.tweet.findMany({
                where: {
                    parentId: null,
                    content: { contains: query, mode: "insensitive" },
                },
                ...tweetSelect,
                orderBy: { createdAt: "desc" },
                take: 20,
            }),
            prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { username: { contains: query, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true, name: true, username: true, image: true, verified: true,
                    _count: { select: { followers: true } },
                    followers: session?.user?.id
                        ? { where: { followerId: session.user.id }, select: { followerId: true } }
                        : false,
                },
                take: 5,
            }),
        ]);

        const tweets = tweetResults.map(toMeta);

        return (
            <div>
                <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
                    <ExploreSearch initialQuery={query} />
                </div>

                <div className="px-4 py-3 border-b border-border">
                    <p className="text-muted-foreground text-sm">
                        Search results for <span className="font-bold text-foreground">&ldquo;{query}&rdquo;</span>
                    </p>
                </div>

                {/* People results */}
                {userResults.length > 0 && (
                    <div className="border-b border-border">
                        <div className="px-4 py-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <h2 className="font-bold"><T k="people" /></h2>
                        </div>
                        {userResults.map((user) => {
                            const isFollowing = Array.isArray(user.followers) && user.followers.length > 0;
                            return (
                                <div key={user.id} className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-foreground/[0.03] transition-colors">
                                    <Link href={`/profile/${user.username}`} className="shrink-0">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                                {(user.name ?? user.username ?? "U")[0].toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <Link href={`/profile/${user.username}`}>
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-sm hover:underline truncate">{user.name ?? user.username}</span>
                                                {user.verified && <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />}
                                            </div>
                                            <p className="text-muted-foreground text-sm">@{user.username}</p>
                                        </Link>
                                        <p className="text-xs text-muted-foreground">{user._count.followers} followers</p>
                                    </div>
                                    {session?.user?.id && session.user.id !== user.id && (
                                        <FollowButton targetUserId={user.id} isFollowing={isFollowing} className="shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Tweet results */}
                {tweets.length === 0 && userResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <p className="text-xl font-bold mb-2">No results for &ldquo;{query}&rdquo;</p>
                        <p className="text-muted-foreground text-sm">Try searching for different keywords or hashtags.</p>
                    </div>
                ) : (
                    tweets.map((t) => <TweetCard key={t.id} tweet={t} />)
                )}
            </div>
        );
    }

    // ── Default / browse mode ─────────────────────────────────────
    const [tweets, trending] = await Promise.all([
        prisma.tweet.findMany({
            where: { parentId: null },
            ...tweetSelect,
            orderBy: [{ likes: { _count: "desc" } }],
            take: 20,
        }),
        getTrendingHashtags(),
    ]);

    const tweetsWithMeta = tweets.map(toMeta);

    return (
        <div>
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
                <h1 className="text-xl font-bold mb-3"><T k="explore" /></h1>
                <ExploreSearch initialQuery="" />
            </div>

            <Tabs defaultValue="trending">
                <div className="sticky top-[113px] z-10 backdrop-blur-md bg-background/80 border-b border-border">
                    <TabsList className="w-full rounded-none bg-transparent h-auto">
                        {["trending", "top", "latest"].map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="flex-1 rounded-none py-4 text-sm font-semibold capitalize data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="trending" className="mt-0">
                    {trending.length > 0 && (
                        <div className="border-b border-border p-4">
                            <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                <T k="trending" />
                            </h2>
                            <div className="space-y-3">
                                {trending.map(({ tag, count }) => (
                                    <Link
                                        key={tag}
                                        href={`/explore?q=${encodeURIComponent(tag)}`}
                                        className="flex items-center justify-between hover:bg-foreground/5 p-2 rounded-lg -mx-2 transition-colors"
                                    >
                                        <div>
                                            <p className="font-bold">{tag}</p>
                                            <p className="text-sm text-muted-foreground">{count} {count === 1 ? "post" : "posts"}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    {tweetsWithMeta.map((t) => <TweetCard key={t.id} tweet={t} />)}
                </TabsContent>

                <TabsContent value="top" className="mt-0">
                    {tweetsWithMeta
                        .slice()
                        .sort((a, b) => b._count.likes - a._count.likes)
                        .map((t) => <TweetCard key={t.id} tweet={t} />)}
                </TabsContent>

                <TabsContent value="latest" className="mt-0">
                    {tweetsWithMeta.map((t) => <TweetCard key={t.id} tweet={t} />)}
                </TabsContent>
            </Tabs>
        </div>
    );
}
