import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Heart, Repeat2, UserPlus, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { markNotificationsRead } from "@/actions/user";
import { cn } from "@/lib/utils";
import { T } from "@/components/translated-text";

const notifIcons: Record<string, { icon: React.ElementType; color: string }> = {
    LIKE: { icon: Heart, color: "text-pink-500" },
    RETWEET: { icon: Repeat2, color: "text-green-500" },
    FOLLOW: { icon: UserPlus, color: "text-primary" },
    REPLY: { icon: MessageCircle, color: "text-primary" },
    MENTION: { icon: Bell, color: "text-primary" },
};

export default async function NotificationsPage() {
    const session = await auth();
    if (!session?.user?.id) return null;

    const notifications = await prisma.notification.findMany({
        where: { recipientId: session.user.id },
        include: {
            sender: {
                select: { id: true, name: true, username: true, image: true, verified: true },
            },
            tweet: { select: { id: true, content: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    // Mark all as read after fetching
    if (unreadCount > 0) {
        await markNotificationsRead();
    }

    function getNotifText(type: string, senderName: string) {
        switch (type) {
            case "LIKE": return `${senderName} liked your post`;
            case "RETWEET": return `${senderName} reposted your post`;
            case "FOLLOW": return `${senderName} followed you`;
            case "REPLY": return `${senderName} replied to your post`;
            case "MENTION": return `${senderName} mentioned you`;
            default: return `${senderName} interacted with you`;
        }
    }

    return (
        <div>
            <div className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border px-4 py-3">
                <h1 className="text-xl font-bold"><T k="notifications" /></h1>
            </div>

            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Bell className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2"><T k="noNotifications" /></h3>
                    <p className="text-muted-foreground max-w-xs">
                        <T k="noNotificationsDesc" />
                    </p>
                </div>
            ) : (
                notifications.map((notif) => {
                    const config = notifIcons[notif.type] ?? notifIcons.LIKE;
                    const Icon = config.icon;

                    return (
                        <Link
                            key={notif.id}
                            href={notif.tweet ? `/tweet/${notif.tweet.id}` : `/profile/${notif.sender.username}`}
                            className={cn(
                                "flex gap-4 px-4 py-3 border-b border-border hover:bg-foreground/[0.03] transition-colors",
                                !notif.read && "bg-primary/5"
                            )}
                        >
                            <div className="flex flex-col items-center mt-1">
                                <Icon className={cn("h-5 w-5", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={notif.sender.image ?? undefined} />
                                        <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                                            {((notif.sender.name ?? notif.sender.username ?? "U")[0] ?? "U").toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <p className="text-sm">
                                    {getNotifText(notif.type, notif.sender.name ?? notif.sender.username ?? "Someone")}
                                </p>
                                {notif.tweet && (
                                    <p className="text-sm text-muted-foreground truncate mt-1">
                                        {notif.tweet.content}
                                    </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                            {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                            )}
                        </Link>
                    );
                })
            )}
        </div>
    );
}
