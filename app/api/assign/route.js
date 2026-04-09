import { supabaseAdmin } from "@/lib/supabaseAdmin"
export async function POST(request) {
    try {
        const body = await request.json()
        const { jobId, candidateInfo } = body

        if (!jobId || !candidateInfo) {
            return Response.json({ success: false, error: "Missing jobId or candidateInfo" }, { status: 400 })
        }

        // candidateInfo = "jenkins7904 (123456789012345678)"
        // extract username and id
        const match = candidateInfo.match(/(.+) \((\d+)\)/)
        let assignedUsername = candidateInfo;
        let assignedUserId = null;

        if (match) {
            assignedUsername = match[1].trim();
            assignedUserId = match[2].trim();
        }

        // Update the job in supabase
        const { data, error } = await supabaseAdmin
            .from("jobs")
            .update({ assigned_user: assignedUsername, assigned_user_id: assignedUserId, status: "assigned" })
            .eq("id", jobId)
            .select()
            .single()

        if (error) {
            throw error
        }

        return Response.json({ success: true, job: data })
    } catch (error) {
        console.error("Error assigning job:", error)
        return Response.json({ success: false, error: error.message }, { status: 500 })
    }
}