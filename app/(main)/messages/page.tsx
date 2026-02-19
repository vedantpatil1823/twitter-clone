"use client";

import { useState } from "react";
import { Search, Edit, Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const conversations = [
    {
        id: "1",
        user: { name: "Next.js", handle: "@nextjs", avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=nextjs" },
        lastMessage: "Thanks for the feedback! We'll look into it.",
        time: "2m",
        unread: 2,
        online: true,
    },
    {
        id: "2",
        user: { name: "Vercel", handle: "@vercel", avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=vercel" },
        lastMessage: "Your deployment is live! 🚀",
        time: "1h",
        unread: 0,
        online: true,
    },
    {
        id: "3",
        user: { name: "shadcn", handle: "@shadcn", avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=shadcn" },
        lastMessage: "Check out the new components we just added",
        time: "3h",
        unread: 1,
        online: false,
    },
    {
        id: "4",
        user: { name: "Tailwind CSS", handle: "@tailwindcss", avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=tailwind" },
        lastMessage: "v4 is going to change everything!",
        time: "1d",
        unread: 0,
        online: false,
    },
];

const chatMessages = [
    { id: "1", from: "them", text: "Hey! Love your Twitter clone project 🔥", time: "10:30 AM" },
    { id: "2", from: "me", text: "Thanks! Built it with Next.js 16 and Tailwind v4", time: "10:31 AM" },
    { id: "3", from: "them", text: "That's awesome! The UI looks really clean", time: "10:32 AM" },
    { id: "4", from: "me", text: "Appreciate it! Shadcn UI components made it much easier", time: "10:33 AM" },
    { id: "5", from: "them", text: "Thanks for the feedback! We'll look into it.", time: "10:35 AM" },
];

export default function MessagesPage() {
    const [selectedConv, setSelectedConv] = useState(conversations[0]);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState(chatMessages);

    const sendMessage = () => {
        if (!message.trim()) return;
        setMessages((prev) => [
            ...prev,
            { id: Date.now().toString(), from: "me", text: message.trim(), time: "now" },
        ]);
        setMessage("");
    };

    return (
        <div className="flex h-screen">
            {/* Conversation List */}
            <div className="w-full md:w-[360px] border-r border-border flex flex-col shrink-0">
                <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="font-bold text-xl">Messages</h1>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Edit className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Direct Messages"
                            className="pl-10 rounded-full bg-muted border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedConv(conv)}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors text-left",
                                selectedConv.id === conv.id && "bg-foreground/5"
                            )}
                        >
                            <div className="relative shrink-0">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={conv.user.avatar} />
                                    <AvatarFallback>{conv.user.name[0]}</AvatarFallback>
                                </Avatar>
                                {conv.online && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-sm truncate">{conv.user.name}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{conv.time}</span>
                                </div>
                                <p className={cn("text-sm truncate", conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>
                                    {conv.lastMessage}
                                </p>
                            </div>
                            {conv.unread > 0 && (
                                <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold">
                                    {conv.unread}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Window */}
            <div className="hidden md:flex flex-col flex-1 min-w-0">
                {/* Chat Header */}
                <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={selectedConv.user.avatar} />
                            <AvatarFallback>{selectedConv.user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-sm">{selectedConv.user.name}</p>
                            <p className="text-xs text-muted-foreground">{selectedConv.user.handle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full"><Phone className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full"><Video className="h-5 w-5" /></Button>
                        <Button variant="ghost" size="icon" className="rounded-full"><Info className="h-5 w-5" /></Button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn("flex", msg.from === "me" ? "justify-end" : "justify-start")}
                        >
                            <div
                                className={cn(
                                    "max-w-[70%] rounded-2xl px-4 py-2 text-sm",
                                    msg.from === "me"
                                        ? "bg-primary text-primary-foreground rounded-br-sm"
                                        : "bg-muted text-foreground rounded-bl-sm"
                                )}
                            >
                                <p>{msg.text}</p>
                                <p className={cn("text-xs mt-1", msg.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                    {msg.time}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Message Input */}
                <div className="border-t border-border p-4 flex items-center gap-3">
                    <Input
                        placeholder="Start a new message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        className="rounded-full bg-muted border-transparent focus:border-primary"
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!message.trim()}
                        className="rounded-full shrink-0"
                    >
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
}
