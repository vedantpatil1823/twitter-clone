"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";
import { toast } from "sonner";

function LoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const error = searchParams.get("error");
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const [isLoading, setIsLoading] = useState<"google" | "credentials" | null>(null);

    const handleFirebaseLogin = async (providerName: "google") => {
        setIsLoading(providerName);
        try {
            const provider = googleProvider;
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            const response = await signIn("firebase", {
                idToken,
                redirect: false,
                callbackUrl,
            });

            if (response?.error) {
                console.error(response.error);
                toast.error("Authentication failed. Please check your credentials.");
            } else {
                router.push(callbackUrl);
                router.refresh();
                toast.success("Logged in successfully!");
            }
        } catch (error: any) {
            console.error("Firebase Login Error:", error);
            const msg = error.code === "auth/popup-closed-by-user" ? "Login cancelled" : error.message;
            toast.error(msg || "Failed to login with Firebase");
        } finally {
            setIsLoading(null);
        }
    };

    const handleCredentialsLogin = async (formData: FormData) => {
        setIsLoading("credentials");
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
                callbackUrl,
            });

            if (result?.error) {
                toast.error("Invalid email or password");
            } else {
                router.push(callbackUrl);
                router.refresh();
                toast.success("Logged in successfully!");
            }
        } catch (error) {
            console.error(error);
            toast.error("Something went wrong");
        } finally {
            setIsLoading(null);
        }
    };

    return (
        <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">Sign in to X</h1>
                {error && (
                    <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                        {error}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <Button
                    variant="outline"
                    className="w-full rounded-full font-bold h-10"
                    onClick={() => handleFirebaseLogin("google")}
                    disabled={!!isLoading}
                >
                    {isLoading === "google" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Image
                            src="https://lh3.googleusercontent.com/COxitqgJr1sJnIDe8-jiKhxDx1FrYbtRHKJ9z_hELisAlapwE9LUPh6fcXIfb5vwpbMl4xl9H9TRFPc5NOO8Sb3VSgIBrfRYvW6cUA"
                            alt="Google"
                            width={20}
                            height={20}
                            className="mr-2"
                        />
                    )}
                    Sign in with Google
                </Button>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                </div>

                <form action={handleCredentialsLogin} className="space-y-4">
                    <Input
                        name="email"
                        placeholder="Email"
                        type="email"
                        required
                        className="bg-background"
                    />
                    <Input
                        name="password"
                        placeholder="Password"
                        type="password"
                        required
                        className="bg-background"
                    />
                    <Button
                        type="submit"
                        className="w-full rounded-full font-bold h-10"
                        disabled={!!isLoading}
                    >
                        {isLoading === "credentials" && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Sign in
                    </Button>
                </form>

                <div className="text-sm text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-primary hover:underline">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="w-full max-w-sm flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    );
}
