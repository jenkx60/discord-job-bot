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

    channel.send("**Bot is fully active and monitoring jobs.**")
})

// Job Claiming via Reaction
client.on("messageReactionAdd", async (reaction, user) => {
    if (user.bot) return


    // fetch the job record from the database
    const { data: job } = await db
        .from("jobs")
        .select("*")
        .eq("message_id", reaction.message.id)
        .single()

    if (!job || job.status !== "open") return

    // to claim jobs only if status is open
    const { data, error: updateError } = await db
        .from("jobs")
        .update({
            status: "assigned",
            assigned_user: user.username,
            assigned_user_id: user.id,
            emojis: reaction.emoji.name
        })
        .eq("id", job.id)
        .eq("status", "open") // this ensures the second reactions from a different users fails the db update
        .select()

        if (updateError) {
            console.error(`[Bot] Error assigning job ${job.id}:`, updateError)
        return
        }

        // Only the first user to react will get the job and success message
        if (data && data.length > 0) {
            await reaction.message.reply(`🚀 **Job Claimed!**\n<@${user.id}> was the first to react and has been assigned to: "${job.description}".`)
        } else {
            await reaction.message.reply(`❌ **Job already claimed.**`)
        }
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
            const remainingMins = Math.round((expireAt - now) / 30000)
            
            // console.log(`[Bot] Posting job. Now: ${now.toISOString()}, ExpireAt: ${job.expire_at}, Remaining: ${remainingMins}m`)

            const message = await channel.send(
                `🚀 **New Freelance Job**\n${job.description}\n\nReact with any emoji to claim. Time window: ${remainingMins}m`
            )
            // await message.react(job.emoji)

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