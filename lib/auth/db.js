import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "auth.db");

let dbInstance = null;

function getDbPath() {
    const raw = process.env.AUTH_DB_PATH;
    if (!raw) return DEFAULT_DB_PATH;
    return path.isAbsolute(raw) ? raw : path.resolve(raw);
}

function ensureDbDirectory(dbPath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function initSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
    `);
}

export function getAuthDb() {
    if (dbInstance) return dbInstance;
    const dbPath = getDbPath();
    ensureDbDirectory(dbPath);
    dbInstance = new Database(dbPath);
    initSchema(dbInstance);
    return dbInstance;
}

export function findAdminByEmail(email) {
    const db = getAuthDb();
    return db
        .prepare(
            `SELECT id, email, password_hash, is_active
             FROM admin_users
             WHERE lower(email) = lower(?)
             LIMIT 1`,
        )
        .get(email);
}

export function upsertSingleAdmin({ email, passwordHash }) {
    const db = getAuthDb();
    db.prepare(
        `INSERT INTO admin_users (id, email, password_hash, is_active, created_at, updated_at)
         VALUES (1, ?, ?, 1, datetime('now'), datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
             email = excluded.email,
             password_hash = excluded.password_hash,
             is_active = 1,
             updated_at = datetime('now')`,
    ).run(email.toLowerCase(), passwordHash);
}

export function listAdmins() {
    const db = getAuthDb();
    return db
        .prepare(`SELECT id, email, is_active, created_at, updated_at FROM admin_users ORDER BY id`)
        .all();
}

export function updateAdminPassword(id, passwordHash) {
    const db = getAuthDb();
    db.prepare(
        `UPDATE admin_users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(passwordHash, id);
}

export function setAdminActive(id, isActive) {
    const db = getAuthDb();
    db.prepare(
        `UPDATE admin_users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(isActive ? 1 : 0, id);
}

export function updateAdminEmail(id, email) {
    const db = getAuthDb();
    db.prepare(
        `UPDATE admin_users SET email = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(email.toLowerCase(), id);
}

export function deleteAdmin(id) {
    const db = getAuthDb();
    db.prepare(`DELETE FROM admin_users WHERE id = ?`).run(id);
}

export function countAdmins() {
    const db = getAuthDb();
    return db.prepare(`SELECT COUNT(*) as count FROM admin_users`).get().count;
}
