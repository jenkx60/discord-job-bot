#!/usr/bin/env node
import { upsertSingleAdmin } from "../lib/auth/db.js";
import { hashPassword } from "../lib/auth/password.js";

async function main() {
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";

    if (!email || !password) {
        console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD.");
        process.exit(1);
    }

    if (password.length < 12) {
        console.error("ADMIN_PASSWORD must be at least 12 characters.");
        process.exit(1);
    }

    const hash = await hashPassword(password);
    upsertSingleAdmin({ email, passwordHash: hash });
    console.log(`Admin user seeded: ${email}`);
}

main().catch((error) => {
    console.error("Failed to seed admin:", error);
    process.exit(1);
});
