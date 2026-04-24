import { updateJob, incrementMetric } from "@/lib/db/jobs";

export async function POST(request) {
    try {
        const { jobId, candidateInfo } = await request.json();
        if (!jobId || !candidateInfo) {
            return Response.json({ success: false, error: "Missing data" }, { status: 400 });
        }

        const completedJob = updateJob(jobId, { status: "completed" });

        const match = candidateInfo.match(/(.+) \((\d+)\)/);
        if (match && process.env.DISCORD_BOT_TOKEN) {
            const userId = match[2].trim();
            const channelRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
                method: "POST",
                headers: {
                    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ recipient_id: userId }),
            });
            if (channelRes.ok) {
                const channelData = await channelRes.json();
                const jobTitle = completedJob?.title?.trim();
                const jobDescription = completedJob?.description ?? "No description provided.";
                const completionMessage =
                    `✅ Job completed: **${jobTitle}**\n\n` +
                    `${jobDescription}\n\n` +
                    `Thank you for your work on this assignment.`;
                await fetch(
                    `https://discord.com/api/v10/channels/${channelData.id}/messages`,
                    {
                        method: "POST",
                        headers: {
                            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ content: completionMessage }),
                    },
                );
            }
        }

        const userIdMatch = candidateInfo.match(/\((\d+)\)/);
        const userId = userIdMatch ? userIdMatch[1] : candidateInfo;
        const username = candidateInfo.split(" (")[0];

        incrementMetric(userId, username, "completed");

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
