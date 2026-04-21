/**
 * Reset a job for a fresh Discord post: open, unassigned, new expiry, clear shortlist.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {string} jobId
 * @param {{ previousClaimantId?: string | null }} [options] - e.g. user id just removed from assignment (for previous_claimers)
 */
export async function repostJob(supabase, jobId, options = {}) {
    const { previousClaimantId = null } = options

    const { data: job, error: fetchError } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single()

    if (fetchError || !job) {
        return { ok: false, error: "Job not found" }
    }

    let previousClaimers = Array.isArray(job.previous_claimers) ? [...job.previous_claimers] : []
    const claimantId = previousClaimantId ?? job.assigned_user_id ?? job.assigned_user

    if (claimantId && !previousClaimers.includes(claimantId)) {
        previousClaimers.push(claimantId)
    }

    const newExpireAt = new Date(Date.now() + 60 * 60000).toISOString()

    const { error: updateError } = await supabase
        .from("jobs")
        .update({
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
        })
        .eq("id", jobId)

    if (updateError) {
        return { ok: false, error: updateError }
    }

    return { ok: true, job }
}
