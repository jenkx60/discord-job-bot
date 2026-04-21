import "dotenv/config"
import { Client, GatewayIntentBits, Partials, ChannelType } from "discord.js"
import { createClient } from "@supabase/supabase-js"

const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    // this tells the bot to pay attention to old messages it forgot about
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
})

// Per-job queue to prevent race conditions when multiple users react at the same time.
// Each job ID maps to a Promise chain so reactions are processed one at a time.
const jobQueues = new Map()

function enqueueForJob(jobId, task) {
    const current = jobQueues.get(jobId) || Promise.resolve()
    const next = current.then(task).catch((err) => {
        console.error(`[Queue] Error processing reaction for job ${jobId}:`, err)
    })
    jobQueues.set(jobId, next)
    // Clean up the queue entry once the chain settles so the Map doesn't grow forever
    next.finally(() => {
        if (jobQueues.get(jobId) === next) {
            jobQueues.delete(jobId)
        }
    })
}

// Rate Limittin to prevent Bot spamming
const reactionRateLimits = new Map();

function isRateLimited(userId) {
    const now = Date.now();
    const lastAction = reactionRateLimits.get(userId);

    // a 5 second cooldown between actions
    if (lastAction && now - lastAction < 5000) {
        return true;
    }
    reactionRateLimits.set(userId, now);
    return false;
}

// Ready
client.once("ready", async () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`)

    const channelId = process.env.DISCORD_CHANNEL_ID
    if (!channelId) {
        console.error("DISCORD_CHANNEL_ID is not defined in .env")
        return
    }

    // if (user.bot) return

    // if (isRateLimited(user.id)) {
    //     try {
    //         await user.send("⏳ You are clicking too fast! Please wait a few seconds before trying again.");
    //     } catch (error) {
    //         return;
    //     }
    // }

    // Test to know if bot is active
    // try {
    //     const channel = await client.channels.fetch(channelId)
    //     if (channel) {
    //         channel.send("**Bot is fully active and monitoring jobs.**")
    //     } else {
    //         console.log(`Channel with ID ${channelId} not found`)
    //     }
    // } catch (err) {
    //     console.error("Failed to fetch channel or send message:", err)
    // }
})

// Shortlist via Reaction
// client.on("messageReactionAdd", async (reaction, user) => {
//     console.log("Reaction added. Am I seeing this?")
//     // If the message is old or partial, we need to fetch it
//     if (reaction.partial) {
//         try {
//             await reaction.fetch()
//         } catch (error) {
//             console.error("Something went wrong when fetching the reaction:", error)
//             return
//         }
//     }

//     if (user.partial) {
//         try {
//             await user.fetch()
//         } catch (error) {
//             console.error("Something went wrong when fetching the user:", error)
//             return
//         }
//     }

//     console.log(`Reaction Event The reaction was by ${user.tag}`);

//     // Ignore bot reactions
//     if (user.bot) return;

//     if (reaction.partial) {
//         try {
//             await reaction.fetch();
//         } catch (error) {
//             console.error("Something went wrong when fetching the reaction:", error);
//             return;
//         }
//     }

//     // Anti-spam Check
//     if (isRateLimited(user.id)) return; // fail silently on remove to prevent DM spam

//     //1. fetch job record
//     const { data: job, error } = await db
//         .from("jobs")
//         .select("*")
//         .eq("message_id", reaction.message.id)
//         .single();

//     if (error || !job) return;

//     const candidateInfo = `${user.username} (${user.id})`;

//     //2. Parse current list safely
//     let rawUsers = job.shortlisted_users;
//     let shortlistedUsers = [];

//     if (Array.isArray(rawUsers)) {
//         shortlistedUsers = rawUsers;
//     } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
//         try {
//             shortlistedUsers = JSON.parse(rawUsers);
//             if (!Array.isArray(shortlistedUsers))
//                 shortlistedUsers = [rawUsers];
//         } catch (e) {
//             shortlistedUsers = [rawUsers];
//         }
//     }

//     // Check if user already shortlisted
//     if (!shortlistedUsers.includes(candidateInfo))
//         return;

//     // 3. Filter them out perfectly
//     const updatedList = shortlistedUsers.filter(u => u !== candidateInfo);

//     // 4. Update the database
//     const { error: updateError } = await db
//         .from("jobs")
//         .update({ shortlisted_users: updatedList })
//         .eq("id", job.id);

//     if (updateError) {
//         console.error(`[Bot] Failed to update shortlisted removal for job ${job.id}:`, updateError);
//         return;
//     }

//     console.log(`[Bot] User ${user.tag} securely removed themseleves from job "${job.description}"`);

//     // 5. Send a confirmation message to the user
//     try {
//         await user.send("🗑️ You have successfully withdrawn your application/reaction for the job.")
//     } catch(dmError) {
//         console.warn(`[Bot] DMs disabled for user ${user.tag}`);
//     }

//     // TEST: send a message to the channel immediately
//     // try {
//     //     await reaction.message.channel.send(`Reaction added by ${user.tag}`)
//     //     console.log(`Reaction Event Message sent to channel succesfully`)
//     // } catch (error) {
//     //     console.error("Something went wrong when sending a message to the channel:", error)
//     //     return
//     // }

//     // Fetch job record first (cheap check before entering the queue)
//     const { data: jobCheck } = await db
//         .from("jobs")
//         .select("id, status, emoji")
//         .eq("message_id", reaction.message.id)
//         .single()

//     // if (!jobCheck || jobCheck.status !== "open") return
//     if (!jobCheck) {
//         console.log(`[Reaction] Rejected! This message ID (${reaction.message.id}) does not exisit in the database.`);
//         return;
//     }

//     if (jobCheck.status !== "open") {
//         console.log(`[Reaction] Rejected! This job's status is currently: "${jobCheck.status}". It must be "open"!`);
//         return;
//     }

//     // if we have an expected emoji, ensure the reaction emoji matches
//     if (jobCheck.emoji && reaction.emoji.name !== jobCheck.emoji) {
//         console.log(`[Reaction] Rejected! Expected ${jobCheck.emoji}, got ${reaction.emoji.name}`);

//         // automatically delete the wrong reaction to keep the post clean!
//         try {
//             await reaction.users.remove(user.id);
//         } catch (removeError) {
//             console.error("Could not remove invalid reaction:", removeError);
//         }

//         return; // stop processing, ignore the reaction completely
//     }

//     console.log(`[Reaction] Job is valid and open! Proceeding to save to database...`);

//     // Serialise all reactions for this job through a queue
//     enqueueForJob(jobCheck.id, async () => {
//         // Re-fetch the full job inside the queue to get the latest shortlist state
//         const { data: job } = await db
//             .from("jobs")
//             .select("*")
//             .eq("id", jobCheck.id)
//             .single()

//         if (!job || job.status !== "open") return

//         const shortlistLimit = job.shortlist_limit ?? 10
//         // const shortlistedUsers = Array.isArray(job.shortlisted_users) ? job.shortlisted_users : []
//         let rawUsers = job.shortlisted_users;
//         let shortlistedUsers = [];

//         if (Array.isArray(rawUsers)) {
//             shortlistedUsers = rawUsers;
//         } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
//             try {
//                 const parsed = JSON.parse(rawUsers);
//                 shortlistedUsers = Array.isArray(parsed) ? parsed : [rawUsers];
//             } catch (e) {
//                 // It's a raw literal string like "jenkins7904"
//                 shortlistedUsers = [rawUsers];
//             }
//         }

//         const candidateInfo = `${user.tag} (${user.id})`

//         //Restriction Check
//         // Fetch all open jobs to see if they are already shortlisted
//         const { data: openJobs } = await db
//             .from("jobs")
//             .select("id, shortlisted_users")
//             .eq("status", "open");
        
//         if (openJobs) {
//             let isShortlistedElsewhere = false;

//             for (const openJob of openJobs) {
//                 if (openJob.id === job.id) continue;

//                 let otherUsers = [];
//                 let otherRaw = openJob.shortlisted_users;

//                 if (Array.isArray(otherRaw)) {
//                     otherUsers = otherRaw;
//                 } else if (typeof otherRaw === "string" && otherRaw.trim() !== "") {
//                     try {
//                         const parsed = JSON.parse(otherRaw);
//                         otherUsers = Array.isArray(parsed) ? parsed : [otherRaw];
//                     } catch (e) {
//                         otherUsers = [otherRaw];
//                     }
//                 }

//                 if (otherUsers.includes(candidateInfo)) {
//                     isShortlistedElsewhere = true;
//                     break;
//                 }
//             }

//             if (isShortlistedElsewhere) {
//                 console.log(`[Bot] User ${user.tag} rejected from ${job.id}. Already on another shorlist.`);

//                 try {
//                     await user.send(
//                         "⚠️ You can only be shortlisted for **one job at a time**. Please wait for the admin to assign you."
//                     );
//                 } catch (dmError) {
//                     console.warn(`[Bot] Could not DM user ${user.id}:`, dmError.message);
//                 }
//                 return;
//             }
//         }

//         // Ignore if already shortlisted
//         if (shortlistedUsers.includes(candidateInfo)) {
//             console.log(`[Bot] User ${user.id} already shortlisted for job ${job.id}`)

//             // Send the reminder DM
//             try {
//                 await user.send("You have already been shortlisted for this job. Please hold on for the admin to contact you.")
//             } catch (dmError) {
//                 console.warn(`[Bot] Could not DM user ${user.id} (DMs may be disabled):`, dmError.message)
//             }
//             return
//         }

//         // Ignore if shortlist is full
//         if (shortlistedUsers.length >= shortlistLimit) {
//             console.log(`[Bot] Shortlist full for job ${job.id}. Ignoring reaction from ${user.tag}`)
//             return
//         }

//         const updatedList = [...shortlistedUsers, candidateInfo]
//         console.log(`[Reaction] Saving this array to the Database:`, updatedList);

//         const { error: updateError } = await db
//             .from("jobs")
//             .update({ shortlisted_users: updatedList })
//             .eq("id", job.id)

//         if (updateError) {
//             console.error(`[Bot] Failed to update shortlist for job ${job.id}:`, updateError)
//             return
//         }

//         console.log(`[Bot] Shortlisted user ${user.id} for job "${job.description}" (${updatedList.length}/${shortlistLimit})`)

//         // Send DM — handle gracefully if user has DMs disabled
//         try {
//             await user.send(
//                 "🎉 You have been shortlisted for this job.\n\nThe admin will contact you shortly."
//             )
//         } catch (dmError) {
//             console.warn(`[Bot] Could not DM user ${user.id} (DMs may be disabled):`, dmError.message)
//         }
//     })
// })

function jobDisplayLabel(job) {
    if (job?.title?.trim()) return job.title.trim()
    if (job?.description?.trim()) {
        const d = job.description.trim()
        return d.length > 90 ? `${d.slice(0, 87)}…` : d
    }
    return "this job"
}

async function dmUserJobExpired(user, job) {
    const label = jobDisplayLabel(job)
    try {
        await user.send(
            `⏰ **This job has expired**\n\n**${label}** is no longer open for applications. ` +
                `Your reaction was removed and did **not** count toward the shortlist.`,
        )
    } catch (e) {}
}

// DM: react-to-re-confirm after cancel+repost (matches dm_shortlist_pending)
async function handleDmShortlistReaction(reaction, user) {
    const msgId = reaction.message.id
    const { data: jobs } = await db.from("jobs").select("*").in("status", ["open", "expired"])
    const jobRow = jobs?.find(
        (j) =>
            Array.isArray(j.dm_shortlist_pending) &&
            j.dm_shortlist_pending.some((p) => p.message_id === msgId),
    )
    if (!jobRow) return

    const pendingEntry = jobRow.dm_shortlist_pending.find((p) => p.message_id === msgId)
    if (!pendingEntry || pendingEntry.user_id !== user.id) return

    const { data: fullJob } = await db.from("jobs").select("*").eq("id", jobRow.id).single()
    if (!fullJob) return

    if (fullJob.emoji && reaction.emoji.name !== fullJob.emoji) {
        try {
            await reaction.users.remove(user.id)
        } catch (e) {}
        return
    }

    if (fullJob.status === "expired") {
        try {
            await reaction.users.remove(user.id)
        } catch (e) {}
        await dmUserJobExpired(user, fullJob)
        const pending = Array.isArray(fullJob.dm_shortlist_pending) ? fullJob.dm_shortlist_pending : []
        const newPending = pending.filter((p) => p.message_id !== msgId)
        await db.from("jobs").update({ dm_shortlist_pending: newPending }).eq("id", fullJob.id)
        console.log(`[Reaction] DM re-confirm rejected: job ${fullJob.id} expired, notified ${user.tag}`)
        return
    }

    if (fullJob.status !== "open") return

    enqueueForJob(jobRow.id, async () => {
        const { data: job } = await db.from("jobs").select("*").eq("id", jobRow.id).single()
        if (!job || job.status !== "open") return

        const shortlistLimit = job.shortlist_limit ?? 10
        let rawUsers = job.shortlisted_users
        let shortlistedUsers = []
        if (Array.isArray(rawUsers)) {
            shortlistedUsers = rawUsers
        } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
            try {
                const parsed = JSON.parse(rawUsers)
                shortlistedUsers = Array.isArray(parsed) ? parsed : [rawUsers]
            } catch (e) {
                shortlistedUsers = [rawUsers]
            }
        }

        const candidateInfo = `${user.username} (${user.id})`

        const { data: openJobs } = await db.from("jobs").select("id, shortlisted_users").eq("status", "open")
        if (openJobs) {
            let isShortlistedElsewhere = false
            for (const openJob of openJobs) {
                if (openJob.id === job.id) continue
                let otherUsers = []
                let otherRaw = openJob.shortlisted_users
                if (Array.isArray(otherRaw)) {
                    otherUsers = otherRaw
                } else if (typeof otherRaw === "string" && otherRaw.trim() !== "") {
                    try {
                        const parsed = JSON.parse(otherRaw)
                        otherUsers = Array.isArray(parsed) ? parsed : [otherRaw]
                    } catch (e) {
                        otherUsers = [otherRaw]
                    }
                }
                if (otherUsers.includes(candidateInfo)) {
                    isShortlistedElsewhere = true
                    break
                }
            }
            if (isShortlistedElsewhere) {
                try {
                    await user.send(
                        "⚠️ You can only be shortlisted for **one job at a time**. Please wait for the admin to assign you.",
                    )
                } catch (e) {}
                return
            }
        }

        if (shortlistedUsers.includes(candidateInfo)) return
        if (shortlistedUsers.length >= shortlistLimit) {
            try {
                await user.send("⚠️ The shortlist is full for this job.")
            } catch (e) {}
            return
        }

        const priorityIds = Array.isArray(job.priority_reaction_user_ids)
            ? job.priority_reaction_user_ids
            : []
        const isPriority = priorityIds.includes(user.id)
        const updatedList = isPriority
            ? [candidateInfo, ...shortlistedUsers.filter((u) => u !== candidateInfo)]
            : [...shortlistedUsers, candidateInfo]

        const newPriority = priorityIds.filter((id) => id !== user.id)
        const pending = Array.isArray(job.dm_shortlist_pending) ? job.dm_shortlist_pending : []
        const newPending = pending.filter((p) => p.message_id !== msgId)

        const { error: updateError } = await db
            .from("jobs")
            .update({
                shortlisted_users: updatedList,
                priority_reaction_user_ids: newPriority,
                dm_shortlist_pending: newPending,
            })
            .eq("id", job.id)

        if (updateError) return

        console.log(`[Bot] DM shortlist re-confirm for ${user.tag} on job "${job.description}"`)
        try {
            await user.send(
                "🎉 You're back on the shortlist — priority applies when others react in the channel.",
            )
        } catch (e) {}
    })
}

// Shortlist via Reaction
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) {
        try { await reaction.fetch() } catch (error) { return }
    }
    if (user.partial) {
        try { await user.fetch() } catch (error) { return }
    }

    console.log(`Reaction Event The reaction was by ${user.tag}`);

    // Ignore bot reactions
    if (user.bot) return;

    if (reaction.message.channel?.type === ChannelType.DM) {
        await handleDmShortlistReaction(reaction, user)
        return
    }

    // Anti-Spam Check
    if (isRateLimited(user.id)) {
        try {
            await user.send("⏳ You are clicking too fast! Please wait a few seconds before trying again.");
        } catch (error) {}
        return;
    }

    // Fetch job record first
    const { data: jobCheck } = await db
        .from("jobs")
        .select("id, status, emoji, title, description")
        .eq("message_id", reaction.message.id)
        .single()

    if (!jobCheck) return

    if (jobCheck.status === "expired") {
        const matchesEmoji = !jobCheck.emoji || reaction.emoji.name === jobCheck.emoji
        if (matchesEmoji) {
            try {
                await reaction.users.remove(user.id)
            } catch (e) {}
            await dmUserJobExpired(user, jobCheck)
            console.log(`[Reaction] Channel reaction removed: job ${jobCheck.id} expired, notified ${user.tag}`)
        } else {
            try {
                await reaction.users.remove(user.id)
            } catch (e) {}
        }
        return
    }

    if (jobCheck.status !== "open") return

    // Ensure the reaction emoji matches
    if (jobCheck.emoji && reaction.emoji.name !== jobCheck.emoji) {
        try { await reaction.users.remove(user.id); } catch (e) {}
        return;
    }

    console.log(`[Reaction] Job is valid and open! Proceeding to save to database...`);

    // Serialize all reactions for this job through a queue
    enqueueForJob(jobCheck.id, async () => {
        const { data: job } = await db.from("jobs").select("*").eq("id", jobCheck.id).single()
        if (!job || job.status !== "open") return

        const shortlistLimit = job.shortlist_limit ?? 10
        let rawUsers = job.shortlisted_users;
        let shortlistedUsers = [];

        if (Array.isArray(rawUsers)) {
            shortlistedUsers = rawUsers;
        } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
            try {
                const parsed = JSON.parse(rawUsers);
                shortlistedUsers = Array.isArray(parsed) ? parsed : [rawUsers];
            } catch (e) {
                shortlistedUsers = [rawUsers];
            }
        }

        const candidateInfo = `${user.username} (${user.id})`

        // Check if user is shortlisted elsewhere
        const { data: openJobs } = await db.from("jobs").select("id, shortlisted_users").eq("status", "open");
        
        if (openJobs) {
            let isShortlistedElsewhere = false;
            for (const openJob of openJobs) {
                if (openJob.id === job.id) continue;
                let otherUsers = [];
                let otherRaw = openJob.shortlisted_users;
                if (Array.isArray(otherRaw)) {
                    otherUsers = otherRaw;
                } else if (typeof otherRaw === "string" && otherRaw.trim() !== "") {
                    try {
                        const parsed = JSON.parse(otherRaw);
                        otherUsers = Array.isArray(parsed) ? parsed : [otherRaw];
                    } catch (e) {
                        otherUsers = [otherRaw];
                    }
                }
                if (otherUsers.includes(candidateInfo)) {
                    isShortlistedElsewhere = true;
                    break;
                }
            }

            if (isShortlistedElsewhere) {
                console.log(`[Bot] User ${user.tag} rejected from ${job.id}. Already on another shortlist.`);
                try { await user.send("⚠️ You can only be shortlisted for **one job at a time**. Please wait for the admin to assign you."); } catch (e) { }
                return;
            }
        }

        // Ignore if already shortlisted
        if (shortlistedUsers.includes(candidateInfo)) return;

        // Ignore if shortlist is full
        if (shortlistedUsers.length >= shortlistLimit) return;

        const priorityIds = Array.isArray(job.priority_reaction_user_ids)
            ? job.priority_reaction_user_ids
            : []
        const isPriority = priorityIds.includes(user.id)
        const updatedList = isPriority
            ? [candidateInfo, ...shortlistedUsers.filter((u) => u !== candidateInfo)]
            : [...shortlistedUsers, candidateInfo]

        const newPriority = priorityIds.filter((id) => id !== user.id)
        const { error: updateError } = await db
            .from("jobs")
            .update({ shortlisted_users: updatedList, priority_reaction_user_ids: newPriority })
            .eq("id", job.id)

        if (updateError) return;

        console.log(`[Bot] Shortlisted user ${user.tag} for job "${job.description}" (${updatedList.length}/${shortlistLimit})`)
        try {
            await user.send(`🎉 You have been shortlisted for this job:\n **${job.title}**\n\nThe admin will contact you shortly.`)
        } catch (e) { }
    });
});

// Handle candidates removing their reaction to un-apply
client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try { await reaction.fetch(); } catch (e) { return; }
    }

    if (isRateLimited(user.id)) return; // Fail silently on remove to prevent DM spam

    const { data: job, error } = await db.from("jobs").select("*").eq("message_id", reaction.message.id).single();
    if (error || !job || job.status !== "open") return;

    const candidateInfo = `${user.username} (${user.id})`;

    let rawUsers = job.shortlisted_users;
    let shortlistedUsers = [];
    if (Array.isArray(rawUsers)) {
        shortlistedUsers = rawUsers;
    } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
        try {
            shortlistedUsers = JSON.parse(rawUsers);
            if (!Array.isArray(shortlistedUsers)) shortlistedUsers = [rawUsers];
        } catch (e) {
            shortlistedUsers = [rawUsers];
        }
    }

    if (!shortlistedUsers.includes(candidateInfo)) return;

    const updatedList = shortlistedUsers.filter(u => u !== candidateInfo);

    const { error: updateError } = await db.from("jobs").update({ shortlisted_users: updatedList }).eq("id", job.id);
    if (updateError) return;

    console.log(`[Bot] User ${user.tag} securely removed themselves from job "${job.description}"`);
    try {
        await user.send("🗑️ You have successfully withdrawn your application/reaction for the job.");
    } catch(e) { }
});




let isPolling = false;

// New Job Poller (every 5 seconds)
setInterval(async () => {
    if (isPolling) return;
    isPolling = true;

    try {
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

                const expireAt = new Date(job.expire_at)
                // const expireStr = job.expire_at.endsWith("Z") ? job.expire_at : `${job.expire_at}Z`;
                // const expireAt = new Date(expireStr);
                const unixTimeStamp = Math.floor(expireAt.getTime() / 1000)

                const isRepost = Boolean(job.is_repost)
                const repostBanner = isRepost
                    ? `↻ **Reposted listing** — previously enlisted members have priority when they reapply.\n\n`
                    : ""
                const titleLine = job.title?.trim() ? `**${job.title.trim()}**\n\n` : ""
                const message = await channel.send(
                    `🚀 **New Freelance Job**\n${repostBanner}${titleLine}${job.description}\n\nReact with ${job.emoji} emoji to express interest. Up to ${job.shortlist_limit ?? 10} candidates will be shortlisted. Opening ends in: <t:${unixTimeStamp}:R>`,
                )

                // Save message ID back to DB
                await db
                    .from("jobs")
                    .update({ message_id: message.id })
                    .eq("id", job.id)

                console.log(`[Bot] Posted new job to Discord: "${job.title?.trim() || job.description}" (msg: ${message.id})`)
            } catch (err) {
                console.error(`[Bot] Failed to post job ${job.id}:`, err)
            }
        }
    } finally {
        isPolling = false;
    }
}, 5000)

// Expiration Scheduler (every 60 seconds)
// setInterval(async () => {
//     const { data: jobs } = await db
//         .from("jobs")
//         .select("*")
//         .eq("status", "open")

//     if (!jobs || jobs.length === 0) return

//     const now = new Date()
//     for (const job of jobs) {
//         const expireStr = job.expire_at.endsWith("Z") ? job.expire_at : `${job.expire_at}Z`;
//         const expireAt = new Date(expireStr);

//         if (expireAt < now) {
//             await db
//                 .from("jobs")
//                 .update({ status: "expired" })
//                 .eq("id", job.id)

//             console.log(`[Expiry] Job expired: "${job.description}" (id: ${job.id})`)

//             try {
//                 const channel = await client.channels.fetch(job.channel_id)
//                 if (channel) {
//                     const shortlistedUsers = Array.isArray(job.shortlisted_users) ? job.shortlisted_users : []
//                     await channel.send(
//                         `⚠️ **Job Expired**\nThe timeframe for "${job.description}" has expired.\n` +
//                         `${shortlistedUsers.length} candidate(s) were shortlisted. Awaiting admin review.`
//                     )
//                 }
//             } catch (err) {
//                 console.error(`[Expiry] Failed to notify channel for job ${job.id}:`, err)
//             }
//         }
//     }
// }, 60000)

let isExpiryPolling = false;

// Expiration Scheduler (every 60 seconds)
setInterval(async () => {
    if (isExpiryPolling) return;
    isExpiryPolling = true;

    try {
        const { data: jobs } = await db
            .from("jobs")
            .select("*")
            .eq("status", "open")

        if (!jobs || jobs.length === 0) return

        const now = new Date()
        for (const job of jobs) {
            try {
                // 1. Safe guard against missing dates
                if (!job.expire_at) {
                    console.warn(`[Expiry] Missing expire_at on Job ID: ${job.id}. Skipping.`);
                    continue;
                }

                const expireAt = new Date(job.expire_at);

                if (expireAt < now) {
                    const jobLabel = job.title?.trim() ? job.title.trim() : job.description
                    // Update DB to expired
                    await db
                        .from("jobs")
                        .update({ status: "expired" })
                        .eq("id", job.id)

                    console.log(`[Expiry] Job expired: "${jobLabel}" (id: ${job.id})`)

                    // 2. Safely parse the shortlisted array (just like the reaction logic)
                    let rawUsers = job.shortlisted_users;
                    let shortlistedUsers = [];
            
                    if (Array.isArray(rawUsers)) {
                        shortlistedUsers = rawUsers;
                    } else if (typeof rawUsers === "string" && rawUsers.trim() !== "") {
                        try {
                            const parsed = JSON.parse(rawUsers);
                            shortlistedUsers = Array.isArray(parsed) ? parsed : [rawUsers];
                        } catch (e) {
                            shortlistedUsers = [rawUsers];
                        }
                    }

                    // 3. Notify the channel
                    const channel = await client.channels.fetch(job.channel_id)
                    if (channel) {
                        await channel.send(
                            `⚠️ **Job Expired**\nThe timeframe for "${jobLabel}" has expired.\n` +
                            `${shortlistedUsers.length} candidate(s) were shortlisted. Awaiting admin review.`
                        )
                    }
                }
            } catch (err) {
                // This prevents a single bad job from breaking the rest of the loop!
                console.error(`[Expiry Error] Failed processing job ${job.id}:`, err)
            }
        }
    } finally {
        isExpiryPolling = false;
    }
}, 60000)


// Login
client.login(process.env.DISCORD_BOT_TOKEN)