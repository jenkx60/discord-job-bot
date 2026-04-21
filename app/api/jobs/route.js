import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request) {
    const body = await request.json()

    const title = typeof body.title === "string" ? body.title.trim() : ""
    if (!title) {
        return Response.json({ success: false, error: { message: "Title is required" } }, { status: 400 })
    }

    // Calculate expiration if not provided
    const expireAt = body.expire_at || new Date(Date.now() + 60 * 60000).toISOString()

    const { data: job, error } = await supabaseAdmin
        .from("jobs")
        .insert({
            title,
            description: body.description,
            emoji: body.emoji,
            channel_id: body.channel,
            status: "open",
            expire_at: expireAt,
            message_id: null, // Will be filled by the bot process after it posts to Discord
            shortlisted_users: [],
            shortlist_limit: body.shortlist_limit ?? 10,
            is_repost: false,
            prior_shortlist_user_ids: [],
        })
        .select()
        .single()

    if (error) {
        console.error("Supabase Insert Error:", error)
        return Response.json({ success: false, error }, { status: 500 })
    }

    return Response.json({ success: true, job })
}