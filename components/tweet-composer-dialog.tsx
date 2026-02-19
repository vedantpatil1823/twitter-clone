"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";
import { TweetComposer } from "@/components/tweet-composer";

interface TweetComposerDialogProps {
    children: React.ReactNode;
}

export function TweetComposerDialog({ children }: TweetComposerDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="contents">{children}</div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 top-[10%] translate-y-0">
                <div className="flex items-center gap-4 px-4 pt-3 pb-1">
                    <button
                        onClick={() => setOpen(false)}
                        className="p-2 rounded-full hover:bg-foreground/10 transition-colors"
                    >
                        <span className="text-xl">✕</span>
                    </button>
                    <button className="text-primary font-bold hover:underline text-sm">
                        Drafts
                    </button>
                </div>
                <div className="px-4 pb-4">
                    <TweetComposer onPost={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}
