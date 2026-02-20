import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();
    const email = session.user.email;

    const otpRecord = await prisma.otpCode.findFirst({
        where: {
            email,
            code,
            purpose: "audio_tweet",
            used: false,
            expiresAt: { gt: new Date() },
        },
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
}
