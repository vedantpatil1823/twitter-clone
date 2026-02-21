import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q") || "";

        if (!query) {
            return NextResponse.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        id: {
                            not: session.user.id, // Don't search for current user
                        }
                    },
                    {
                        OR: [
                            {
                                name: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                            {
                                username: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true,
            },
            take: 20, // Limit results
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("[USER_SEARCH_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}
