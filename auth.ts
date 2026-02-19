import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    debug: true,
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const validated = loginSchema.safeParse(credentials);
                if (!validated.success) return null;

                const { email, password } = validated.data;

                const user = await prisma.user.findUnique({
                    where: { email },
                });

                if (!user || !user.password) return null;

                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) return null;

                return user;
            },
        }),
        Credentials({
            id: "firebase",
            name: "Firebase",
            credentials: {
                idToken: { label: "Token", type: "text" },
            },
            async authorize(credentials) {
                const { idToken } = credentials;
                if (!idToken || typeof idToken !== "string") return null;

                try {
                    // 1. Verify Firebase Token
                    const { adminAuth } = await import("@/lib/firebase-admin");
                    const decodedToken = await adminAuth.verifyIdToken(idToken);
                    const email = decodedToken.email;

                    if (!email) return null;

                    // 2. Find or Create User in Prisma
                    let user = await prisma.user.findUnique({
                        where: { email },
                    });

                    if (!user) {
                        // Create new user from Firebase info
                        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
                        let username = baseUsername;
                        let counter = 1;
                        while (await prisma.user.findUnique({ where: { username } })) {
                            username = `${baseUsername}${counter++}`;
                        }

                        user = await prisma.user.create({
                            data: {
                                email,
                                name: decodedToken.name || decodedToken.email?.split("@")[0],
                                image: decodedToken.picture || null,
                                username,
                                verified: decodedToken.email_verified || false,
                            },
                        });
                    }

                    return user;
                } catch (error: any) {
                    console.error("Firebase Auth Error:", error);
                    // Throw error to be caught by NextAuth and returned to client
                    throw new Error(error.message || "Firebase Auth Failed");
                }
            },
        }),
    ],
    session: { strategy: "jwt" },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                // If the user was just created by OAuth, they might not have a username yet.
                // We check the DB to be sure, and generate one if missing.
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                });

                if (dbUser && !dbUser.username) {
                    const baseUsername = (dbUser.email || "user").split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
                    let username = baseUsername;
                    let counter = 1;
                    while (await prisma.user.findUnique({ where: { username } })) {
                        username = `${baseUsername}${counter++}`;
                    }

                    const updatedUser = await prisma.user.update({
                        where: { id: dbUser.id },
                        data: { username },
                    });
                    token.username = updatedUser.username;
                } else {
                    token.username = dbUser?.username || (user as any).username;
                }
            } else if (token.id && !token.username) {
                // If token exists but no username (e.g. from previous session), fetch it
                const dbUser = await prisma.user.findUnique({
                    where: { id: token.id as string },
                    select: { username: true },
                });
                token.username = dbUser?.username;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
            }
            return session;
        },
        // Removed signIn callback since we handle username generation in jwt now
    },
});
