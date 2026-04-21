import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { repostJob } from "@/lib/repostJob"

export async function POST(request) {
    const { jobId } = await request.json()

    if (!jobId) {
        return Response.json({ success: false, error: "Missing jobId" }, { status: 400 })
    }

    const result = await repostJob(supabaseAdmin, jobId)

    if (!result.ok) {
        return Response.json(
            { success: false, error: result.error?.message || String(result.error) },
            { status: 404 },
        )
    }

    return Response.json({ success: true })
}
