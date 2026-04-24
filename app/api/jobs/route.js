import { insertJob } from "@/lib/db/jobs";

export async function POST(request) {
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
        return Response.json(
            { success: false, error: { message: "Title is required" } },
            { status: 400 },
        );
    }

    const expireAt = body.expire_at || new Date(Date.now() + 60 * 60000).toISOString();

    try {
        const job = insertJob({
            title,
            description: body.description,
            emoji: body.emoji,
            channel_id: body.channel,
            status: "open",
            expire_at: expireAt,
            message_id: null,
            shortlisted_users: [],
            shortlist_limit: body.shortlist_limit ?? 10,
            is_repost: false,
            prior_shortlist_user_ids: [],
        });

        return Response.json({ success: true, job });
    } catch (error) {
        console.error("DB Insert Error:", error);
        return Response.json({ success: false, error: { message: error.message } }, { status: 500 });
    }
}
