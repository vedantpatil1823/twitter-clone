import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { email, code } = await request.json();
        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                email,
                code,
                purpose: "login_otp",
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        });

        if (!otpRecord) {
            return NextResponse.json({ error: "Invalid or expired OTP." }, { status: 400 });
        }

        // Mark as used
        await prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { used: true },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[login-otp/verify]", err);
        return NextResponse.json({ error: "Verification failed." }, { status: 500 });
    }
}
