"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import {
    Heart,
    MessageCircle,
    Repeat2,
    Share,
    Bookmark,
    MoreHorizontal,
    BadgeCheck,
    Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { likeTweet, retweetTweet, bookmarkTweet, deleteTweet } from "@/actions/tweet";
import { cn } from "@/lib/utils";

export type TweetWithAuthor = {
    id: string;
    content: string;
    image: string | null;
    audioUrl?: string | null;
    createdAt: Date;
    parentId: string | null;
    author: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
        verified: boolean;
    };
    _count: {
        likes: number;
        retweets: number;
        replies: number;
        bookmarks: number;
    };
    isLiked?: boolean;
    isRetweeted?: boolean;
    isBookmarked?: boolean;
    currentUserId?: string | null;
};

export function TweetCard({ tweet }: { tweet: TweetWithAuthor }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [liked, setLiked] = useState(tweet.isLiked ?? false);
    const [likeCount, setLikeCount] = useState(tweet._count.likes);
    const [retweeted, setRetweeted] = useState(tweet.isRetweeted ?? false);
    const [retweetCount, setRetweetCount] = useState(tweet._count.retweets);
    const [bookmarked, setBookmarked] = useState(tweet.isBookmarked ?? false);

    const handleLike = () => {
        setLiked((prev) => !prev);
        setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
        startTransition(async () => {
            const result = await likeTweet(tweet.id);
            if (result.error) {
                setLiked((prev) => !prev);
                setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
            }
        });
    };

    const handleRetweet = () => {
        setRetweeted((prev) => !prev);
        setRetweetCount((prev) => (retweeted ? prev - 1 : prev + 1));
        startTransition(async () => {
            const result = await retweetTweet(tweet.id);
            if (result.error) {
                setRetweeted((prev) => !prev);
                setRetweetCount((prev) => (retweeted ? prev + 1 : prev - 1));
            }
        });
    };

    const handleBookmark = () => {
        setBookmarked((prev) => !prev);
        startTransition(async () => { await bookmarkTweet(tweet.id); });
    };

    const handleDelete = () => {
        startTransition(async () => {
            await deleteTweet(tweet.id);
        });
    };

    const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true });
    const isOwner = tweet.currentUserId === tweet.author.id;

    return (
        <article
            className="flex gap-3 px-4 py-3 border-b border-border hover:bg-foreground/[0.03] transition-colors cursor-pointer"
            onClick={() => router.push(`/tweet/${tweet.id}`)}
        >
            {/* Avatar */}
            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Link href={`/profile/${tweet.author.username}`}>
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={tweet.author.image ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold">
                            {(tweet.author.name ?? tweet.author.username)[0].toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </Link>
            </div>

            <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <Link
                            href={`/profile/${tweet.author.username}`}
                            className="font-bold hover:underline truncate text-sm"
                        >
                            {tweet.author.name ?? tweet.author.username}
                        </Link>
                        {tweet.author.verified && (
                            <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span className="text-muted-foreground text-sm truncate">
                            @{tweet.author.username} · {timeAgo}
                        </span>
                    </div>

                    {/* Actions menu */}
                    <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1.5 rounded-full hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors opacity-0 group-hover:opacity-100">
                                    <MoreHorizontal className="h-4 w-4" />
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {isOwner && (
                                    <DropdownMenuItem
                                        className="text-red-500 focus:text-red-500"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete tweet
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>Copy link</DropdownMenuItem>
                                {!isOwner && <DropdownMenuItem>Report tweet</DropdownMenuItem>}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Content */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                    {tweet.content}
                </p>

                {/* Image */}
                {tweet.image && (
                    <div className="mb-3 rounded-2xl overflow-hidden border border-border">
                        <Image
                            src={tweet.image}
                            alt="Tweet image"
                            width={500}
                            height={300}
                            className="w-full object-cover max-h-[300px]"
                        />
                    </div>
                )}

                {/* Audio player */}
                {tweet.audioUrl && (
                    <div
                        className="mb-3 flex items-center gap-2 p-3 rounded-2xl border border-border bg-muted/30"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <span className="text-lg">🎙️</span>
                        <audio
                            controls
                            src={tweet.audioUrl}
                            className="flex-1 h-8"
                            style={{ minWidth: 0 }}
                        />
                    </div>
                )}

                {/* Actions */}
                <div
                    className="flex items-center justify-between max-w-xs text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Reply */}
                    <button
                        className="flex items-center gap-1.5 group/btn hover:text-primary transition-colors"
                        onClick={() => router.push(`/tweet/${tweet.id}`)}
                    >
                        <span className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                            <MessageCircle className="h-4 w-4" />
                        </span>
                        <span className="text-xs">{tweet._count.replies > 0 ? tweet._count.replies : ""}</span>
                    </button>

                    {/* Retweet */}
                    <button
                        className={cn(
                            "flex items-center gap-1.5 group/btn hover:text-green-500 transition-colors",
                            retweeted && "text-green-500"
                        )}
                        onClick={handleRetweet}
                        disabled={isPending}
                    >
                        <span className="p-1.5 rounded-full group-hover/btn:bg-green-500/10 transition-colors">
                            <Repeat2 className="h-4 w-4" />
                        </span>
                        <span className="text-xs">{retweetCount > 0 ? retweetCount : ""}</span>
                    </button>

                    {/* Like */}
                    <button
                        className={cn(
                            "flex items-center gap-1.5 group/btn hover:text-pink-500 transition-colors",
                            liked && "text-pink-500"
                        )}
                        onClick={handleLike}
                        disabled={isPending}
                    >
                        <span className="p-1.5 rounded-full group-hover/btn:bg-pink-500/10 transition-colors">
                            <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                        </span>
                        <span className="text-xs">{likeCount > 0 ? likeCount : ""}</span>
                    </button>

                    {/* Bookmark */}
                    <button
                        className={cn(
                            "flex items-center gap-1.5 group/btn hover:text-primary transition-colors",
                            bookmarked && "text-primary"
                        )}
                        onClick={handleBookmark}
                        disabled={isPending}
                    >
                        <span className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                            <Bookmark className={cn("h-4 w-4", bookmarked && "fill-current")} />
                        </span>
                    </button>

                    {/* Share */}
                    <button className="flex items-center gap-1.5 group/btn hover:text-primary transition-colors">
                        <span className="p-1.5 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                            <Share className="h-4 w-4" />
                        </span>
                    </button>
                </div>
            </div>
        </article>
    );
}

