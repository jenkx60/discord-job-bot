import { NextResponse } from "next/server";
import { findAdminByEmail } from "@/lib/auth/db";
import { verifyPassword } from "@/lib/auth/password";
import { AUTH_COOKIE_NAME, createSessionToken, getSessionCookieOptions } from "@/lib/auth/session";

export async function POST(request) {
    try {
        const body = await request.json();
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: "Email and password are required." },
                { status: 400 },
            );
        }

        const admin = findAdminByEmail(email);
        if (!admin || !admin.is_active) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
                { status: 401 },
            );
        }

        const isValid = await verifyPassword(admin.password_hash, password);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid email or password." },
                { status: 401 },
            );
        }

        const token = await createSessionToken({
            sub: String(admin.id),
            email: admin.email,
            role: "admin",
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set(AUTH_COOKIE_NAME, token, getSessionCookieOptions());
        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, error: "Unable to process login request." },
            { status: 500 },
        );
    }
}
