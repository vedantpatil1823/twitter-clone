import { auth } from "@/auth";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
    MoreHorizontal,
    Feather,
    LogOut,
    Settings,
    User,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TweetComposerDialog } from "@/components/tweet-composer-dialog";
import { SidebarNav } from "@/components/sidebar-nav";
import { T } from "@/components/translated-text";



export default async function LeftSidebar() {
    const session = await auth();
    const user = session?.user;

    // Fetch unread notification count
    const unreadCount = user?.id
        ? await prisma.notification.count({
            where: { recipientId: user.id, read: false },
        })
        : 0;

    return (
        <aside className="flex flex-col h-screen sticky top-0 py-2 px-3 xl:px-6 justify-between">
            {/* Top section */}
            <div className="flex flex-col gap-1">
                {/* Logo */}
                <Link href="/" className="p-3 rounded-full hover:bg-foreground/10 transition-colors w-fit mb-1">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-foreground" aria-label="X">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.905-5.635Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                </Link>

                {/* Nav links + Profile */}
                <SidebarNav
                    unreadCount={unreadCount}
                    profileHref={`/profile/${session?.user?.username ?? "me"}`}
                />

                {/* Post button */}
                <TweetComposerDialog>
                    <Button className="mt-4 rounded-full font-bold xl:w-full" size="lg">
                        <Feather className="h-5 w-5 xl:hidden" />
                        <span className="hidden xl:block"><T k="post" /></span>
                    </Button>
                </TweetComposerDialog>
            </div>

            {/* Bottom: User profile */}
            {user ? (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 p-3 rounded-full hover:bg-foreground/10 transition-colors w-full text-left">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                                <AvatarImage src={user.image ?? undefined} />
                                <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                                    {(user.name ?? user.email ?? "U")[0].toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden xl:block flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{user.name}</p>
                                <p className="text-muted-foreground text-xs truncate">@{session?.user?.username}</p>
                            </div>
                            <MoreHorizontal className="hidden xl:block h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href={`/profile/${session?.user?.username}`}>
                                <User className="h-4 w-4 mr-2" />
                                <T k="viewProfile" />
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings/profile">
                                <Settings className="h-4 w-4 mr-2" />
                                <T k="settings" />
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <form
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/login" });
                                }}
                            >
                                <button type="submit" className="flex items-center w-full text-red-500">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    <T k="signOut" /> @{session?.user?.username}
                                </button>
                            </form>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Link href="/login">
                    <Button className="rounded-full w-full font-bold"><T k="signIn" /></Button>
                </Link>
            )}
        </aside>
    );
}
