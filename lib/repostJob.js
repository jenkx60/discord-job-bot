import { getJobById, updateJob } from "./db/jobs.js";

/**
 * Reset a job for a fresh Discord post: open, unassigned, new expiry, clear shortlist.
 * @param {string|number} jobId
 * @param {{ previousClaimantId?: string | null }} [options]
 */
export async function repostJob(jobId, options = {}) {
    const { previousClaimantId = null } = options;

    const job = getJobById(jobId);
    if (!job) {
        return { ok: false, error: "Job not found" };
    }

    let previousClaimers = Array.isArray(job.previous_claimers)
        ? [...job.previous_claimers]
        : [];
    const claimantId = previousClaimantId ?? job.assigned_user_id ?? job.assigned_user;

    if (claimantId && !previousClaimers.includes(claimantId)) {
        previousClaimers.push(claimantId);
    }

    const newExpireAt = new Date(Date.now() + 60 * 60000).toISOString();

    try {
        updateJob(jobId, {
            status: "open",
            assigned_user: null,
            assigned_user_id: null,
            previous_claimers: previousClaimers,
            message_id: null,
            expire_at: newExpireAt,
            shortlisted_users: [],
            dm_shortlist_pending: [],
            priority_reaction_user_ids: [],
            is_repost: true,
            prior_shortlist_user_ids: [],
        });
    } catch (err) {
        return { ok: false, error: err };
    }

    return { ok: true, job };
}
