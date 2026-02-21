import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export const PLANS = {
    bronze: { name: "Bronze", amount: 100, tweetLimit: 3 },
    silver: { name: "Silver", amount: 300, tweetLimit: 5 },
    gold: { name: "Gold", amount: 1000, tweetLimit: -1 },
} as const;

export type PlanKey = keyof typeof PLANS;

function isWithinPaymentWindow(): boolean {
    const now = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
    const istDate = new Date(utcMs + istOffsetMs);
    const hours = istDate.getHours();
    return hours >= 10 && hours < 11;
}

export async function POST(req: Request) {
    try {
        if (!isWithinPaymentWindow()) {
            return NextResponse.json(
                { error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." },
                { status: 403 }
            );
        }

        const session = await auth();
        if (!session?.user?.id || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json() as { plan: PlanKey; mock?: boolean };
        const { plan, mock } = body;

        if (!PLANS[plan]) {
            return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
        }

        const planConfig = PLANS[plan];
        const planExpiresAt = new Date();
        planExpiresAt.setMonth(planExpiresAt.getMonth() + 1);

        // If real Razorpay: verify signature (skipped for mock mode)
        if (!mock) {
            // Real signature verification would go here
        }

        // Update user plan
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                plan,
                tweetCount: 0,
                planExpiresAt,
            },
        });

        // Send invoice email
        const resend = new Resend(process.env.RESEND_API_KEY);
        const invoiceDate = new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "long", year: "numeric",
        });
        const tweetLimit = planConfig.tweetLimit === -1 ? "Unlimited" : String(planConfig.tweetLimit);

        try {
            await resend.emails.send({
                from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
                to: session.user.email,
                subject: `Invoice – ${planConfig.name} Plan Subscription`,
                html: `
                    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #eee;border-radius:12px;">
                        <h2 style="color:#1d9bf0;margin-bottom:4px;">Payment Successful 🎉</h2>
                        <p style="color:#555;margin-top:0;">Thank you for subscribing to Twitter Clone!</p>
                        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                        <table style="width:100%;border-collapse:collapse;font-size:14px;">
                            <tr><td style="padding:6px 0;color:#888;">Invoice Date</td><td style="text-align:right;">${invoiceDate}</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">Plan</td><td style="text-align:right;font-weight:bold;">${planConfig.name}</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">Tweet Limit</td><td style="text-align:right;">${tweetLimit} tweets/month</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">Valid Until</td><td style="text-align:right;">${planExpiresAt.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">Amount Paid</td><td style="text-align:right;font-weight:bold;font-size:16px;color:#1d9bf0;">₹${planConfig.amount}</td></tr>
                        </table>
                        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
                        <p style="font-size:12px;color:#aaa;text-align:center;">Twitter Clone · This is an automated invoice. No reply required.</p>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.error("Invoice email error:", emailErr);
        }

        return NextResponse.json({ success: true, plan, planExpiresAt });
    } catch (err) {
        console.error("[verify-payment]", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
