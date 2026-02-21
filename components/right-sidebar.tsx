import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Separator } from "@/components/ui/separator";
import { FollowButton } from "@/components/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { SidebarSearch } from "@/components/sidebar-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { T } from "@/components/translated-text";

async function getTrendingHashtags() {
    // Fetch recent 500 tweets and parse hashtags from content
    const tweets = await prisma.tweet.findMany({
        select: { content: true },
        orderBy: { createdAt: "desc" },
        take: 500,
    });

    const counts: Record<string, number> = {};
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g;

    for (const tweet of tweets) {
        const matches = tweet.content.matchAll(hashtagRegex);
        for (const match of matches) {
            const tag = `#${match[1]}`;
            counts[tag] = (counts[tag] ?? 0) + 1;
        }
    }

    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));
}

export async function RightSidebar() {
    const session = await auth();
    const currentUserId = session?.user?.id ?? null;

    // Real users to suggest: not self, not already followed
    const suggestions = currentUserId
        ? await prisma.user.findMany({
            where: {
                id: { not: currentUserId },
                followers: { none: { followerId: currentUserId } },
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
                verified: true,
                _count: { select: { followers: true } },
            },
            orderBy: { followers: { _count: "desc" } },
            take: 3,
        })
        : [];

    const trends = await getTrendingHashtags();

    return (
        <aside className="sticky top-0 h-screen w-[350px] py-2 px-4 overflow-y-auto scrollbar-hide hidden lg:block">
            {/* Search */}
            <SidebarSearch />

            {/* What's Happening */}
            <div className="bg-muted/50 rounded-2xl mb-4">
                <h2 className="font-bold text-xl px-4 pt-4 pb-2"><T k="whatsHappening" /></h2>
                {trends.length === 0 ? (
                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                        <T k="noTrending" />
                    </p>
                ) : (
                    trends.map((trend, i) => (
                        <div key={trend.tag}>
                            <Link
                                href={`/explore?q=${encodeURIComponent(trend.tag)}`}
                                className="block w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors"
                            >
                                <p className="text-muted-foreground text-xs"><T k="trending" /></p>
                                <p className="font-bold text-sm">{trend.tag}</p>
                                <p className="text-muted-foreground text-xs">{trend.count} {trend.count === 1 ? "post" : "posts"}</p>
                            </Link>
                            {i < trends.length - 1 && <Separator />}
                        </div>
                    ))
                )}
            </div>

            {/* Who to Follow */}
            {suggestions.length > 0 && (
                <div className="bg-muted/50 rounded-2xl mb-4">
                    <h2 className="font-bold text-xl px-4 pt-4 pb-2"><T k="whoToFollow" /></h2>
                    {suggestions.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors"
                        >
                            <Link href={`/profile/${user.username}`} className="shrink-0">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={user.image ?? undefined} />
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                        {(user.name ?? user.username ?? "U")[0].toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link href={`/profile/${user.username}`}>
                                    <div className="flex items-center gap-1">
                                        <p className="font-bold text-sm truncate hover:underline">
                                            {user.name ?? user.username}
                                        </p>
                                        {user.verified && (
                                            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-sm truncate">
                                        @{user.username}
                                    </p>
                                </Link>
                                <p className="text-xs text-muted-foreground">
                                    {user._count.followers} follower{user._count.followers !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <FollowButton
                                targetUserId={user.id}
                                isFollowing={false}
                                className="shrink-0"
                            />
                        </div>
                    ))}
                    <button className="w-full text-left px-4 py-4 text-primary hover:bg-foreground/5 transition-colors rounded-b-2xl text-sm">
                        <T k="showMore" />
                    </button>
                </div>
            )}

            {/* Language Switcher */}
            <div className="px-2 mb-3">
                <LanguageSwitcher />
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 text-xs text-muted-foreground">
                {(["termsOfService", "privacyPolicy", "cookiePolicy", "accessibility", "adsInfo", "more"] as const).map((key) => (
                    <button key={key} className="hover:underline">
                        <T k={key} />
                    </button>
                ))}
                <span>© 2026 X Corp.</span>
            </div>
        </aside>
    );
}
