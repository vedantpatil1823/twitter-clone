"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
    name: z.string().min(1, "Name is required").max(50),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(15, "Username must be at most 15 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type RegisterState = {
    error?: string;
    success?: boolean;
};

export async function registerUser(
    _prevState: RegisterState,
    formData: FormData
): Promise<RegisterState> {
    const raw = {
        name: formData.get("name") as string,
        username: formData.get("username") as string,
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const validated = registerSchema.safeParse(raw);
    if (!validated.success) {
        return { error: validated.error.issues[0].message };
    }

    const { name, username, email, password } = validated.data;

    // Check uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) return { error: "Email already in use" };

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) return { error: "Username already taken" };

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
        data: {
            name,
            username,
            email,
            password: hashedPassword,
        },
    });

    return { success: true };
}

