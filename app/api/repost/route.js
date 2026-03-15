import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request) {
    const { jobId } = await request.json()

    // Get Job
    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single()
    
    if (!job) {
        return Response.json({ error: "Job not found" })
    }

    // add assigned user ID to previous claimers (using ID for consistency in blocking)
    let previousClaimers = job.previous_claimers || []
    const claimantId = job.assigned_user_id || job.assigned_user // Fallback to username if ID is missing

    if (claimantId && !previousClaimers.includes(claimantId)) {
        previousClaimers.push(claimantId)
    }

    // Reset job
    const newExpireAt = new Date(Date.now() + 60 * 60000).toISOString() // Reset to 60 minutes from now

    await supabaseAdmin
        .from("jobs")
        .update({
            status: "open",
            assigned_user: null,
            assigned_user_id: null,
            previous_claimers: previousClaimers,
            message_id: null,
            expire_at: newExpireAt, 
        })
        .eq("id", jobId)

    return Response.json({ success: true })
}