/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, GatewayIntentBits } = require("discord.js")
const { supabaseAdmin } = require("../lib/supabaseAdmin")

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

// ─── Job Claiming via Reaction ───────────────────────────────────────────────

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return

    const messageId = reaction.message.id

    const { data: job } = await supabaseAdmin
        .from("jobs")
        .select("*")
        .eq("message_id", messageId)
        .single()

    if (!job) return

    // Only accept reactions on open jobs
    if (job.status !== "open") return

    // Only accept matching emoji
    if (reaction.emoji.name !== job.emoji) return

    // Block users who previously claimed this job
    if (job.previous_claimers?.includes(user.id)) return

    // Add previous assigned_user to previous_claimers (if any)
    const previousClaimers = job.previous_claimers || []
    if (!previousClaimers.includes(user.id)) {
        previousClaimers.push(user.id)
    }

    await supabaseAdmin
        .from("jobs")
        .update({
            status: "assigned",
            assigned_user: user.id,
            previous_claimers: previousClaimers,
        })
        .eq("id", job.id)

    await reaction.message.reply(`Job assigned to <@${user.id}>!`)
})

// ─── Expiration Scheduler (runs every 60 seconds) ────────────────────────────

setInterval(async () => {
    const { data: jobs } = await supabaseAdmin
        .from("jobs")
        .select("*")
        .eq("status", "open")

    if (!jobs || jobs.length === 0) return

    const now = new Date()

    for (const job of jobs) {
        if (new Date(job.expire_at) < now) {
            await supabaseAdmin
                .from("jobs")
                .update({ status: "expired" })
                .eq("id", job.id)

            console.log(`[Expiry] Job expired: "${job.description}" (id: ${job.id})`)
        }
    }
}, 60000)

const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID)
channel.send("Bot is fully active")