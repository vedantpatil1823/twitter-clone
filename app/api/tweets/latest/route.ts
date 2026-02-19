import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ count: 0 });
        }

        const after = req.nextUrl.searchParams.get("after");
        if (!after) {
            return NextResponse.json({ count: 0 });
        }

        const afterDate = new Date(after);
        if (isNaN(afterDate.getTime())) {
            return NextResponse.json({ count: 0 });
        }

        const count = await prisma.tweet.count({
            where: {
                parentId: null,
                createdAt: { gt: afterDate },
            },
        });

        return NextResponse.json({ count });
    } catch {
        return NextResponse.json({ count: 0 });
    }
}
