#!/usr/bin/env node
/**
 * One-shot migration: copies all rows from your Supabase project
 * (jobs + candidate_metrics) into the local SQLite database.
 *
 * Run ONCE on the server before switching over:
 *   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
 *   NEXT_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/migrate-from-supabase.js
 *
 * The script is safe to run multiple times — existing rows are skipped
 * (INSERT OR IGNORE), so it won't create duplicates.
 */

import { createClient } from "@supabase/supabase-js";
import { getJobsDb } from "../lib/db/jobs.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_SUPABASE_SERVICE_ROLE_KEY environment variables.",
    );
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JSON_COLS = [
    "shortlisted_users",
    "dm_shortlist_pending",
    "priority_reaction_user_ids",
    "prior_shortlist_user_ids",
    "previous_claimers",
];

function toJsonText(val) {
    if (typeof val === "string") return val;
    if (val === null || val === undefined) return "[]";
    return JSON.stringify(val);
}

async function migrateJobs(db) {
    console.log("[migrate] Fetching jobs from Supabase…");
    const { data, error } = await supabase.from("jobs").select("*");
    if (error) {
        console.error("[migrate] Error fetching jobs:", error.message);
        return 0;
    }

    const insert = db.prepare(`
        INSERT OR IGNORE INTO jobs (
            id, title, description, emoji, channel_id, status, expire_at,
            message_id, assigned_user, assigned_user_id,
            shortlisted_users, shortlist_limit,
            dm_shortlist_pending, priority_reaction_user_ids,
            is_repost, prior_shortlist_user_ids, previous_claimers,
            created_at
        ) VALUES (
            @id, @title, @description, @emoji, @channel_id, @status, @expire_at,
            @message_id, @assigned_user, @assigned_user_id,
            @shortlisted_users, @shortlist_limit,
            @dm_shortlist_pending, @priority_reaction_user_ids,
            @is_repost, @prior_shortlist_user_ids, @previous_claimers,
            @created_at
        )
    `);

    const insertMany = db.transaction((rows) => {
        for (const row of rows) insert.run(row);
    });

    const mapped = (data || []).map((row) => ({
        id: row.id,
        title: row.title ?? "",
        description: row.description ?? null,
        emoji: row.emoji ?? null,
        channel_id: row.channel_id ?? null,
        status: row.status ?? "open",
        expire_at: row.expire_at ?? null,
        message_id: row.message_id ?? null,
        assigned_user: row.assigned_user ?? null,
        assigned_user_id: row.assigned_user_id ?? null,
        shortlisted_users: toJsonText(row.shortlisted_users),
        shortlist_limit: row.shortlist_limit ?? 10,
        dm_shortlist_pending: toJsonText(row.dm_shortlist_pending),
        priority_reaction_user_ids: toJsonText(row.priority_reaction_user_ids),
        is_repost: row.is_repost ? 1 : 0,
        prior_shortlist_user_ids: toJsonText(row.prior_shortlist_user_ids),
        previous_claimers: toJsonText(row.previous_claimers),
        created_at: row.created_at ?? new Date().toISOString(),
    }));

    insertMany(mapped);
    console.log(`[migrate] Jobs migrated: ${mapped.length}`);
    return mapped.length;
}

async function migrateMetrics(db) {
    console.log("[migrate] Fetching candidate_metrics from Supabase…");
    const { data, error } = await supabase.from("candidate_metrics").select("*");
    if (error) {
        console.error("[migrate] Error fetching candidate_metrics:", error.message);
        return 0;
    }

    const insert = db.prepare(`
        INSERT OR IGNORE INTO candidate_metrics (
            user_id, username, completed_count, canceled_count, created_at, updated_at
        ) VALUES (
            @user_id, @username, @completed_count, @canceled_count, @created_at, @updated_at
        )
    `);

    const insertMany = db.transaction((rows) => {
        for (const row of rows) insert.run(row);
    });

    const mapped = (data || []).map((row) => ({
        user_id: row.user_id ?? row.target_user_id ?? String(row.id),
        username: row.username ?? row.target_username ?? null,
        completed_count: row.completed_count ?? 0,
        canceled_count: row.canceled_count ?? row.cancelled_count ?? 0,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at: row.updated_at ?? new Date().toISOString(),
    }));

    insertMany(mapped);
    console.log(`[migrate] Candidate metrics migrated: ${mapped.length}`);
    return mapped.length;
}

async function main() {
    const db = getJobsDb();

    const jobs = await migrateJobs(db);
    const metrics = await migrateMetrics(db);

    console.log(`\n✅ Migration complete — ${jobs} jobs, ${metrics} candidate_metrics rows.`);
    console.log("You can now remove the Supabase environment variables from your .env file.");
}

main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
