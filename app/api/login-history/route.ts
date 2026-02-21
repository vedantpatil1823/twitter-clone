import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { parseUserAgent } from "@/lib/login-utils";

export const dynamic = "force-dynamic";

/** POST — record a login event  */
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const userAgent = body.userAgent || request.headers.get("user-agent") || "";
        const ipAddress =
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            request.headers.get("x-real-ip") ||
            "unknown";

        const { browser, os, deviceType } = parseUserAgent(userAgent);

        await prisma.loginHistory.create({
            data: {
                userId: session.user.id,
                browser,
                os,
                deviceType,
                ipAddress,
            },
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[login-history] POST error:", err);
        return NextResponse.json({ error: "Failed to record login" }, { status: 500 });
    }
}

/** GET — retrieve login history for the current user */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const history = await prisma.loginHistory.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json(history);
    } catch (err) {
        console.error("[login-history] GET error:", err);
        return NextResponse.json({ error: "Failed to fetch login history" }, { status: 500 });
    }
}
