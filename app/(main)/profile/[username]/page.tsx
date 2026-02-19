import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { TweetCard, TweetWithAuthor } from "@/components/tweet-card";
import { FollowButton } from "@/components/follow-button";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BadgeCheck, Calendar, Link2, MapPin } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return { title: "User not found" };
    return { title: `${user.name ?? user.username} (@${user.username}) / X` };
}

async function getProfileData(username: string, currentUserId?: string) {
    const user = await prisma.user.findUnique({
        where: { username },
        include: {
            _count: {
                select: { followers: true, following: true, tweets: true },
            },
            followers: currentUserId
                ? { where: { followerId: currentUserId }, select: { followerId: true } }
                : false,
        },
    });

    if (!user) return null;

    const tweets = await prisma.tweet.findMany({
        where: { authorId: user.id, parentId: null },
        include: {
            author: {
                select: { id: true, name: true, username: true, image: true, verified: true },
            },
            _count: { select: { likes: true, retweets: true, replies: true, bookmarks: true } },
            likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
            retweets: currentUserId
                ? { where: { userId: currentUserId }, select: { userId: true } }
                : false,
            bookmarks: currentUserId
                ? { where: { userId: currentUserId }, select: { userId: true } }
                : false,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
    });

    return {
        user,
        isFollowing: Array.isArray(user.followers) && user.followers.length > 0,
        tweets: tweets.map((t) => ({
            ...t,
            isLiked: Array.isArray(t.likes) && t.likes.length > 0,
            isRetweeted: Array.isArray(t.retweets) && t.retweets.length > 0,
            isBookmarked: Array.isArray(t.bookmarks) && t.bookmarks.length > 0,
            currentUserId: currentUserId ?? null,
        })) as TweetWithAuthor[],
    };
}

export default async function ProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;
    const session = await auth();
    const data = await getProfileData(username, session?.user?.id);

    if (!data) notFound();

    const { user, isFollowing, tweets } = data;
    const isOwnProfile = session?.user?.id === user.id;

    return (
        <div>
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
                <h1 className="text-xl font-bold">{user.name ?? user.username}</h1>
                <p className="text-xs text-muted-foreground">{user._count.tweets} posts</p>
            </div>

            {/* Cover image */}
            <div className="relative h-40 bg-primary/20">
                {user.coverImage && (
                    <Image src={user.coverImage} alt="Cover" fill className="object-cover" />
                )}
            </div>

            {/* Profile info */}
            <div className="px-4 pb-4">
                <div className="flex items-end justify-between -mt-12 mb-4">
                    <Avatar className="h-24 w-24 border-4 border-background">
                        <AvatarImage src={user.image ?? undefined} />
                        <AvatarFallback className="text-2xl bg-primary/20 text-primary font-bold">
                            {((user.name ?? user.username ?? "U")[0] ?? "U").toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        {isOwnProfile ? (
                            <EditProfileDialog user={user} />
                        ) : session?.user ? (
                            <FollowButton targetUserId={user.id} isFollowing={isFollowing} />
                        ) : null}
                    </div>
                </div>

                <div className="mb-3">
                    <div className="flex items-center gap-1">
                        <h2 className="text-xl font-bold">{user.name ?? user.username}</h2>
                        {user.verified && <BadgeCheck className="h-5 w-5 text-primary" />}
                    </div>
                    <p className="text-muted-foreground text-sm">@{user.username}</p>
                </div>

                {user.bio && <p className="mb-3 text-sm leading-relaxed">{user.bio}</p>}

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                    {user.location && (
                        <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {user.location}
                        </span>
                    )}
                    {user.website && (
                        <a
                            href={user.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                        >
                            <Link2 className="h-4 w-4" />
                            {user.website.replace(/^https?:\/\//, "")}
                        </a>
                    )}
                    <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Joined {format(new Date(user.createdAt), "MMMM yyyy")}
                    </span>
                </div>

                <div className="flex gap-4 text-sm">
                    <span>
                        <strong className="font-bold">{user._count.following}</strong>{" "}
                        <span className="text-muted-foreground">Following</span>
                    </span>
                    <span>
                        <strong className="font-bold">{user._count.followers}</strong>{" "}
                        <span className="text-muted-foreground">Followers</span>
                    </span>
                </div>
            </div>

            {/* Tweets tabs */}
            <Tabs defaultValue="posts">
                <div className="sticky top-[57px] z-10 backdrop-blur-md bg-background/80 border-b border-border">
                    <TabsList className="w-full rounded-none bg-transparent h-auto">
                        {["posts", "replies", "media", "likes"].map((tab) => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="flex-1 rounded-none py-3 text-sm font-semibold capitalize data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground"
                            >
                                {tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="posts" className="mt-0">
                    {tweets.length === 0 ? (
                        <div className="flex flex-col items-center py-16 text-center px-4">
                            <h3 className="text-xl font-bold mb-2">No posts yet</h3>
                            <p className="text-muted-foreground">When they post, their tweets will show up here.</p>
                        </div>
                    ) : (
                        tweets.map((tweet) => <TweetCard key={tweet.id} tweet={tweet} />)
                    )}
                </TabsContent>
                <TabsContent value="replies" className="mt-0">
                    <div className="flex flex-col items-center py-16 text-center px-4">
                        <p className="text-muted-foreground">No replies yet.</p>
                    </div>
                </TabsContent>
                <TabsContent value="media" className="mt-0">
                    <div className="flex flex-col items-center py-16 text-center px-4">
                        <p className="text-muted-foreground">No media yet.</p>
                    </div>
                </TabsContent>
                <TabsContent value="likes" className="mt-0">
                    <div className="flex flex-col items-center py-16 text-center px-4">
                        <p className="text-muted-foreground">No likes yet.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
