import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "jobbot_session";
const ISSUER = "jobbot-local-auth";
const AUDIENCE = "jobbot-admin";
const SESSION_TTL_SECONDS = 60 * 60 * 24;

function getSessionSecret() {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret) {
        throw new Error("AUTH_SESSION_SECRET is required");
    }
    return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
        .sign(getSessionSecret());
}

export async function verifySessionToken(token) {
    try {
        const { payload } = await jwtVerify(token, getSessionSecret(), {
            issuer: ISSUER,
            audience: AUDIENCE,
        });
        return payload;
    } catch {
        return null;
    }
}

export function getSessionCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
    };
}
