import { updateJob } from "@/lib/db/jobs";

async function sendDiscordAssignmentNotification({ userId, title, description }) {
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken || !userId) return false;

    const dmChannelResponse = await fetch("https://discord.com/api/v10/users/@me/channels", {
        method: "POST",
        headers: {
            Authorization: `Bot ${botToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipient_id: userId }),
    });

    if (!dmChannelResponse.ok) return false;

    const dmChannel = await dmChannelResponse.json();
    if (!dmChannel?.id) return false;

    const messageResponse = await fetch(
        `https://discord.com/api/v10/channels/${dmChannel.id}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bot ${botToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                content: `✅ You have been assigned to a job${title?.trim() ? `: **${title.trim()}**` : ""}:\n\n${description}\n\nPlease get started and reach out to the admin if you need clarification.`,
            }),
        },
    );

    return messageResponse.ok;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { jobId, candidateInfo } = body;

        if (!jobId || !candidateInfo) {
            return Response.json(
                { success: false, error: "Missing jobId or candidateInfo" },
                { status: 400 },
            );
        }

        const match = candidateInfo.match(/(.+) \((\d+)\)/);
        let assignedUsername = candidateInfo;
        let assignedUserId = null;

        if (match) {
            assignedUsername = match[1].trim();
            assignedUserId = match[2].trim();
        }

        const data = updateJob(jobId, {
            assigned_user: assignedUsername,
            assigned_user_id: assignedUserId,
            status: "assigned",
        });

        let notificationSent = false;
        try {
            notificationSent = await sendDiscordAssignmentNotification({
                userId: assignedUserId,
                title: data?.title ?? "",
                description: data?.description ?? "New assignment",
            });
        } catch (notificationError) {
            console.error("Failed to notify assigned user:", notificationError);
        }

        return Response.json({ success: true, job: data, notificationSent });
    } catch (error) {
        console.error("Error assigning job:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
