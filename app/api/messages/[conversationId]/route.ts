import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { conversationId } = await params;

        // Verify user is part of the conversation
        const participation = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId: session.user.id,
                    conversationId: conversationId,
                }
            }
        });

        if (!participation) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const messages = await prisma.message.findMany({
            where: {
                conversationId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    }
                }
            },
            orderBy: {
                createdAt: "asc",
            },
        });

        // Mark as seen
        if (!participation.hasSeenLatest) {
            await prisma.conversationParticipant.update({
                where: { id: participation.id },
                data: { hasSeenLatest: true }
            });
        }

        return NextResponse.json({ messages });
    } catch (error) {
        console.error("[MESSAGES_GET_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { content } = await request.json();
        const { conversationId } = await params;

        if (!content || !content.trim()) {
            return NextResponse.json({ error: "Message content is required" }, { status: 400 });
        }

        // Verify user is a participant
        const participation = await prisma.conversationParticipant.findUnique({
            where: {
                userId_conversationId: {
                    userId: session.user.id,
                    conversationId: conversationId,
                }
            }
        });

        if (!participation) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const message = await prisma.message.create({
            data: {
                content: content.trim(),
                senderId: session.user.id,
                conversationId,
            },
            include: {
                sender: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true,
                    }
                }
            }
        });

        // Update conversation timestamp and mark unread for other participants
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
                updatedAt: new Date(),
                participants: {
                    updateMany: {
                        where: {
                            userId: { not: session.user.id }
                        },
                        data: {
                            hasSeenLatest: false
                        }
                    }
                }
            }
        });

        return NextResponse.json({ message });
    } catch (error) {
        console.error("[MESSAGE_CREATE_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}
