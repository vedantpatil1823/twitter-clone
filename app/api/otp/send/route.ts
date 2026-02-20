import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST() {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Delete any previous unused OTPs for this email
    await prisma.otpCode.deleteMany({
        where: { email, purpose: "audio_tweet", used: false },
    });

    // Save new OTP
    await prisma.otpCode.create({
        data: { email, code, purpose: "audio_tweet", expiresAt },
    });

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
        await resend.emails.send({
            from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
            to: email,
            subject: "Your OTP for Audio Tweet",
            html: `
                <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
                    <h2 style="color:#1d9bf0">Audio Tweet Verification</h2>
                    <p>Your one-time password to post an audio tweet is:</p>
                    <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d9bf0;margin:16px 0;">${code}</div>
                    <p style="color:#888;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
                </div>
            `,
        });
    } catch (err) {
        console.error("Email error:", err);
        return NextResponse.json({ error: "Failed to send OTP email." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

