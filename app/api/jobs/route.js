import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request) {
    const body = await request.json()

    // Calculate expiration if not provided
    const expireAt = body.expire_at || new Date(Date.now() + 60 * 60000).toISOString()

    const { data: job, error } = await supabaseAdmin
        .from("jobs")
        .insert({
            description: body.description,
            emoji: body.emoji,
            channel_id: body.channel,
            status: "open",
            expire_at: expireAt,
            message_id: null, // Will be filled by the bot process after it posts to Discord
            shortlisted_users: [],
            shortlist_limit: body.shortlist_limit ?? 10,
        })
        .select()
        .single()

    if (error) {
        console.error("Supabase Insert Error:", error)
        return Response.json({ success: false, error }, { status: 500 })
    }

    return Response.json({ success: true, job })
}