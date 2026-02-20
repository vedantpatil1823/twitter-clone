"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Upload, X, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing";
import { createAudioTweet } from "@/actions/tweet";

// ==== helpers ====
const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_DURATION_SEC = 5 * 60; // 5 minutes

function isWithinAllowedTime(): boolean {
    // 2 PM – 7 PM IST  →  08:30 – 13:30 UTC
    const now = new Date();
    const istOffset = 5.5 * 60; // minutes
    const istMs = now.getTime() + istOffset * 60 * 1000;
    const ist = new Date(istMs);
    const h = ist.getUTCHours();
    const m = ist.getUTCMinutes();
    const totalMins = h * 60 + m;
    return totalMins >= 14 * 60 && totalMins < 19 * 60; // 14:00–19:00 IST
}

type Step = "idle" | "otp-sent" | "otp-verified" | "uploading" | "done";

export function AudioTweetComposer() {
    const [step, setStep] = useState<Step>("idle");
    const [content, setContent] = useState("");
    const [otp, setOtp] = useState("");
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [posting, setPosting] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { startUpload } = useUploadThing("audioUploader");

    // ── Recording ──
    const startRecording = async () => {
        if (!isWithinAllowedTime()) {
            toast.error("Audio tweets can only be posted between 2:00 PM – 7:00 PM IST.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                processAudioBlob(blob, "recording.webm");
                stream.getTracks().forEach((t) => t.stop());
            };
            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);

            // Auto-stop at 5 minutes
            setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, MAX_DURATION_SEC * 1000);
        } catch {
            toast.error("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };

    // ── File upload ──
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!isWithinAllowedTime()) {
            toast.error("Audio tweets can only be posted between 2:00 PM – 7:00 PM IST.");
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;
        processAudioBlob(file, file.name);
    };

    const processAudioBlob = (blob: Blob, name: string) => {
        if (blob.size > MAX_SIZE_BYTES) {
            toast.error("Audio file must be under 100 MB.");
            return;
        }
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
            if (audio.duration > MAX_DURATION_SEC) {
                toast.error("Audio must be 5 minutes or shorter.");
                URL.revokeObjectURL(url);
                return;
            }
            setAudioFile(new File([blob], name, { type: blob.type }));
            setAudioSrc(url);
        };
    };

    const clearAudio = () => {
        if (audioSrc) URL.revokeObjectURL(audioSrc);
        setAudioFile(null);
        setAudioSrc(null);
    };

    // ── OTP ──
    const sendOtp = async () => {
        if (!isWithinAllowedTime()) {
            toast.error("Audio tweets can only be posted between 2:00 PM – 7:00 PM IST.");
            return;
        }
        if (!audioFile) { toast.error("Please record or upload audio first."); return; }
        setSendingOtp(true);
        try {
            const res = await fetch("/api/otp/send", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep("otp-sent");
            toast.success("OTP sent to your email!");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to send OTP.");
        } finally {
            setSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        setVerifyingOtp(true);
        try {
            const res = await fetch("/api/otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep("otp-verified");
            toast.success("OTP verified! You can now post your audio tweet.");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Invalid OTP.");
        } finally {
            setVerifyingOtp(false);
        }
    };

    // ── Post ──
    const handlePost = async () => {
        if (!audioFile || !content.trim()) {
            toast.error("Please add audio and a caption.");
            return;
        }
        setPosting(true);
        setStep("uploading");
        try {
            const uploaded = await startUpload([audioFile]);
            if (!uploaded?.[0]?.url) throw new Error("Upload failed.");
            await createAudioTweet(content.trim(), uploaded[0].url);
            setStep("done");
            toast.success("Audio tweet posted!");
            // Reset
            setContent("");
            clearAudio();
            setOtp("");
            setStep("idle");
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to post.");
            setStep("otp-verified");
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="border border-border rounded-2xl p-4 bg-card space-y-4">
            <h3 className="font-bold text-base flex items-center gap-2">
                🎙️ Audio Tweet
                <span className="text-xs font-normal text-muted-foreground">(Available 2 PM – 7 PM IST)</span>
            </h3>

            {/* Caption */}
            <Textarea
                placeholder="Caption for your audio tweet..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={280}
                className="resize-none bg-transparent border-none focus-visible:ring-0 p-0 text-sm"
                rows={2}
            />

            {/* Audio controls */}
            {!audioSrc ? (
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="sm"
                        className="rounded-full gap-2"
                        onClick={isRecording ? stopRecording : startRecording}
                    >
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? "Stop" : "Record"}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload className="h-4 w-4" />
                        Upload
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <audio controls src={audioSrc} className="flex-1 h-8 rounded" />
                    <Button size="icon" variant="ghost" onClick={clearAudio} className="rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* OTP step */}
            {step === "idle" && audioFile && (
                <Button onClick={sendOtp} disabled={sendingOtp} className="w-full rounded-full">
                    {sendingOtp ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                    Send OTP to Email
                </Button>
            )}

            {step === "otp-sent" && (
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="rounded-full"
                    />
                    <Button onClick={verifyOtp} disabled={verifyingOtp || otp.length !== 6} className="rounded-full">
                        {verifyingOtp ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify"}
                    </Button>
                </div>
            )}

            {step === "otp-verified" && (
                <Button onClick={handlePost} disabled={posting} className="w-full rounded-full gap-2">
                    {posting ? (
                        <><Loader2 className="animate-spin h-4 w-4" /> Uploading...</>
                    ) : (
                        <><Send className="h-4 w-4" /> Post Audio Tweet</>
                    )}
                </Button>
            )}

            {step === "uploading" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="animate-spin h-4 w-4" /> Uploading audio...
                </div>
            )}

            {step === "done" && (
                <div className="flex items-center gap-2 text-sm text-green-500">
                    <CheckCircle className="h-4 w-4" /> Audio tweet posted!
                </div>
            )}
        </div>
    );
}
