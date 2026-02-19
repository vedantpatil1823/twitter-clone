"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Bell, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/explore", icon: Search, label: "Explore" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
    { href: "/messages", icon: Mail, label: "Messages" },
    { href: "/profile", icon: User, label: "Profile" },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-background/95 backdrop-blur-sm py-2 lg:hidden">
            {mobileNavItems.map(({ href, icon: Icon, label }) => {
                const isActive = pathname === href;
                return (
                    <Link
                        key={href}
                        href={href}
                        className="flex flex-col items-center gap-0.5 p-2 rounded-full"
                        aria-label={label}
                    >
                        <Icon
                            className={cn(
                                "h-6 w-6",
                                isActive ? "text-foreground" : "text-muted-foreground"
                            )}
                            strokeWidth={isActive ? 2.5 : 2}
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
