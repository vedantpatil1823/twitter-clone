"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Sparkles } from "lucide-react";

interface LiveFeedBannerProps {
    /** ISO timestamp of the newest tweet at initial page load */
    latestTweetAt: string;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function LiveFeedBanner({ latestTweetAt }: LiveFeedBannerProps) {
    const [newCount, setNewCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const afterRef = useRef(latestTweetAt);
    const router = useRouter();

    const checkForNew = useCallback(async () => {
        try {
            const res = await fetch(
                `/api/tweets/latest?after=${encodeURIComponent(afterRef.current)}`,
                { cache: "no-store" }
            );
            if (!res.ok) return;
            const data = await res.json();
            if (data.count > 0) {
                setNewCount(data.count);
            }
        } catch {
            // Silently ignore network errors
        }
    }, []);

    useEffect(() => {
        // Start polling
        const interval = setInterval(checkForNew, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [checkForNew]);

    const handleRefresh = async () => {
        setIsLoading(true);
        // Update the "after" anchor to now so we don't re-show stale count
        afterRef.current = new Date().toISOString();
        setNewCount(0);
        router.refresh();
        // Small delay to let server re-render
        setTimeout(() => setIsLoading(false), 800);
    };

    if (newCount === 0) return null;

    return (
        <div className="flex justify-center px-4 py-2 sticky top-[105px] z-20 pointer-events-none">
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="
                    pointer-events-auto
                    flex items-center gap-2 
                    bg-primary text-primary-foreground 
                    px-5 py-2.5 rounded-full 
                    text-sm font-bold 
                    shadow-lg shadow-primary/30
                    hover:bg-primary/90 
                    active:scale-95
                    transition-all duration-200
                    animate-in slide-in-from-top-4 fade-in
                "
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
                        Loading...
                    </span>
                ) : (
                    <>
                        <ArrowUp className="h-4 w-4" />
                        {newCount === 1
                            ? "1 new post"
                            : `${newCount} new posts`}
                        <Sparkles className="h-3.5 w-3.5 opacity-70" />
                    </>
                )}
            </button>
        </div>
    );
}
