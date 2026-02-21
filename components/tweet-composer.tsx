"use client";

import { useRef, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Smile, X, Loader2 } from "lucide-react";
import { createTweet } from "@/actions/tweet";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";
import { useLanguage } from "@/context/language-context";
import EmojiPicker, { Theme } from "emoji-picker-react";

const MAX_CHARS = 280;

interface TweetComposerProps {
    parentId?: string;
    placeholder?: string;
    onPost?: () => void;
}

export function TweetComposer({ parentId, placeholder, onPost }: TweetComposerProps) {
    const { data: session } = useSession();
    const { t } = useLanguage();
    const router = useRouter();
    const [content, setContent] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);

    // Close emoji picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        if (showEmojiPicker) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showEmojiPicker]);

    const onEmojiClick = (emojiData: { emoji: string }) => {
        const ta = textareaRef.current;
        if (ta) {
            const start = ta.selectionStart ?? content.length;
            const end = ta.selectionEnd ?? content.length;
            const newContent = content.slice(0, start) + emojiData.emoji + content.slice(end);
            setContent(newContent);
            // Refocus and set cursor after emoji
            setTimeout(() => {
                ta.focus();
                const pos = start + emojiData.emoji.length;
                ta.setSelectionRange(pos, pos);
            }, 0);
        } else {
            setContent((prev) => prev + emojiData.emoji);
        }
    };

    const charsLeft = MAX_CHARS - content.length;
    const isOverLimit = charsLeft < 0;
    const isEmpty = content.trim().length === 0 && !imageUrl;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        // Auto-resize
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            ta.style.height = `${ta.scrollHeight}px`;
        }
    };

    const handleSubmit = () => {
        if (isEmpty || isOverLimit || isPending || isUploading) return;

        startTransition(async () => {
            const formData = new FormData();
            formData.append("content", content.trim());
            if (imageUrl) formData.append("image", imageUrl);
            if (parentId) formData.append("parentId", parentId);

            const result = await createTweet(formData);
            if (!result.error) {
                setContent("");
                setImageUrl("");
                if (textareaRef.current) textareaRef.current.style.height = "auto";
                router.refresh();
                onPost?.();
            }
        });
    };

    const progressPercent = Math.min((content.length / MAX_CHARS) * 100, 100);
    const progressColor = isOverLimit
        ? "#ef4444"
        : charsLeft <= 20
            ? "#f59e0b"
            : "hsl(var(--primary))";

    return (
        <div className="flex gap-3">
            <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
                    {(session?.user?.name ?? session?.user?.email ?? "U")[0]?.toUpperCase()}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    placeholder={placeholder ?? t("tweetPlaceholder" as never)}
                    className="w-full bg-transparent resize-none outline-none text-lg placeholder:text-muted-foreground min-h-[60px] leading-relaxed"
                    rows={1}
                />

                {/* Uploaded Image Preview */}
                {imageUrl && (
                    <div className="relative mt-2 rounded-xl overflow-hidden border border-border">
                        <img src={imageUrl} alt="Attachment" className="w-full max-h-[300px] object-cover" />
                        <button
                            onClick={() => setImageUrl("")}
                            className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-between mt-3 border-t border-border pt-3">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 text-primary">
                        {/* Upload Image button — opens file picker directly */}
                        <div className="relative">
                            {isUploading ? (
                                <div className="p-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            ) : (
                                <UploadButton
                                    endpoint="imageUploader"
                                    onUploadBegin={() => setIsUploading(true)}
                                    onClientUploadComplete={(res) => {
                                        setIsUploading(false);
                                        if (res?.[0]) {
                                            setImageUrl(res[0].url);
                                        }
                                    }}
                                    onUploadError={(error: Error) => {
                                        setIsUploading(false);
                                        alert(`Upload failed: ${error.message}`);
                                    }}
                                    appearance={{
                                        button: "p-2 rounded-full hover:bg-primary/10 transition-colors bg-transparent border-none shadow-none w-9 h-9 ut-uploading:cursor-not-allowed",
                                        allowedContent: "hidden",
                                        container: "flex-row",
                                    }}
                                    content={{
                                        button() {
                                            return <ImageIcon className="h-5 w-5 text-primary" />;
                                        },
                                    }}
                                />
                            )}
                        </div>
                        <div className="relative" ref={emojiPickerRef}>
                            <button
                                type="button"
                                className="p-2 rounded-full hover:bg-primary/10 transition-colors"
                                title="Add emoji"
                                onClick={() => setShowEmojiPicker((v) => !v)}
                            >
                                <Smile className="h-5 w-5" />
                            </button>
                            {showEmojiPicker && (
                                <div className="absolute left-0 bottom-10 z-50 shadow-xl rounded-xl overflow-hidden">
                                    <EmojiPicker
                                        onEmojiClick={onEmojiClick}
                                        theme={Theme.AUTO}
                                        width={320}
                                        height={400}
                                        searchPlaceHolder="Search emoji..."
                                        lazyLoadEmojis
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right side: progress + post */}
                    <div className="flex items-center gap-3">
                        {content.length > 0 && (
                            <>
                                {/* Circular progress */}
                                <div className="relative w-8 h-8">
                                    <svg className="rotate-[-90deg]" viewBox="0 0 32 32" width="32" height="32">
                                        <circle cx="16" cy="16" r="13" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                                        <circle
                                            cx="16" cy="16" r="13" fill="none"
                                            stroke={progressColor}
                                            strokeWidth="2.5"
                                            strokeDasharray={`${2 * Math.PI * 13}`}
                                            strokeDashoffset={`${2 * Math.PI * 13 * (1 - progressPercent / 100)}`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    {charsLeft <= 20 && (
                                        <span
                                            className={cn(
                                                "absolute inset-0 flex items-center justify-center text-[10px] font-bold",
                                                isOverLimit ? "text-red-500" : "text-amber-500"
                                            )}
                                        >
                                            {charsLeft}
                                        </span>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="w-px h-6 bg-border" />
                            </>
                        )}

                        <Button
                            size="sm"
                            className="rounded-full font-bold px-5"
                            disabled={isEmpty || isOverLimit || isPending || isUploading}
                            onClick={handleSubmit}
                        >
                            {isPending ? t("posting" as never) : parentId ? t("replying" as never) : t("post" as never)}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
