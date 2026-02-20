import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

function generateLetterPassword(length = 12): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/reset-password
// Body: { email, step: "send-otp" | "verify-otp", code?: string }
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, step, code } = body as { email: string; step: string; code?: string };

        if (!email || !step) {
            return NextResponse.json({ error: "Missing fields." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
        }

        // ── Step 1: Send OTP ──
        if (step === "send-otp") {
            // Once-per-day check
            if (user.lastPasswordReset) {
                const last = new Date(user.lastPasswordReset);
                const now = new Date();
                const sameDay =
                    last.getFullYear() === now.getFullYear() &&
                    last.getMonth() === now.getMonth() &&
                    last.getDate() === now.getDate();
                if (sameDay) {
                    return NextResponse.json(
                        { error: "You can use this option only one time per day." },
                        { status: 429 }
                    );
                }
            }

            const otp = generateOtp();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await prisma.otpCode.deleteMany({ where: { email, purpose: "forgot_password", used: false } });
            await prisma.otpCode.create({ data: { email, code: otp, purpose: "forgot_password", expiresAt } });

            const resend = new Resend(process.env.RESEND_API_KEY);
            await resend.emails.send({
                from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
                to: email,
                subject: "Password Reset OTP",
                html: `
                    <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px;">
                        <h2 style="color:#1d9bf0">Reset Your Password</h2>
                        <p>Your one-time password is:</p>
                        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1d9bf0;margin:16px 0;">${otp}</div>
                        <p style="color:#888;font-size:13px;">Expires in 10 minutes. Do not share with anyone.</p>
                    </div>
                `,
            });

            return NextResponse.json({ success: true });
        }

        // ── Step 2: Verify OTP + reset password ──
        if (step === "verify-otp") {
            if (!code) return NextResponse.json({ error: "OTP required." }, { status: 400 });

            const otpRecord = await prisma.otpCode.findFirst({
                where: { email, code, purpose: "forgot_password", used: false, expiresAt: { gt: new Date() } },
            });
            if (!otpRecord) {
                return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
            }

            await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

            const newPassword = generateLetterPassword(12);
            const hashed = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { email },
                data: { password: hashed, lastPasswordReset: new Date() },
            });

            return NextResponse.json({ success: true, newPassword });
        }

        return NextResponse.json({ error: "Invalid step." }, { status: 400 });

    } catch (err) {
        console.error("[reset-password] error:", err);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
