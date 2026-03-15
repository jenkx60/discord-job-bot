require("dotenv").config()

const { Client, GatewayIntentBits } = require("discord.js")
const { createClient } = require("@supabase/supabase-js")

const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
    ]
})

// Ready

client.once("ready", async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`)

    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID)

    if (!channel) {
        console.log("Channel not found")
        return
    }

    channel.send("Bot is fully active")
})

// Job Claiming via Reaction

client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return

    // Fetch full reaction
    // if (reaction.partial) {
    //     try { await reaction.fetch() } catch { return }
    // }

    const { data: job } = await db
        .from("jobs")
        .select("*")
        .eq("message_id", reaction.message.id)
        .single()

    if (!job) return
    console.log(`[Bot] Claim attempt on job ${job.id}. Columns available:`, Object.keys(job))
    if (job.status !== "open") return
    
    // Capture the emoji used by the user
    const claimingEmoji = reaction.emoji.name;
    
    // if (job.previous_claimers?.includes(user.id)) {
    //     console.log(`[Bot] User ${user.username} (${user.id}) blocked — already claimed this job before.`)
    //     // Do not send notification for previous claimers as per user request
    //     return
    // }

    // Notify the channel about the reaction
    try {
        const channel = await client.channels.fetch(job.channel_id)
        if (channel) {
            await channel.send(`this user <@${user.id}> reacted to the message`)
        }
    } catch (err) {
        console.error(`[Bot] Failed to send reaction notification for job ${job.id}:`, err)
    }

    // The previousClaimers declaration was not duplicated, so it remains.
    const previousClaimers = [...(job.previous_claimers || []), user.id]

    console.log(`[Bot] Attempting update for job ${job.id}. Assigned User: ${user.username}, ID: ${user.id}`)

    const { error: updateError } = await db
        .from("jobs")
        .update({
            status: "assigned",
            assigned_user: user.username, 
            assigned_user_id: user.id,   
            previous_claimers: previousClaimers,
            emoji: claimingEmoji, 
        })
        .eq("id", job.id)

    if (updateError) {
        console.error(`[Bot] Error assigning job ${job.id}:`, updateError)
        await reaction.message.reply(`❌ **Error assigning job.** Please contact an admin.`)
        return
    }

    await reaction.message.reply(`🚀 **Job Claimed!**\n<@${user.id}> was the first to react and has been assigned to: "${job.description}".`)
    console.log(`[Bot] Job "${job.description}" assigned to ${user.username} (ID: ${user.id})`)
})

// New Job Poller (every 5 seconds)

setInterval(async () => {
    // Find open jobs that haven't been posted to Discord yet (message_id is null)
    const { data: jobs } = await db
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .is("message_id", null)

    if (!jobs || jobs.length === 0) return

    for (const job of jobs) {
        try {
            const channel = await client.channels.fetch(job.channel_id)
            if (!channel) continue

            // Post to Discord
            const now = new Date()
            const expireAt = new Date(job.expire_at)
            const remainingMins = Math.round((expireAt - now) / 60000)
            
            console.log(`[Bot] Posting job. Now: ${now.toISOString()}, ExpireAt: ${job.expire_at}, Remaining: ${remainingMins}m`)

            const message = await channel.send(
                `🚀 **New Freelance Job**\n${job.description}\n\nReact with any emoji to claim. Time window: ${remainingMins}m`
            )
            await message.react(job.emoji)

            // Save message ID back to DB
            await db
                .from("jobs")
                .update({ message_id: message.id })
                .eq("id", job.id)

            console.log(`[Bot] Posted new job to Discord: "${job.description}" (msg: ${message.id})`)
        } catch (err) {
            console.error(`[Bot] Failed to post job ${job.id}:`, err)
        }
    }
}, 5000)

// Expiration Scheduler (every 60 seconds)

setInterval(async () => {
    const { data: jobs } = await db
        .from("jobs")
        .select("*")
        .eq("status", "open")

    if (!jobs || jobs.length === 0) return

    const now = new Date()
    for (const job of jobs) {
        const expireAt = new Date(job.expire_at)
        
        if (expireAt < now) {
            await db
                .from("jobs")
                .update({ status: "expired" })
                .eq("id", job.id)

            console.log(`[Expiry] Job expired: "${job.description}" (id: ${job.id})`)

            try {
                const channel = await client.channels.fetch(job.channel_id)
                if (channel) {
                    await channel.send(`⚠️ **Job Expired**\nThe timeframe for "${job.description}" has expired. Awaiting admin approval to repost.`)
                }
            } catch (err) {
                console.error(`[Expiry] Failed to notify channel for job ${job.id}:`, err)
            }
        }
    }
}, 60000)

// Login

client.login(process.env.DISCORD_BOT_TOKEN)