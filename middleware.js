import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function middleware(request) {
    const pathname = request.nextUrl.pathname;
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    const isAuthed = Boolean(session?.sub);

    const isAuthApi = pathname.startsWith("/api/auth/");
    const isProtectedApi = pathname.startsWith("/api/") && !isAuthApi;
    const isDashboard = pathname.startsWith("/dashboard");
    const isLoginPage = pathname === "/login";

    if (!isAuthed && (isDashboard || isProtectedApi)) {
        if (isProtectedApi) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (isAuthed && isLoginPage) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/api/:path*", "/login"],
};