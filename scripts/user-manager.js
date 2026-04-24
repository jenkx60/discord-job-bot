#!/usr/bin/env node
/**
 * JobBot Admin User Management CLI
 * Manages admin users stored in data/auth.db (SQLite)
 *
 * Usage: npm run user-manager
 */

import readline from "node:readline";
import {
    listAdmins,
    findAdminByEmail,
    upsertSingleAdmin,
    updateAdminPassword,
    updateAdminEmail,
    setAdminActive,
    deleteAdmin,
    countAdmins,
    getAuthDb,
} from "../lib/auth/db.js";
import { hashPassword, verifyPassword } from "../lib/auth/password.js";

// Ensure DB is initialised before anything else
getAuthDb();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
    return new Promise((resolve) => rl.question(question, resolve));
}

function askPassword(question) {
    return new Promise((resolve) => {
        process.stdout.write(question);
        let password = "";
        const wasRaw = process.stdin.isRaw;
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding("utf8");

        const onData = (ch) => {
            if (ch === "\r" || ch === "\n") {
                if (process.stdin.isTTY) process.stdin.setRawMode(wasRaw ?? false);
                process.stdin.removeListener("data", onData);
                process.stdout.write("\n");
                resolve(password);
            } else if (ch === "\u0003") {
                process.stdout.write("\n");
                process.exit();
            } else if (ch === "\u007f" || ch === "\b") {
                if (password.length > 0) {
                    password = password.slice(0, -1);
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                    process.stdout.write(question + "*".repeat(password.length));
                }
            } else {
                password += ch;
                process.stdout.write("*");
            }
        };

        process.stdin.on("data", onData);
    });
}

function clear() {
    process.stdout.write("\x1Bc");
}

function pause() {
    return ask("\nPress Enter to continue...");
}

function formatActive(isActive) {
    return isActive ? "✅ Active" : "🔒 Locked";
}

function hr() {
    console.log("─".repeat(48));
}

function header(title) {
    clear();
    console.log("\n  ╔══════════════════════════════════════════╗");
    console.log(`  ║  ${title.padEnd(42)}║`);
    console.log("  ╚══════════════════════════════════════════╝\n");
}

// ─────────────────────────── Actions ────────────────────────────

async function listUsers() {
    header("JobBot — Admin Users");
    const admins = listAdmins();
    if (admins.length === 0) {
        console.log("  No admin users found.");
    } else {
        admins.forEach((a) => {
            console.log(`  ID:      ${a.id}`);
            console.log(`  Email:   ${a.email}`);
            console.log(`  Status:  ${formatActive(a.is_active)}`);
            console.log(`  Created: ${a.created_at}`);
            console.log(`  Updated: ${a.updated_at}`);
            hr();
        });
    }
    await pause();
}

async function createUser() {
    header("Create Admin User");

    const email = (await ask("  Email: ")).trim().toLowerCase();
    if (!email || !email.includes("@")) {
        console.log("\n  Invalid email address.");
        await pause();
        return;
    }

    const existing = findAdminByEmail(email);
    if (existing) {
        console.log("\n  A user with that email already exists.");
        await pause();
        return;
    }

    const password = await askPassword("  Password (min 12 chars): ");
    if (password.length < 12) {
        console.log("\n  Password must be at least 12 characters.");
        await pause();
        return;
    }

    const confirm = await askPassword("  Confirm password: ");
    if (password !== confirm) {
        console.log("\n  Passwords do not match.");
        await pause();
        return;
    }

    const hash = await hashPassword(password);
    upsertSingleAdmin({ email, passwordHash: hash });
    console.log(`\n  ✅ Admin user created: ${email}`);
    await pause();
}

async function resetPassword() {
    header("Reset Admin Password");
    const admins = listAdmins();
    if (admins.length === 0) {
        console.log("  No admin users found.");
        await pause();
        return;
    }

    const email = (await ask("  Email of user to reset: ")).trim().toLowerCase();
    const admin = findAdminByEmail(email);
    if (!admin) {
        console.log("\n  User not found.");
        await pause();
        return;
    }

    const current = await askPassword("  Current password (to verify): ");
    const valid = await verifyPassword(admin.password_hash, current);
    if (!valid) {
        console.log("\n  Current password is incorrect.");
        await pause();
        return;
    }

    const newPass = await askPassword("  New password (min 12 chars): ");
    if (newPass.length < 12) {
        console.log("\n  Password must be at least 12 characters.");
        await pause();
        return;
    }
    const confirmPass = await askPassword("  Confirm new password: ");
    if (newPass !== confirmPass) {
        console.log("\n  Passwords do not match.");
        await pause();
        return;
    }

    const hash = await hashPassword(newPass);
    updateAdminPassword(admin.id, hash);
    console.log(`\n  ✅ Password updated for ${email}`);
    await pause();
}

async function changeEmail() {
    header("Change Admin Email");
    const admins = listAdmins();
    if (admins.length === 0) {
        console.log("  No admin users found.");
        await pause();
        return;
    }

    const currentEmail = (await ask("  Current email: ")).trim().toLowerCase();
    const admin = findAdminByEmail(currentEmail);
    if (!admin) {
        console.log("\n  User not found.");
        await pause();
        return;
    }

    const newEmail = (await ask("  New email: ")).trim().toLowerCase();
    if (!newEmail || !newEmail.includes("@")) {
        console.log("\n  Invalid email address.");
        await pause();
        return;
    }

    const confirm = (await ask(`  Change email to ${newEmail}? (yes/no): `)).trim().toLowerCase();
    if (confirm !== "yes") {
        console.log("\n  Cancelled.");
        await pause();
        return;
    }

    updateAdminEmail(admin.id, newEmail);
    console.log(`\n  ✅ Email updated to: ${newEmail}`);
    await pause();
}

async function lockUser() {
    header("Lock Admin Account");
    const email = (await ask("  Email to lock: ")).trim().toLowerCase();
    const admin = findAdminByEmail(email);
    if (!admin) {
        console.log("\n  User not found.");
        await pause();
        return;
    }
    if (!admin.is_active) {
        console.log("\n  Account is already locked.");
        await pause();
        return;
    }
    setAdminActive(admin.id, false);
    console.log(`\n  🔒 Account locked: ${email}`);
    await pause();
}

async function unlockUser() {
    header("Unlock Admin Account");
    const email = (await ask("  Email to unlock: ")).trim().toLowerCase();
    const admin = findAdminByEmail(email);
    if (!admin) {
        console.log("\n  User not found.");
        await pause();
        return;
    }
    if (admin.is_active) {
        console.log("\n  Account is already active.");
        await pause();
        return;
    }
    setAdminActive(admin.id, true);
    console.log(`\n  ✅ Account unlocked: ${email}`);
    await pause();
}

async function deleteUser() {
    header("Delete Admin User");
    const total = countAdmins();
    if (total <= 1) {
        console.log("  Cannot delete — this is the only admin account.");
        console.log("  Create a replacement account first.");
        await pause();
        return;
    }

    const email = (await ask("  Email to delete: ")).trim().toLowerCase();
    const admin = findAdminByEmail(email);
    if (!admin) {
        console.log("\n  User not found.");
        await pause();
        return;
    }

    const confirm = await ask(`  Type DELETE to confirm removal of ${email}: `);
    if (confirm.trim() !== "DELETE") {
        console.log("\n  Cancelled.");
        await pause();
        return;
    }

    deleteAdmin(admin.id);
    console.log(`\n  ✅ Admin user deleted: ${email}`);
    await pause();
}

// ──────────────────────────── Menu ──────────────────────────────

function printMenu() {
    clear();
    const total = countAdmins();
    console.log("\n  ╔══════════════════════════════════════════╗");
    console.log("  ║      JobBot Admin User Manager           ║");
    console.log("  ╚══════════════════════════════════════════╝");
    console.log(`\n  Admin users in DB: ${total}\n`);
    console.log("  1)  List users");
    console.log("  2)  Create user");
    console.log("  3)  Reset password");
    console.log("  4)  Change email");
    console.log("  5)  Lock account");
    console.log("  6)  Unlock account");
    console.log("  7)  Delete user");
    console.log("  0)  Exit\n");
}

async function main() {
    while (true) {
        printMenu();
        const choice = (await ask("  Select option: ")).trim();
        switch (choice) {
            case "1": await listUsers(); break;
            case "2": await createUser(); break;
            case "3": await resetPassword(); break;
            case "4": await changeEmail(); break;
            case "5": await lockUser(); break;
            case "6": await unlockUser(); break;
            case "7": await deleteUser(); break;
            case "0":
                console.log("\n  Goodbye.\n");
                rl.close();
                process.exit(0);
            default:
                console.log("\n  Invalid option.");
                await pause();
        }
    }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
