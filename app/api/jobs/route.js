import { postJob } from "../../../lib/jobManager"
import { supabase } from "../../../lib/supabase"

export async function POST(request) {
    const body = await request.json()

    const { data: job } = await supabase
        .from("jobs")
        .insert({
            description: body.description,
            emoji: body.emoji,
            channel_id: body.channel,
            status: "open",
            expire_at: body.expire_at
        })
        .select()
        .single()

    await postJob(job)

    return Response.json({ success: true })
}