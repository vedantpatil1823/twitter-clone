"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Tablet, Globe, Shield, Clock } from "lucide-react";
import { format } from "date-fns";

interface LoginEntry {
    id: string;
    browser: string;
    os: string;
    deviceType: string;
    ipAddress: string;
    createdAt: string;
}

function DeviceIcon({ type }: { type: string }) {
    switch (type) {
        case "mobile":
            return <Smartphone className="h-4 w-4 text-blue-400" />;
        case "tablet":
            return <Tablet className="h-4 w-4 text-purple-400" />;
        default:
            return <Monitor className="h-4 w-4 text-green-400" />;
    }
}

function BrowserIcon({ browser }: { browser: string }) {
    // Use Globe as a generic icon; could be enhanced with specific icons
    const colorMap: Record<string, string> = {
        Chrome: "text-yellow-400",
        Edge: "text-blue-500",
        Firefox: "text-orange-400",
        Safari: "text-sky-300",
        Opera: "text-red-400",
    };
    return <Globe className={`h-4 w-4 ${colorMap[browser] ?? "text-muted-foreground"}`} />;
}

export function LoginHistoryTable() {
    const [history, setHistory] = useState<LoginEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/login-history")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) setHistory(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center py-16 text-center px-4">
                <Shield className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-xl font-bold mb-2">No login history</h3>
                <p className="text-muted-foreground">Your login sessions will appear here.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border">
            {/* Header */}
            <div className="px-4 py-3 bg-muted/30">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Login History</h3>
                    <span className="text-xs text-muted-foreground">({history.length} sessions)</span>
                </div>
            </div>

            {/* Entries */}
            {history.map((entry) => (
                <div
                    key={entry.id}
                    className="px-4 py-3 hover:bg-foreground/[0.02] transition-colors"
                >
                    <div className="flex items-start gap-3">
                        {/* Device icon */}
                        <div className="mt-0.5 p-2 rounded-lg bg-muted/50">
                            <DeviceIcon type={entry.deviceType} />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <BrowserIcon browser={entry.browser} />
                                <span className="font-semibold text-sm">{entry.browser}</span>
                                <span className="text-muted-foreground text-xs">on</span>
                                <span className="text-sm">{entry.os}</span>
                                <span className="text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">
                                    {entry.deviceType}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(entry.createdAt), "PPpp")}
                                </span>
                                <span className="font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                                    IP: {entry.ipAddress}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
