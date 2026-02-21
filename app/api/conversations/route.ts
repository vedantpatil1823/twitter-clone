import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const conversations = await prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId: session.user.id,
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            },
                        },
                    },
                },
                messages: {
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1, // Need this to show the last message in the list
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });

        return NextResponse.json({ conversations });
    } catch (error) {
        console.error("[CONVERSATIONS_GET_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { userId } = await request.json(); // ID of the user we want to chat with

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot create conversation with yourself" }, { status: 400 });
        }

        // Check if conversation already exists
        const existingConversations = await prisma.conversation.findMany({
            where: {
                AND: [
                    {
                        participants: {
                            some: {
                                userId: session.user.id,
                            }
                        }
                    },
                    {
                        participants: {
                            some: {
                                userId: userId,
                            }
                        }
                    }
                ]
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            }
                        }
                    }
                }
            }
        });

        // We only want 1-on-1 chats for now, so a perfect match has exactly these two participants.
        const directConversation = existingConversations.find(
            (conv: { participants: any[] }) => conv.participants.length === 2
        );

        if (directConversation) {
            return NextResponse.json({ conversation: directConversation });
        }

        // Create a new conversation
        const newConversation = await prisma.conversation.create({
            data: {
                participants: {
                    createMany: {
                        data: [
                            { userId: session.user.id },
                            { userId: userId },
                        ],
                    },
                },
            },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true,
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json({ conversation: newConversation });

    } catch (error) {
        console.error("[CONVERSATION_CREATE_ERROR]", error);
        return NextResponse.json(
            { error: "Internal Error" },
            { status: 500 }
        );
    }
}
