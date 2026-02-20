"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Globe, Loader2, X, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage, LANGUAGES, LangCode } from "@/context/language-context";

// Mock SMS OTP (stored in state, no real SMS provider)
function generateMockOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function LanguageSwitcher() {
    const { lang, setLang, t } = useLanguage();
    const { data: session } = useSession();

    const [open, setOpen] = useState(false);
    const [targetLang, setTargetLang] = useState<LangCode | null>(null);
    const [otpStep, setOtpStep] = useState(false);
    const [otp, setOtp] = useState("");
    const [mockOtp, setMockOtp] = useState(""); // for non-French (SMS mock)
    const [loading, setLoading] = useState(false);

    const isFrench = targetLang === "fr";

    const handleSelect = async (code: LangCode) => {
        if (code === lang) { setOpen(false); return; }
        setTargetLang(code);
        setOtp("");

        if (code === "fr") {
            // Send real email OTP
            setLoading(true);
            try {
                const res = await fetch("/api/language-otp/send", { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setOtpStep(true);
                toast.success(t("otpSentEmail"));
            } catch (err: unknown) {
                toast.error((err as Error).message);
            } finally {
                setLoading(false);
            }
        } else {
            // Mock SMS OTP
            const generated = generateMockOtp();
            setMockOtp(generated);
            setOtpStep(true);
            toast.success(`${t("otpSentSms")} (Demo OTP: ${generated})`);
        }
    };

    const handleVerify = async () => {
        if (!targetLang) return;
        setLoading(true);

        try {
            if (isFrench) {
                // Verify via API
                const res = await fetch("/api/language-otp/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ code: otp }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Invalid OTP.");
            } else {
                // Verify mock SMS OTP (client-side)
                if (otp !== mockOtp) throw new Error("Invalid OTP. Please check and try again.");
            }

            setLang(targetLang);
            toast.success(`✅ Language changed to ${LANGUAGES.find(l => l.code === targetLang)?.label}`);
            setOpen(false);
            setOtpStep(false);
            setTargetLang(null);
            setOtp("");
        } catch (err: unknown) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setOtpStep(false);
        setTargetLang(null);
        setOtp("");
        setMockOtp("");
    };

    const currentLang = LANGUAGES.find(l => l.code === lang);

    return (
        <>
            {/* Trigger button */}
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-border hover:bg-foreground/10 transition-colors"
                title={t("language")}
            >
                <Globe className="h-3.5 w-3.5" />
                <span>{currentLang?.flag} {currentLang?.label}</span>
            </button>

            {/* Modal */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-xs mx-4 shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <h2 className="font-bold text-base">
                                {otpStep ? t("verifyToSwitch") : t("selectLanguage")}
                            </h2>
                            <button onClick={handleClose} className="p-1 rounded-full hover:bg-muted transition-colors">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {!otpStep ? (
                            /* Language list */
                            <ul className="py-2">
                                {LANGUAGES.map(({ code, label, flag }) => (
                                    <li key={code}>
                                        <button
                                            onClick={() => handleSelect(code)}
                                            disabled={loading}
                                            className={`w-full flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/60 transition-colors ${lang === code ? "text-primary font-semibold" : ""
                                                }`}
                                        >
                                            <span className="text-xl">{flag}</span>
                                            <span className="flex-1 text-left">{label}</span>
                                            {lang === code && (
                                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
                                            )}
                                            {loading && targetLang === code && (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            /* OTP step */
                            <div className="p-5 space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl p-3">
                                    {isFrench
                                        ? <Mail className="h-4 w-4 flex-shrink-0 text-primary" />
                                        : <Smartphone className="h-4 w-4 flex-shrink-0 text-primary" />
                                    }
                                    <span>
                                        {isFrench ? t("otpSentEmail") : t("otpSentSms")}
                                    </span>
                                </div>

                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">{t("enterOtp")}</label>
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
                                        onClick={handleClose}
                                        disabled={loading}
                                        className="flex-1 rounded-full"
                                    >
                                        {t("cancel")}
                                    </Button>
                                    <Button
                                        onClick={handleVerify}
                                        disabled={loading || otp.length !== 6}
                                        className="flex-1 rounded-full font-bold"
                                    >
                                        {loading
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : t("verify")
                                        }
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
