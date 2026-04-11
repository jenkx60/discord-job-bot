import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request) {
    try {
        const { jobId, candidateInfo } = await request.json()
        if (!jobId || !candidateInfo) return Response.json({ success: false, error: "Missing data" }, { status: 400 })

        // update the job
        const { error } = await supabaseAdmin
            .from("jobs")
            .update({ status: "completed"})
            .eq("id", jobId)
        if (error) throw error;

        // DM the user natively
        const match = candidateInfo.match(/(.+) \((\d+)\)/)
        if (match && process.env.DISCORD_BOT_TOKEN) {
            const userId = match[2].trim();
            const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json"
                },
                body: JSON.stringify({ recipient_id: userId })
            });
            if (channelRes.ok) {
                const channelData = await channelRes.json();
                await fetch(`https://discord.com/api/v10/channels/${channelData.id}/messages`, {
                    method: "POST",
                    headers: { "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ content: "Job completed" })
                });
            }
        }
        return Response.json({ success: true })
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
    }
}