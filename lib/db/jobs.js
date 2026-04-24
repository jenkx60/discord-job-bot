import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Always resolve to an absolute path so both the bot process and the
// Next.js server process always open the same physical file regardless
// of which directory they were started from.
const DEFAULT_DB_PATH = path.join(__dirname, "..", "..", "data", "jobs.db");

let dbInstance = null;

function getDbPath() {
    const raw = process.env.JOBS_DB_PATH;
    if (!raw) return DEFAULT_DB_PATH;
    return path.isAbsolute(raw) ? raw : path.resolve(raw);
}

function ensureDir(p) {
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Columns stored as JSON text in SQLite
const JSON_COLS = [
    "shortlisted_users",
    "dm_shortlist_pending",
    "priority_reaction_user_ids",
    "prior_shortlist_user_ids",
    "previous_claimers",
];

function initSchema(db) {
    db.exec(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS jobs (
            id                        INTEGER PRIMARY KEY AUTOINCREMENT,
            title                     TEXT    NOT NULL DEFAULT '',
            description               TEXT,
            emoji                     TEXT,
            channel_id                TEXT,
            status                    TEXT    NOT NULL DEFAULT 'open',
            expire_at                 TEXT,
            message_id                TEXT,
            assigned_user             TEXT,
            assigned_user_id          TEXT,
            shortlisted_users         TEXT    NOT NULL DEFAULT '[]',
            shortlist_limit           INTEGER NOT NULL DEFAULT 10,
            dm_shortlist_pending      TEXT    NOT NULL DEFAULT '[]',
            priority_reaction_user_ids TEXT   NOT NULL DEFAULT '[]',
            is_repost                 INTEGER NOT NULL DEFAULT 0,
            prior_shortlist_user_ids  TEXT    NOT NULL DEFAULT '[]',
            previous_claimers         TEXT    NOT NULL DEFAULT '[]',
            created_at                TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS candidate_metrics (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         TEXT    NOT NULL UNIQUE,
            username        TEXT,
            completed_count INTEGER NOT NULL DEFAULT 0,
            canceled_count  INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
        );
    `);
}

export function getJobsDb() {
    if (dbInstance) return dbInstance;
    const dbPath = getDbPath();
    ensureDir(dbPath);
    dbInstance = new Database(dbPath);
    initSchema(dbInstance);
    return dbInstance;
}

function deserializeJob(row) {
    if (!row) return null;
    const out = { ...row };
    for (const col of JSON_COLS) {
        if (typeof out[col] === "string") {
            try {
                out[col] = JSON.parse(out[col]);
            } catch {
                out[col] = [];
            }
        }
        if (!Array.isArray(out[col])) out[col] = [];
    }
    out.is_repost = Boolean(out.is_repost);
    return out;
}

function serializeJobData(data) {
    const out = { ...data };
    for (const col of JSON_COLS) {
        if (col in out && typeof out[col] !== "string") {
            out[col] = JSON.stringify(out[col] ?? []);
        }
    }
    if ("is_repost" in out) out.is_repost = out.is_repost ? 1 : 0;
    return out;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export function insertJob(data) {
    const db = getJobsDb();
    const s = serializeJobData(data);
    const cols = Object.keys(s);
    const placeholders = cols.map(() => "?").join(", ");
    const result = db
        .prepare(`INSERT INTO jobs (${cols.join(", ")}) VALUES (${placeholders})`)
        .run(...Object.values(s));
    return getJobById(result.lastInsertRowid);
}

export function getJobById(id) {
    const db = getJobsDb();
    return deserializeJob(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id));
}

export function getJobByMessageId(messageId) {
    const db = getJobsDb();
    return deserializeJob(
        db.prepare("SELECT * FROM jobs WHERE message_id = ?").get(messageId),
    );
}

export function listJobs({ orderByDesc = true } = {}) {
    const db = getJobsDb();
    const order = orderByDesc ? "DESC" : "ASC";
    return db
        .prepare(`SELECT * FROM jobs ORDER BY id ${order}`)
        .all()
        .map(deserializeJob);
}

export function listJobsByStatus(status) {
    const db = getJobsDb();
    return db
        .prepare("SELECT * FROM jobs WHERE status = ?")
        .all(status)
        .map(deserializeJob);
}

export function listJobsByStatuses(statuses) {
    const db = getJobsDb();
    const placeholders = statuses.map(() => "?").join(", ");
    return db
        .prepare(`SELECT * FROM jobs WHERE status IN (${placeholders})`)
        .all(...statuses)
        .map(deserializeJob);
}

export function listOpenJobsWithShortlists() {
    const db = getJobsDb();
    return db
        .prepare("SELECT id, shortlisted_users FROM jobs WHERE status = 'open'")
        .all()
        .map(deserializeJob);
}

export function listUnpostedOpenJobs() {
    const db = getJobsDb();
    // Compare against an ISO timestamp param rather than datetime('now') because
    // SQLite's native datetime format ("YYYY-MM-DD HH:MM:SS") sorts differently
    // from the ISO strings we store ("YYYY-MM-DDTHH:MM:SS.sssZ"), causing the
    // 'T' character (ASCII 84) to always beat the space (ASCII 32).
    const now = new Date().toISOString();
    return db
        .prepare(`
            SELECT * FROM jobs
            WHERE status = 'open'
            AND (message_id IS NULL OR message_id = '')
            AND (expire_at IS NULL OR expire_at > ?)
        `)
        .all(now)
        .map(deserializeJob);
}

export function updateJob(id, data) {
    const db = getJobsDb();
    const s = serializeJobData(data);
    const sets = Object.keys(s)
        .map((k) => `${k} = ?`)
        .join(", ");
    db.prepare(`UPDATE jobs SET ${sets} WHERE id = ?`).run(...Object.values(s), id);
    return getJobById(id);
}

// ─── Candidate Metrics ───────────────────────────────────────────────────────

export function listMetrics() {
    const db = getJobsDb();
    return db
        .prepare("SELECT * FROM candidate_metrics ORDER BY completed_count DESC")
        .all();
}

export function incrementMetric(userId, username, type) {
    const db = getJobsDb();
    const isCompleted = type === "completed" ? 1 : 0;
    const isCanceled = type === "canceled" || type === "cancelled" ? 1 : 0;
    db.prepare(`
        INSERT INTO candidate_metrics (user_id, username, completed_count, canceled_count)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            username        = excluded.username,
            completed_count = completed_count + excluded.completed_count,
            canceled_count  = canceled_count  + excluded.canceled_count,
            updated_at      = datetime('now')
    `).run(userId, username, isCompleted, isCanceled);
}
