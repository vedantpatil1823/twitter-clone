"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ExploreSearch({ initialQuery }: { initialQuery: string }) {
    const [query, setQuery] = useState(initialQuery);
    const router = useRouter();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
        } else {
            router.push("/explore");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search posts and people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-10 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
            />
            {query && (
                <button
                    type="button"
                    onClick={() => { setQuery(""); router.push("/explore"); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </form>
    );
}
