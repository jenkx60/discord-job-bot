export async function GET() {
    const token = process.env.DISCORD_BOT_TOKEN;
    const defaultChannelId = process.env.DISCORD_CHANNEL_ID; // The bot must be in at least this channel to derive the server

    if (!token || !defaultChannelId) {
        return Response.json({ success: false, error: "Missing bot token or default channel ID" }, { status: 500 });
    }

    try {
        // 1. Fetch our known default channel to find out which Discord Server (Guild) we belong to
        const channelRes = await fetch(`https://discord.com/api/v10/channels/${defaultChannelId}`, {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 3600 } // Cache this fetch safely to save rate limits
        });
        
        if (!channelRes.ok) throw new Error("Failed to fetch initial channel. Bot might lack access.");
        const channelData = await channelRes.json();
        const guildId = channelData.guild_id;

        if (!guildId) throw new Error("This channel is not inside a server (guild).");

        // 2. Fetch ALL channels inside that server
        const guildChannelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 300 } // Cache channels list for 5 minutes
        });

        if (!guildChannelsRes.ok) throw new Error("Failed to fetch guild channels");
        const allChannels = await guildChannelsRes.json();

        // 3. Filter to ONLY include Text Channels (type: 0) and Announcement Channels (type: 5)
        const textChannels = allChannels
            .filter(c => c.type === 0 || c.type === 5)
            .map(c => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically for UX

        return Response.json({ success: true, channels: textChannels });
    } catch (error) {
        console.error("API Channels Error:", error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
