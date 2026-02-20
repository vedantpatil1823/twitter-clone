import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = session.user.email;
        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Delete any previous unused OTPs for this purpose
        await prisma.otpCode.deleteMany({
            where: { email, purpose: "language_switch", used: false },
        });

        await prisma.otpCode.create({
            data: { email, code, purpose: "language_switch", expiresAt },
        });

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
            to: email,
            subject: "Verify Language Change",
            html: `
                <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
                    <h2 style="color:#1d9bf0">Language Change Verification</h2>
                    <p>You requested to switch to French. Use this OTP to confirm:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d9bf0;margin:16px 0;">${code}</div>
                    <p style="color:#888;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            `,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[language-otp/send]", err);
        return NextResponse.json({ error: "Failed to send OTP." }, { status: 500 });
    }
}
