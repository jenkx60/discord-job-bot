const { Client, GatewayIntentBits } = require("discord.js")
const { supabase } = require("../lib/supabase")

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ]
})

client.login(process.env.DISCORD_BOT_TOKEN)

module.exports = client

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return

    const messageId = reaction.message.id

    const { data: job } = await supabase
        .from("jobs")
        .select("*")
        .eq("message_id", messageId)
        .single()

    if (!job) return

    if (job.status !== "open") return

    if (reaction.emoji.name !== job.emoji) return

    if (job.previous_claimers?.includes(user.id)) return

    await supabase
        .from("jobs")
        .update({
            status: "assigned",
            assigned_user: user.id,
            // previous_claimers: [...(job.previous_claimers || []), user.id]
        })
        .eq("id", job.id)

    await reaction.message.reply(
        `Job assigned to ${user.username}!`
    )
})

setInterval(async () => {
    const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")

    const now = new Date()

    jobs.forEach(async (job) => {
        if (new Date(job.expire_at) < now) {
            await supabase
                .from("jobs")
                .update({ status: "expired" })
                .eq("id", job.id)

            alert("Job expired:", job.description)
        }
    })
}, 60000)