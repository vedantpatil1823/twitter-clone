"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, X, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { toast } from "sonner";

// ── Client-side UA helpers ──────────────────────────────────────────
function detectBrowserInfo() {
    const ua = navigator.userAgent;

    let browser = "Other";
    if (/Edg\//i.test(ua)) browser = "Edge";
    else if (/OPR|Opera/i.test(ua)) browser = "Opera";
    else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/MSIE|Trident/i.test(ua)) browser = "Internet Explorer";

    const isMobile = /Mobi|Android.*Mobile|iPhone|iPod/i.test(ua);
    const isMicrosoft = browser === "Edge" || browser === "Internet Explorer";
    const isChrome = browser === "Chrome" && !isMobile;

    return { browser, isMobile, isMicrosoft, isChrome, ua };
}

function isWithinMobileLoginWindow(): boolean {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const istDate = new Date(utcMs + istOffsetMs);
    const hours = istDate.getHours();
    return hours >= 10 && hours < 13;
}

// ── OTP Modal ───────────────────────────────────────────────────────
function LoginOtpModal({
    email,
    onVerified,
    onCancel,
}: {
    email: string;
    onVerified: () => void;
    onCancel: () => void;
}) {
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const sendOtp = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/login-otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSent(true);
            if (data.demoOtp) {
                toast.success(`OTP for verification: ${data.demoOtp}`, { duration: 15000 });
            } else {
                toast.success("OTP sent to your email!");
            }
        } catch (err: unknown) {
            toast.error((err as Error).message || "Failed to send OTP");
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/login-otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success("Identity verified!");
            onVerified();
        } catch (err: unknown) {
            toast.error((err as Error).message || "Invalid OTP");
        } finally {
            setLoading(false);
        }
    };

    // Auto-send OTP on mount
    useState(() => {
        sendOtp();
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h2 className="font-bold text-base">Chrome Security Check</h2>
                    </div>
                    <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-sm text-muted-foreground">
                        <p>You&apos;re logging in from <strong className="text-foreground">Google Chrome</strong>. We&apos;ve sent a 6-digit OTP to <strong className="text-foreground">{email}</strong> to verify your identity.</p>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">Enter OTP</label>
                        <Input
                            placeholder="000000"
                            value={otp}
                            maxLength={6}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                            className="text-center tracking-widest text-lg rounded-xl font-mono"
                            disabled={loading}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            disabled={loading}
                            className="flex-1 rounded-full"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={verifyOtp}
                            disabled={loading || otp.length !== 6}
                            className="flex-1 rounded-full font-bold"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                        </Button>
                    </div>

                    {sent && (
                        <button
                            onClick={sendOtp}
                            disabled={loading}
                            className="text-xs text-primary hover:underline w-full text-center"
                        >
                            Resend OTP
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Record login history ────────────────────────────────────────────
async function recordLoginHistory(ua: string) {
    try {
        await fetch("/api/login-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userAgent: ua }),
        });
    } catch {
        console.error("Failed to record login history");
    }
}

// ── Main Login Form ─────────────────────────────────────────────────
function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [isLoading, setIsLoading] = useState<"google" | "credentials" | null>(null);

    // OTP state
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [pendingEmail, setPendingEmail] = useState("");
    const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
    const [pendingFirebaseToken, setPendingFirebaseToken] = useState<string | null>(null);

    // ── Check device restrictions before login ──────────────
    const preLoginCheck = (): { canProceed: boolean; needsOtp: boolean; info: ReturnType<typeof detectBrowserInfo> } => {
        const info = detectBrowserInfo();

        // Mobile time restriction: 10 AM – 1 PM IST only
        if (info.isMobile && !isWithinMobileLoginWindow()) {
            toast.error("Mobile login is only available between 10:00 AM – 1:00 PM IST.", {
                icon: <Smartphone className="h-4 w-4" />,
                duration: 5000,
            });
            return { canProceed: false, needsOtp: false, info };
        }

        // Chrome desktop → OTP required
        if (info.isChrome) {
            return { canProceed: true, needsOtp: true, info };
        }

        // Microsoft browser or others → direct login
        return { canProceed: true, needsOtp: false, info };
    };

    // ── Complete the actual sign-in ─────────────────────────
    const completeSignIn = async (method: "credentials" | "firebase") => {
        const info = detectBrowserInfo();
        try {
            let response;

            if (method === "credentials" && pendingCredentials) {
                response = await signIn("credentials", {
                    email: pendingCredentials.email,
                    password: pendingCredentials.password,
                    redirect: false,
                    callbackUrl,
                });
            } else if (method === "firebase" && pendingFirebaseToken) {
                response = await signIn("firebase", {
                    idToken: pendingFirebaseToken,
                    redirect: false,
                    callbackUrl,
                });
            }

            if (response?.error) {
                toast.error("Authentication failed. Please check your credentials.");
            } else {
                await recordLoginHistory(info.ua);
                router.push(callbackUrl);
                router.refresh();
                toast.success("Logged in successfully!");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsLoading(null);
            setPendingCredentials(null);
            setPendingFirebaseToken(null);
        }
    };

    // ── Firebase / Google login ──────────────────────────────
    const handleFirebaseLogin = async () => {
        const { canProceed, needsOtp, info } = preLoginCheck();
        if (!canProceed) return;

        setIsLoading("google");
        try {
            const provider = googleProvider;
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();
            const email = result.user.email ?? "";

            if (needsOtp) {
                setPendingEmail(email);
                setPendingFirebaseToken(idToken);
                setShowOtpModal(true);
            } else {
                setPendingFirebaseToken(idToken);
                // Direct login for Microsoft browsers and others
                const response = await signIn("firebase", {
                    idToken,
                    redirect: false,
                    callbackUrl,
                });

                if (response?.error) {
                    toast.error("Authentication failed.");
                } else {
                    await recordLoginHistory(info.ua);
                    router.push(callbackUrl);
                    router.refresh();
                    toast.success("Logged in successfully!");
                }
                setIsLoading(null);
            }
        } catch (error: any) {
            const msg = error.code === "auth/popup-closed-by-user" ? "Login cancelled" : error.message;
            toast.error(msg || "Failed to login");
            setIsLoading(null);
        }
    };

    // ── Credentials login ───────────────────────────────────
    const handleCredentialsLogin = async (formData: FormData) => {
        const { canProceed, needsOtp, info } = preLoginCheck();
        if (!canProceed) return;

        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        setIsLoading("credentials");

        if (needsOtp) {
            setPendingEmail(email);
            setPendingCredentials({ email, password });
            setShowOtpModal(true);
        } else {
            // Direct login for Microsoft browsers and others
            try {
                const result = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                    callbackUrl,
                });

                if (result?.error) {
                    toast.error("Invalid email or password");
                } else {
                    await recordLoginHistory(info.ua);
                    router.push(callbackUrl);
                    router.refresh();
                    toast.success("Logged in successfully!");
                }
            } catch {
                toast.error("Something went wrong");
            } finally {
                setIsLoading(null);
            }
        }
    };

    // ── OTP verified callback ───────────────────────────────
    const handleOtpVerified = () => {
        setShowOtpModal(false);
        if (pendingCredentials) {
            completeSignIn("credentials");
        } else if (pendingFirebaseToken) {
            completeSignIn("firebase");
        }
    };

    const handleOtpCancel = () => {
        setShowOtpModal(false);
        setIsLoading(null);
        setPendingCredentials(null);
        setPendingFirebaseToken(null);
        setPendingEmail("");
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            {/* OTP Modal (Chrome only) */}
            {showOtpModal && (
                <LoginOtpModal
                    email={pendingEmail}
                    onVerified={handleOtpVerified}
                    onCancel={handleOtpCancel}
                />
            )}

            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">Sign in to X</h1>
                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <Button
                    variant="outline"
                    className="w-full rounded-full font-bold h-10"
                    onClick={handleFirebaseLogin}
                    disabled={!!isLoading}
                >
                    {isLoading === "google" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Image
                            src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA"
                            alt="Google"
                            width={20}
                            height={20}
                            className="mr-2"
                        />
                    )}
                    Sign in with Google
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                </div>

                <form action={handleCredentialsLogin} className="space-y-4">
                    <Input
                        name="email"
                        placeholder="Email"
                        type="email"
                        required
                        className="bg-background"
                    />
                    <Input
                        name="password"
                        placeholder="Password"
                        type="password"
                        required
                        className="bg-background"
                    />
                    <Button
                        type="submit"
                        className="w-full rounded-full font-bold h-10"
                        disabled={!!isLoading}
                    >
                        {isLoading === "credentials" && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign in
                    </Button>
                </form>

                <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                        <Link href="/forgot-password" className="text-primary hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <div>
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-primary hover:underline">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-sm flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
