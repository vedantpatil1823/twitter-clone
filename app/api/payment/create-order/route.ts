import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Razorpay from "razorpay";

export const dynamic = "force-dynamic";

// Plan config
export const PLANS = {
    bronze: { name: "Bronze", amount: 10000, currency: "INR", tweetLimit: 3 },  // ₹100 in paise
    silver: { name: "Silver", amount: 30000, currency: "INR", tweetLimit: 5 },  // ₹300
    gold: { name: "Gold", amount: 100000, currency: "INR", tweetLimit: -1 }, // ₹1000, -1 = unlimited
} as const;

export type PlanKey = keyof typeof PLANS;

function isWithinPaymentWindow(): boolean {
    // 10:00 AM – 11:00 AM IST  →  04:30 – 05:30 UTC
    const now = new Date();
    const istOffset = 5.5 * 60;
    const istMs = now.getTime() + istOffset * 60 * 1000;
    const ist = new Date(istMs);
    const h = ist.getUTCHours();
    const m = ist.getUTCMinutes();
    const totalMins = h * 60 + m;
    return totalMins >= 10 * 60 && totalMins < 11 * 60;
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isWithinPaymentWindow()) {
            return NextResponse.json(
                { error: "Payments are only available between 10:00 AM – 11:00 AM IST." },
                { status: 403 }
            );
        }

        const { plan } = await req.json() as { plan: PlanKey };
        if (!PLANS[plan]) {
            return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const order = await razorpay.orders.create({
            amount: PLANS[plan].amount,
            currency: PLANS[plan].currency,
            receipt: `receipt_${session.user.id}_${plan}_${Date.now()}`,
            notes: { userId: session.user.id, plan },
        });

        return NextResponse.json({ orderId: order.id, amount: PLANS[plan].amount, plan });
    } catch (err) {
        console.error("[create-order]", err);
        return NextResponse.json({ error: "Failed to create order." }, { status: 500 });
    }
}
