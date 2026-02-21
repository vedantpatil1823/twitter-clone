import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json();
        if (!email || typeof email !== "string") {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const code = generateOtp();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any previous unused login OTPs for this email
        await prisma.otpCode.deleteMany({
            where: { email, purpose: "login_otp", used: false },
        });

        await prisma.otpCode.create({
            data: { email, code, purpose: "login_otp", expiresAt },
        });

        // Try to send OTP via email (may fail on free Resend tier for non-verified emails)
        try {
            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
                to: email,
                subject: "Login Verification Code",
                html: `
                    <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
                        <h2 style="color:#1d9bf0">Login Verification</h2>
                        <p>You're logging in from <strong>Google Chrome</strong>. Enter this OTP to verify your identity:</p>
                        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d9bf0;margin:16px 0;">${code}</div>
                        <p style="color:#888;font-size:13px;">This OTP expires in 10 minutes. Do not share it with anyone.</p>
                    </div>
                `,
            });
        } catch (emailErr) {
            console.warn("[login-otp/send] Email delivery failed (showing OTP in toast instead):", emailErr);
        }

        // Return OTP in response so client can display it in a toast for demo/testing
        return NextResponse.json({ success: true, demoOtp: code });
    } catch (err) {
        console.error("[login-otp/send]", err);
        return NextResponse.json({ error: "Failed to send OTP." }, { status: 500 });
    }
}
