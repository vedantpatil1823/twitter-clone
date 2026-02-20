"use client";

import { useEffect, useRef } from "react";

const KEYWORDS = ["cricket", "science"];
const STORAGE_KEY = "keyword_notifications_enabled";

export function KeywordNotifier({ tweets }: { tweets: { id: string; content: string; author?: { name?: string | null } }[] }) {
    const notifiedIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        const enabled = localStorage.getItem(STORAGE_KEY) === "true";
        if (!enabled) return;

        // Request permission if not already granted
        if (Notification.permission === "default") {
            Notification.requestPermission();
            return;
        }

        if (Notification.permission !== "granted") return;

        tweets.forEach((tweet) => {
            if (notifiedIds.current.has(tweet.id)) return;

            const lower = tweet.content.toLowerCase();
            const matchedKeyword = KEYWORDS.find((kw) => lower.includes(kw));

            if (matchedKeyword) {
                notifiedIds.current.add(tweet.id);
                new Notification(`🔔 Trending: "${matchedKeyword}"`, {
                    body: tweet.content.slice(0, 120),
                    icon: "/favicon.ico",
                    tag: tweet.id,
                });
            }
        });
    }, [tweets]);

    return null;
}
