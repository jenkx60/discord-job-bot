import { postJob } from "../../../lib/jobManager"
import { supabase } from "../../../lib/supabase"

export async function POST(request) {
    const { jobId } = await request.json()

    // Get Job
    const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single()
    
    if (!job) {
        return Response.json({ error: "Job not found" })
    }

    // add assigned user to previous claimers
    let previousClaimers = job.previous_claimers || []

    if (job.assigned_user) {
        previousClaimers.push(job.assigned_user)
    }

    // Reset job
    const { data: updatedJob } = await supabase
        .from("jobs")
        .update({
            status: "open",
            assigned_user: null,
            previous_claimers: previousClaimers,
        })
        .eq("id", jobId)
        .select()
        .single()

    // Post again to Discord
    await postJob(updatedJob)

    return Response.json({ success: true })
}