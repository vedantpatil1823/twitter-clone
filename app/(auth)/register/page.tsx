"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const [state, action, pending] = useActionState(registerUser, {});

    useEffect(() => {
        if (state.success) {
            router.push("/login?registered=true");
        }
    }, [state.success, router]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Create your account</h1>
            <p className="text-muted-foreground mb-8">Join X today</p>

            <form action={action} className="space-y-4">
                <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        className="mt-1 h-11"
                        maxLength={50}
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="username">Username</Label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                        <Input
                            id="username"
                            name="username"
                            placeholder="johndoe"
                            className="h-11 pl-7"
                            maxLength={15}
                            pattern="[a-zA-Z0-9_]+"
                            required
                        />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Letters, numbers, underscores only</p>
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="mt-1 h-11"
                        required
                    />
                </div>
                <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="At least 6 characters"
                        className="mt-1 h-11"
                        minLength={6}
                        required
                    />
                </div>

                {state.error && (
                    <p className="text-sm text-red-500 bg-red-500/10 rounded-md px-3 py-2">
                        {state.error}
                    </p>
                )}

                <Button
                    type="submit"
                    className="w-full h-11 font-semibold"
                    disabled={pending}
                >
                    {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create account
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                    Sign in
                </Link>
            </p>

            <p className="mt-4 text-xs text-muted-foreground text-center">
                By signing up, you agree to our{" "}
                <span className="text-primary cursor-pointer hover:underline">Terms</span>
                {" "}and{" "}
                <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
        </div>
    );
}
