import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require authentication
const protectedRoutes = ["/", "/explore", "/notifications", "/messages", "/bookmarks", "/profile", "/tweet"];

// Routes that should redirect to home if already logged in
const authRoutes = ["/login", "/register"];

export async function middleware(request: NextRequest) {
    const session = await auth();
    const { pathname } = request.nextUrl;

    const isProtectedRoute = protectedRoutes.some(
        (route) => pathname === route || pathname.startsWith(route + "/")
    );
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Redirect to login if not authenticated on protected route
    if (isProtectedRoute && !session?.user) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Redirect to home if already logged in and on auth route
    if (isAuthRoute && session?.user) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
