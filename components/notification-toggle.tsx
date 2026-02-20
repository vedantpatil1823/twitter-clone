"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STORAGE_KEY = "keyword_notifications_enabled";

export function NotificationToggle() {
    const [enabled, setEnabled] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");

    useEffect(() => {
        setEnabled(localStorage.getItem(STORAGE_KEY) === "true");
        setPermission(Notification.permission);
    }, []);

    const handleToggle = async () => {
        if (!enabled) {
            // Turning ON — request permission first
            if (Notification.permission === "denied") {
                toast.error("Notifications are blocked. Please allow them in your browser settings.");
                return;
            }
            if (Notification.permission === "default") {
                const result = await Notification.requestPermission();
                setPermission(result);
                if (result !== "granted") {
                    toast.error("Notification permission denied.");
                    return;
                }
            }
            localStorage.setItem(STORAGE_KEY, "true");
            setEnabled(true);
            toast.success("Keyword notifications enabled! You'll be notified for 'cricket' and 'science' tweets.");
        } else {
            // Turning OFF
            localStorage.setItem(STORAGE_KEY, "false");
            setEnabled(false);
            toast.success("Keyword notifications disabled.");
        }
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
                {enabled ? (
                    <Bell className="h-5 w-5 text-primary" />
                ) : (
                    <BellOff className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                    <p className="text-sm font-semibold">Keyword Notifications</p>
                    <p className="text-xs text-muted-foreground">
                        Get notified for tweets containing &quot;cricket&quot; or &quot;science&quot;
                    </p>
                </div>
            </div>
            <Button
                variant={enabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggle}
                className="rounded-full text-xs"
            >
                {enabled ? "Enabled" : "Enable"}
            </Button>
        </div>
    );
}
