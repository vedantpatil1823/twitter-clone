"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global {
    interface Window {
        Razorpay: new (opts: Record<string, unknown>) => { open(): void };
    }
}

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
    const istOffset = 5.5 * 60;
    const istMs = now.getTime() + istOffset * 60 * 1000;
    const ist = new Date(istMs);
    const totalMins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
    return totalMins >= 10 * 60 && totalMins < 11 * 60;
}

export default function SubscriptionPage() {
    const { data: session, update } = useSession();
    const [loading, setLoading] = useState<string | null>(null);
    const currentPlan = (session?.user as { plan?: string })?.plan ?? "free";

    const handleSubscribe = async (planKey: string) => {
        if (planKey === "free") return;

        if (!isWithinPaymentWindow()) {
            toast.error("Payments are only available between 10:00 AM – 11:00 AM IST.");
            return;
        }

        setLoading(planKey);

        try {
            // 1. Create Razorpay order
            const orderRes = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planKey }),
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error);

            // 2. Load Razorpay script if needed
            if (!window.Razorpay) {
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.onload = () => resolve();
                    script.onerror = () => reject(new Error("Failed to load Razorpay"));
                    document.body.appendChild(script);
                });
            }

            // 3. Open checkout
            await new Promise<void>((resolve, reject) => {
                const rzp = new window.Razorpay({
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: orderData.amount,
                    currency: "INR",
                    name: "Twitter Clone",
                    description: `${planKey.charAt(0).toUpperCase() + planKey.slice(1)} Plan Subscription`,
                    order_id: orderData.orderId,
                    handler: async (response: {
                        razorpay_order_id: string;
                        razorpay_payment_id: string;
                        razorpay_signature: string;
                    }) => {
                        // 4. Verify payment
                        const verifyRes = await fetch("/api/payment/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ...response, plan: planKey }),
                        });
                        const verifyData = await verifyRes.json();
                        if (!verifyRes.ok) {
                            reject(new Error(verifyData.error));
                            return;
                        }
                        await update(); // refresh session
                        toast.success(`🎉 ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan activated! Invoice sent to your email.`);
                        resolve();
                    },
                    prefill: {
                        name: session?.user?.name ?? "",
                        email: session?.user?.email ?? "",
                    },
                    theme: { color: "#1d9bf0" },
                    modal: {
                        ondismiss: () => reject(new Error("Payment cancelled.")),
                    },
                });
                rzp.open();
            });
        } catch (err: unknown) {
            const msg = (err as Error).message;
            if (msg !== "Payment cancelled.") {
                toast.error(msg || "Payment failed.");
            }
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">Subscription Plans</h1>
                <p className="text-muted-foreground mt-2">Choose a plan to unlock more tweets</p>
                <div className="inline-flex items-center gap-2 mt-3 text-sm bg-amber-500/10 text-amber-600 border border-amber-500/30 px-4 py-2 rounded-full">
                    <Lock className="h-3.5 w-3.5" />
                    Payments available only 10:00 AM – 11:00 AM IST
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.key;
                    const isLoading = loading === plan.key;
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
                                    Current Plan
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
                                    {isLoading ? (
                                        <Loader2 className="animate-spin h-4 w-4" />
                                    ) : (
                                        `Subscribe – ₹${plan.price}`
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
