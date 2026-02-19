"use client";

import { useState, useTransition } from "react";
import { followUser } from "@/actions/user";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
    targetUserId: string;
    isFollowing: boolean;
    className?: string;
}

export function FollowButton({ targetUserId, isFollowing, className }: FollowButtonProps) {
    const [following, setFollowing] = useState(isFollowing);
    const [isPending, startTransition] = useTransition();
    const [hovered, setHovered] = useState(false);

    const handleFollow = () => {
        const prev = following;
        setFollowing(!prev);
        startTransition(async () => {
            const result = await followUser(targetUserId);
            if (result?.error) setFollowing(prev);
        });
    };

    if (following) {
        return (
            <Button
                size="sm"
                variant="outline"
                className={cn(
                    "rounded-full font-semibold min-w-[100px] transition-all",
                    hovered && "border-red-500 text-red-500 hover:bg-red-500/10",
                    className
                )}
                onClick={handleFollow}
                disabled={isPending}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : hovered ? (
                    "Unfollow"
                ) : (
                    "Following"
                )}
            </Button>
        );
    }

    return (
        <Button
            size="sm"
            className={cn("rounded-full font-semibold min-w-[100px]", className)}
            onClick={handleFollow}
            disabled={isPending}
        >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Follow"}
        </Button>
    );
}
