"use client";

import Link from "next/link";
import { Home, Search, Bell, Mail, Bookmark, CreditCard, User } from "lucide-react";
import { useLanguage } from "@/context/language-context";

const NAV_KEYS = [
    { href: "/", icon: Home, key: "home" as const },
    { href: "/explore", icon: Search, key: "explore" as const },
    { href: "/notifications", icon: Bell, key: "notifications" as const },
    { href: "/messages", icon: Mail, key: "messages" as const },
    { href: "/bookmarks", icon: Bookmark, key: "bookmarks" as const },
    { href: "/subscription", icon: CreditCard, key: "subscription" as const },
] as const;

export function SidebarNav({
    unreadCount,
    profileHref,
}: {
    unreadCount: number;
    profileHref: string;
}) {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col gap-1">
            {NAV_KEYS.map(({ href, icon: Icon, key }) => (
                <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-4 p-3 rounded-full hover:bg-foreground/10 transition-colors group w-fit xl:w-full"
                >
                    <div className="relative">
                        <Icon className="h-6 w-6" />
                        {key === "notifications" && unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </div>
                    <span className="hidden xl:block text-lg font-medium group-hover:text-primary transition-colors">
                        {t(key)}
                    </span>
                </Link>
            ))}

            {/* Profile link */}
            <Link
                href={profileHref}
                className="flex items-center gap-4 p-3 rounded-full hover:bg-foreground/10 transition-colors group w-fit xl:w-full"
            >
                <User className="h-6 w-6" />
                <span className="hidden xl:block text-lg font-medium group-hover:text-primary transition-colors">
                    {t("profile")}
                </span>
            </Link>
        </div>
    );
}
