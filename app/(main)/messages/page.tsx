"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Edit, Phone, Video, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/language-context";
import { useSession } from "next-auth/react";

type User = {
    id: string;
    name: string;
    username: string;
    image: string;
};

type Message = {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
};

type Conversation = {
    id: string;
    participants: { user: User }[];
    messages: Message[];
};

export default function MessagesPage() {
    const { data: session } = useSession();
    const currentUserId = session?.user?.id;

    // State
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const { t } = useLanguage();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial load: Fetch conversations
    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await fetch("/api/conversations");
                const data = await res.json();
                if (data.conversations) {
                    setConversations(data.conversations);
                }
            } catch (err) {
                console.error("Failed to fetch conversations", err);
            }
        };
        fetchConversations();
    }, []);

    // Search users effect
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const delayDebounceTimeout = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data.users) {
                    setSearchResults(data.users);
                }
            } catch (err) {
                console.error("Failed to search users", err);
            } finally {
                setIsSearching(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceTimeout);
    }, [searchQuery]);

    // Poll current conversation messages
    useEffect(() => {
        if (!selectedConv) return;

        let isMounted = true;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/messages/${selectedConv.id}`);
                const data = await res.json();
                if (data.messages && isMounted) {
                    setMessages(data.messages);
                }
            } catch (err) {
                console.error("Failed to fetch messages", err);
            }
        };

        fetchMessages();

        // Polling every 3 seconds
        const interval = setInterval(fetchMessages, 3000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [selectedConv]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSelectConversation = (conv: Conversation) => {
        setSelectedConv(conv);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleStartConversation = async (user: User) => {
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id })
            });
            const data = await res.json();
            if (data.conversation) {
                // If it's a new conversation, add it to list if not there
                setConversations(prev => {
                    const exists = prev.find(c => c.id === data.conversation.id);
                    if (exists) return prev;
                    return [data.conversation, ...prev];
                });
                handleSelectConversation(data.conversation);
            }
        } catch (err) {
            console.error("Failed to start conversation", err);
        }
    };

    const sendMessage = async () => {
        if (!messageInput.trim() || !selectedConv) return;

        const optimisticMsg: Message = {
            id: Date.now().toString(),
            content: messageInput.trim(),
            senderId: currentUserId!,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);
        setMessageInput("");

        try {
            const res = await fetch(`/api/messages/${selectedConv.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: optimisticMsg.content })
            });
            const data = await res.json();

            // Optionally update message ID with real one from db
            if (data.message) {
                setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, id: data.message.id, createdAt: data.message.createdAt } : m));

                // Update the conversation list with the new last message
                setConversations(prev => prev.map(c => {
                    if (c.id === selectedConv.id) {
                        return {
                            ...c,
                            messages: [data.message]
                        };
                    }
                    return c;
                }));
            }
        } catch (err) {
            console.error("Failed to send message", err);
            // Optionally rollback optimistic message on error
        }
    };

    // Helper to get the other user in a conversation
    const getOtherUser = (conv: Conversation) => {
        return conv.participants.find(p => p.user.id !== currentUserId)?.user;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex h-screen">
            {/* Conversation List */}
            <div className="w-full md:w-[360px] border-r border-border flex flex-col shrink-0">
                <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="font-bold text-xl">{t("messages" as never)}</h1>
                        <Button variant="ghost" size="icon" className="rounded-full">
                            <Edit className="h-5 w-5" />
                        </Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder={t("searchPeople" as never) || "Search people..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 rounded-full bg-muted border-transparent"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1">
                    {searchQuery.trim() ? (
                        <div className="py-2">
                            <div className="px-4 py-2 text-sm font-bold text-muted-foreground">Search Results</div>
                            {isSearching && <div className="px-4 text-sm text-muted-foreground">Searching...</div>}
                            {!isSearching && searchResults.length === 0 && <div className="px-4 text-sm text-muted-foreground">No users found</div>}
                            {searchResults.map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => handleStartConversation(user)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors text-left"
                                >
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={user.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`} />
                                        <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        conversations.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                                <h3 className="font-bold text-foreground mb-2">Welcome to your inbox!</h3>
                                <p className="text-sm">Drop a line, share Tweets and more with private conversations between you and others on Twitter.</p>
                            </div>
                        ) : (
                            conversations.map((conv) => {
                                const otherUser = getOtherUser(conv);
                                if (!otherUser) return null;
                                const lastMessage = conv.messages?.[0];

                                return (
                                    <button
                                        key={conv.id}
                                        onClick={() => handleSelectConversation(conv)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors text-left",
                                            selectedConv?.id === conv.id && "bg-foreground/5"
                                        )}
                                    >
                                        <div className="relative shrink-0">
                                            <Avatar className="h-12 w-12">
                                                <AvatarImage src={otherUser.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${otherUser.username}`} />
                                                <AvatarFallback>{otherUser.name?.[0] || 'U'}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm truncate">{otherUser.name}</span>
                                                {lastMessage && (
                                                    <span className="text-xs text-muted-foreground shrink-0">{formatTime(lastMessage.createdAt)}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground truncate">
                                                {lastMessage ? lastMessage.content : "Start a conversation..."}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })
                        )
                    )}
                </div>
            </div>

            {/* Chat Window */}
            <div className={cn("flex-1 flex flex-col min-w-0 bg-background", !selectedConv && "hidden md:flex items-center justify-center")}>
                {!selectedConv ? (
                    <div className="text-center w-full max-w-sm px-4">
                        <h2 className="text-3xl font-bold mb-2">Select a message</h2>
                        <p className="text-muted-foreground mb-6">Choose from your existing conversations, start a new one, or just keep swimming.</p>
                        <Button size="lg" className="rounded-full w-full font-bold">New message</Button>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                {getOtherUser(selectedConv) && (
                                    <>
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={getOtherUser(selectedConv)?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${getOtherUser(selectedConv)?.username}`} />
                                            <AvatarFallback>{getOtherUser(selectedConv)?.name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">{getOtherUser(selectedConv)?.name}</p>
                                            <p className="text-xs text-muted-foreground">@{getOtherUser(selectedConv)?.username}</p>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="rounded-full"><Phone className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="rounded-full"><Video className="h-5 w-5" /></Button>
                                <Button variant="ghost" size="icon" className="rounded-full"><Info className="h-5 w-5" /></Button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                            <div className="py-6 flex flex-col items-center justify-center border-b border-border mb-4">
                                {getOtherUser(selectedConv) && (
                                    <>
                                        <Avatar className="h-16 w-16 mb-2">
                                            <AvatarImage src={getOtherUser(selectedConv)?.image || `https://api.dicebear.com/7.x/identicon/svg?seed=${getOtherUser(selectedConv)?.username}`} />
                                            <AvatarFallback>{getOtherUser(selectedConv)?.name?.[0] || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <h3 className="font-bold text-lg">{getOtherUser(selectedConv)?.name}</h3>
                                        <p className="text-muted-foreground">@{getOtherUser(selectedConv)?.username}</p>
                                    </>
                                )}
                            </div>

                            {messages.map((msg) => {
                                const isMe = msg.senderId === currentUserId;
                                return (
                                    <div
                                        key={msg.id}
                                        className={cn("flex", isMe ? "justify-end" : "justify-start")}
                                    >
                                        <div
                                            className={cn(
                                                "max-w-[70%] px-4 py-2 text-sm",
                                                isMe
                                                    ? "bg-primary text-primary-foreground rounded-t-2xl rounded-bl-2xl rounded-br-sm"
                                                    : "bg-muted text-foreground rounded-t-2xl rounded-br-2xl rounded-bl-sm"
                                            )}
                                        >
                                            <p>{msg.content}</p>
                                            <p className={cn("text-[10px] mt-1 text-right", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                                                {formatTime(msg.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="border-t border-border p-4 w-full">
                            <div className="flex items-center gap-3 bg-muted rounded-2xl px-4 py-2">
                                <Input
                                    placeholder={t("typeMessage" as never) || "Start a new message"}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    className="bg-transparent border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0 shadow-none h-10 w-full"
                                />
                                <Button
                                    onClick={sendMessage}
                                    disabled={!messageInput.trim()}
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full text-primary font-bold shrink-0 hover:bg-primary/10 hover:text-primary"
                                >
                                    Send
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
