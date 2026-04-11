import { supabaseAdmin } from "../../../lib/supabaseAdmin"

export async function POST(request) {
    try {
        const { jobId, candidateInfo } = await request.json()

        // fetch current job array
        const { data: job } = await supabaseAdmin
            .from("jobs")
            .select("shortlisted_users")
            .eq("id", jobId)
            .single();

        // filter the candidate out completely
        let updatedCandidate = Array.isArray(job.shortlisted_users) ? job.shortlisted_users : [];
        updatedCandidate = updatedCandidate.filter(c => c !== candidateInfo);

        // Reset the job status to open
        const { error } = await supabaseAdmin
            .from("jobs")
            .update({
                status: "open",
                assigned_user: null,
                assigned_user_id: null,
                shortlisted_users: updatedCandidate
            })
            .eq("id", jobId)

        if (error) throw error;

        // DM user directly
        const match = candidateInfo.match(/(.+) \((\d+)\)/);
        if (match && process.env.DISCORD_BOT_TOKEN) {
            const userId = match[2].trim();
            const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
                method: "POST",
                headers: {
                    "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ recipient_id: userId })
            });

            if (channelRes.ok) {
                const channelData = await channelRes.json();
                await fetch(`https://discord.com/api/v10/channels/${channelData.id}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bot ${process.env.DISCORD_BOT_TOKEN}`, 
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ content: "❌ Your assignment for the job has been **Canceled** by the admin. You have been removed from the shortlist."})
                });
            }
        }
        return Response.json({ success: true })
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
    }
}