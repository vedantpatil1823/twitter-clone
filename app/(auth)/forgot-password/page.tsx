"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Eye, EyeOff, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, step: "send-otp" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep("otp");
            toast.success("OTP sent to your email!");
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) return;
        setLoading(true);
        try {
            const res = await fetch("/api/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, step: "verify-otp", code: otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setNewPassword(data.newPassword);
            setStep("done");
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(newPassword);
        setCopied(true);
        toast.success("Password copied!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="w-full max-w-sm space-y-6">
                {/* Back link */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                </Link>

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold">Forgot password?</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {step === "email" && "Enter your email and we'll send you a one-time code."}
                        {step === "otp" && `We sent a 6-digit code to ${email}`}
                        {step === "done" && "Your new password is ready. Save it somewhere safe!"}
                    </p>
                </div>

                {/* Step 1 — Email */}
                {step === "email" && (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="rounded-full px-4"
                        />
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full font-bold"
                        >
                            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                            Send OTP
                        </Button>
                    </form>
                )}

                {/* Step 2 — OTP */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <Input
                            type="text"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/, ""))}
                            maxLength={6}
                            className="rounded-full px-4 text-center tracking-widest text-lg"
                        />
                        <Button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="w-full rounded-full font-bold"
                        >
                            {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                            Verify & Reset Password
                        </Button>
                        <button
                            type="button"
                            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => setStep("email")}
                        >
                            Didn't receive it? Try again
                        </button>
                    </form>
                )}

                {/* Step 3 — Done */}
                {step === "done" && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl border border-border bg-muted/30 space-y-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Your new password</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-lg font-mono font-bold text-primary tracking-widest">
                                    {showPassword ? newPassword : "•".repeat(newPassword.length)}
                                </code>
                                <button
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="p-2 rounded-full hover:bg-foreground/10 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={handleCopy}
                                    className="p-2 rounded-full hover:bg-foreground/10 transition-colors"
                                >
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Letters only · 12 characters · Use it to log in, then change it.
                            </p>
                        </div>
                        <Button asChild className="w-full rounded-full font-bold">
                            <Link href="/login">Go to Login</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
