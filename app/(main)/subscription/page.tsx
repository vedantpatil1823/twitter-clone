"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2, Lock, X, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/context/language-context";

const PLANS = [
    {
        key: "free",
        name: "Free",
        price: 0,
        tweetLimit: 1,
        color: "border-border",
        badge: "",
        features: ["1 tweet per month", "Basic access"],
    },
    {
        key: "bronze",
        name: "Bronze",
        price: 100,
        tweetLimit: 3,
        color: "border-amber-600",
        badge: "Popular",
        features: ["3 tweets per month", "All basic features"],
    },
    {
        key: "silver",
        name: "Silver",
        price: 300,
        tweetLimit: 5,
        color: "border-slate-400",
        badge: "",
        features: ["5 tweets per month", "All basic features", "Priority support"],
    },
    {
        key: "gold",
        name: "Gold",
        price: 1000,
        tweetLimit: -1,
        color: "border-yellow-400",
        badge: "Best Value",
        features: ["Unlimited tweets", "All features", "Premium badge"],
    },
];

function isWithinPaymentWindow(): boolean {
    const now = new Date();
    const istMs = now.getTime() + 5.5 * 60 * 60 * 1000;
    const ist = new Date(istMs);
    const hours = ist.getUTCHours();
    return hours >= 10 && hours < 11;
}

// ── Mock Payment Modal ──────────────────────────────────────────────────
type MockModalProps = {
    plan: (typeof PLANS)[number];
    onSuccess: () => void;
    onCancel: () => void;
};

type PayMethod = "upi" | "card";

function MockPaymentModal({ plan, onSuccess, onCancel }: MockModalProps) {
    const [method, setMethod] = useState<PayMethod>("upi");
    const [upiId, setUpiId] = useState("");
    const [cardNum, setCardNum] = useState("");
    const [expiry, setExpiry] = useState("");
    const [cvv, setCvv] = useState("");
    const [processing, setProcessing] = useState(false);

    const handlePay = async () => {
        if (method === "upi" && !upiId.includes("@")) {
            toast.error("Enter a valid UPI ID (e.g. name@upi)");
            return;
        }
        if (method === "card" && (cardNum.replace(/\s/g, "").length < 16 || !expiry || !cvv)) {
            toast.error("Please fill in all card details.");
            return;
        }
        setProcessing(true);
        await new Promise((r) => setTimeout(r, 2200)); // simulate processing
        onSuccess();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">Paying for</p>
                        <p className="font-bold text-base">{plan.name} Plan — ₹{plan.price}/mo</p>
                    </div>
                    <button onClick={onCancel} disabled={processing} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Method tabs */}
                <div className="flex border-b border-border">
                    {(["upi", "card"] as PayMethod[]).map((m) => (
                        <button
                            key={m}
                            disabled={processing}
                            onClick={() => setMethod(m)}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${method === m
                                ? "border-b-2 border-primary text-primary"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {m === "upi" ? <Smartphone className="h-3.5 w-3.5" /> : <CreditCard className="h-3.5 w-3.5" />}
                            {m === "upi" ? "UPI" : "Card"}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <div className="p-5 space-y-3">
                    {method === "upi" ? (
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">UPI ID</label>
                            <Input
                                placeholder="yourname@upi"
                                value={upiId}
                                onChange={(e) => setUpiId(e.target.value)}
                                disabled={processing}
                                className="rounded-xl"
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Card Number</label>
                                <Input
                                    placeholder="1234 5678 9012 3456"
                                    value={cardNum}
                                    maxLength={19}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, "").slice(0, 16);
                                        setCardNum(v.replace(/(.{4})/g, "$1 ").trim());
                                    }}
                                    disabled={processing}
                                    className="rounded-xl font-mono"
                                />
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-muted-foreground mb-1 block">Expiry</label>
                                    <Input
                                        placeholder="MM/YY"
                                        value={expiry}
                                        maxLength={5}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                                            setExpiry(v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v);
                                        }}
                                        disabled={processing}
                                        className="rounded-xl font-mono"
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-xs text-muted-foreground mb-1 block">CVV</label>
                                    <Input
                                        placeholder="•••"
                                        type="password"
                                        value={cvv}
                                        maxLength={3}
                                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                        disabled={processing}
                                        className="rounded-xl font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handlePay}
                        disabled={processing}
                        className="w-full rounded-full font-bold mt-2"
                    >
                        {processing ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                Processing…
                            </span>
                        ) : (
                            `Pay ₹${plan.price}`
                        )}
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground">
                        🔒 Simulated payment — no real money charged
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function SubscriptionPage() {
    const { data: session, update } = useSession();
    const [activePlan, setActivePlan] = useState<(typeof PLANS)[number] | null>(null);
    const [loading, setLoading] = useState<string | null>(null);
    const currentPlan = (session?.user as { plan?: string })?.plan ?? "free";
    const { t } = useLanguage();

    const handleSubscribe = (planKey: string) => {
        if (planKey === "free") return;

        if (!isWithinPaymentWindow()) {
            toast.error("Payments are only available between 10:00 AM – 11:00 AM IST.");
            return;
        }

        const plan = PLANS.find((p) => p.key === planKey);
        if (plan) setActivePlan(plan);
    };

    const handlePaymentSuccess = async () => {
        if (!activePlan) return;
        setLoading(activePlan.key);
        setActivePlan(null);

        try {
            const res = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: activePlan.key, mock: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            await update();
            toast.success(`🎉 ${activePlan.name} plan activated! Invoice sent to your email.`);
        } catch (err: unknown) {
            toast.error((err as Error).message || "Something went wrong.");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {activePlan && (
                <MockPaymentModal
                    plan={activePlan}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setActivePlan(null)}
                />
            )}

            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">{t("subscription" as never)}</h1>
                <p className="text-muted-foreground mt-2">{t("choosePlan" as never)}</p>
                <div className="inline-flex items-center gap-2 mt-3 text-sm bg-amber-500/10 text-amber-600 border border-amber-500/30 px-4 py-2 rounded-full">
                    <Lock className="h-3.5 w-3.5" />
                    {t("paymentsWindow" as never)}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.key;
                    const isProcessing = loading === plan.key;
                    const isFree = plan.key === "free";

                    return (
                        <div
                            key={plan.key}
                            className={`relative flex flex-col rounded-2xl border-2 p-5 ${plan.color} ${isCurrent ? "bg-primary/5" : "bg-card"
                                }`}
                        >
                            {plan.badge && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                                    {plan.badge}
                                </span>
                            )}

                            <div className="mb-4">
                                <h2 className="text-lg font-bold">{plan.name}</h2>
                                <div className="mt-1">
                                    {isFree ? (
                                        <span className="text-2xl font-bold">Free</span>
                                    ) : (
                                        <span className="text-2xl font-bold">
                                            ₹{plan.price}
                                            <span className="text-sm font-normal text-muted-foreground">/mo</span>
                                        </span>
                                    )}
                                </div>
                            </div>

                            <ul className="flex-1 space-y-2 mb-5">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-sm">
                                        <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>

                            {isCurrent ? (
                                <Button disabled variant="outline" className="rounded-full w-full">
                                    {t("currentPlan" as never)}
                                </Button>
                            ) : isFree ? (
                                <Button disabled variant="ghost" className="rounded-full w-full">
                                    Default
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => handleSubscribe(plan.key)}
                                    disabled={!!loading}
                                    className="rounded-full w-full font-bold"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        `${t("subscribe" as never)} – ₹${plan.price}`
                                    )}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
