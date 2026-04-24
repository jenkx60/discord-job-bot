import "dotenv/config";
import { Client, GatewayIntentBits, Partials, ChannelType } from "discord.js";
import {
    getJobByMessageId,
    getJobById,
    updateJob,
    listJobsByStatuses,
    listJobsByStatus,
    listOpenJobsWithShortlists,
    listUnpostedOpenJobs,
    getJobsDb,
} from "../lib/db/jobs.js";

// Initialise DB on boot
getJobsDb();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

// Per-job queue to prevent race conditions when multiple users react at the same time.
const jobQueues = new Map();

function enqueueForJob(jobId, task) {
    const current = jobQueues.get(jobId) || Promise.resolve();
    const next = current.then(task).catch((err) => {
        console.error(`[Queue] Error processing reaction for job ${jobId}:`, err);
    });
    jobQueues.set(jobId, next);
    next.finally(() => {
        if (jobQueues.get(jobId) === next) jobQueues.delete(jobId);
    });
}

// Rate limiting: 5-second cooldown between actions per user
const reactionRateLimits = new Map();

function isRateLimited(userId) {
    const now = Date.now();
    const lastAction = reactionRateLimits.get(userId);
    if (lastAction && now - lastAction < 5000) return true;
    reactionRateLimits.set(userId, now);
    return false;
}

// Ready
client.once("clientReady", (readyClient) => {
    console.log(`[Bot] Logged in as ${readyClient.user.tag}`);

    if (!process.env.DISCORD_CHANNEL_ID) {
        console.error("DISCORD_CHANNEL_ID is not defined in .env");
    }
});

function jobDisplayLabel(job) {
    if (job?.title?.trim()) return job.title.trim();
    if (job?.description?.trim()) {
        const d = job.description.trim();
        return d.length > 90 ? `${d.slice(0, 87)}…` : d;
    }
    return "this job";
}

async function dmUserJobExpired(user, job) {
    const label = jobDisplayLabel(job);
    try {
        await user.send(
            `⏰ **This job has expired**\n\n**${label}** is no longer open for applications. ` +
                `Your reaction was removed and did **not** count toward the shortlist.`,
        );
    } catch (e) {}
}

// DM: react-to-re-confirm after cancel+repost (matches dm_shortlist_pending)
async function handleDmShortlistReaction(reaction, user) {
    const msgId = reaction.message.id;
    const jobs = listJobsByStatuses(["open", "expired"]);
    const jobRow = jobs.find(
        (j) =>
            Array.isArray(j.dm_shortlist_pending) &&
            j.dm_shortlist_pending.some((p) => p.message_id === msgId),
    );
    if (!jobRow) return;

    const pendingEntry = jobRow.dm_shortlist_pending.find((p) => p.message_id === msgId);
    if (!pendingEntry || pendingEntry.user_id !== user.id) return;

    const fullJob = getJobById(jobRow.id);
    if (!fullJob) return;

    if (fullJob.emoji && reaction.emoji.name !== fullJob.emoji) {
        try { await reaction.users.remove(user.id); } catch (e) {}
        return;
    }

    if (fullJob.status === "expired") {
        try { await reaction.users.remove(user.id); } catch (e) {}
        await dmUserJobExpired(user, fullJob);
        const pending = Array.isArray(fullJob.dm_shortlist_pending)
            ? fullJob.dm_shortlist_pending
            : [];
        updateJob(fullJob.id, {
            dm_shortlist_pending: pending.filter((p) => p.message_id !== msgId),
        });
        console.log(`[Reaction] DM re-confirm rejected: job ${fullJob.id} expired, notified ${user.tag}`);
        return;
    }

    if (fullJob.status !== "open") return;

    // Same 60-second gap guard for DM re-confirm reactions
    if (fullJob.expire_at && new Date(fullJob.expire_at) <= new Date()) {
        updateJob(fullJob.id, { status: "expired" });
        try { await reaction.users.remove(user.id); } catch (e) {}
        await dmUserJobExpired(user, fullJob);
        return;
    }

    enqueueForJob(jobRow.id, async () => {
        const job = getJobById(jobRow.id);
        if (!job || job.status !== "open") return;

        const shortlistLimit = job.shortlist_limit ?? 10;
        const shortlistedUsers = Array.isArray(job.shortlisted_users)
            ? job.shortlisted_users
            : [];

        const candidateInfo = `${user.username} (${user.id})`;

        // Check if already shortlisted elsewhere
        const openJobs = listOpenJobsWithShortlists();
        for (const openJob of openJobs) {
            if (openJob.id === job.id) continue;
            if (openJob.shortlisted_users.includes(candidateInfo)) {
                try {
                    await user.send(
                        "⚠️ You can only be shortlisted for **one job at a time**. Please wait for the admin to assign you.",
                    );
                } catch (e) {}
                return;
            }
        }

        if (shortlistedUsers.includes(candidateInfo)) return;
        if (shortlistedUsers.length >= shortlistLimit) {
            try { await user.send("⚠️ The shortlist is full for this job."); } catch (e) {}
            return;
        }

        const priorityIds = Array.isArray(job.priority_reaction_user_ids)
            ? job.priority_reaction_user_ids
            : [];
        const isPriority = priorityIds.includes(user.id);
        const updatedList = isPriority
            ? [candidateInfo, ...shortlistedUsers.filter((u) => u !== candidateInfo)]
            : [...shortlistedUsers, candidateInfo];

        const newPriority = priorityIds.filter((id) => id !== user.id);
        const pending = Array.isArray(job.dm_shortlist_pending) ? job.dm_shortlist_pending : [];
        const newPending = pending.filter((p) => p.message_id !== msgId);

        updateJob(job.id, {
            shortlisted_users: updatedList,
            priority_reaction_user_ids: newPriority,
            dm_shortlist_pending: newPending,
        });

        console.log(`[Bot] DM shortlist re-confirm for ${user.tag} on job "${job.description}"`);
        try {
            await user.send(
                "🎉 You're back on the shortlist — priority applies when others react in the channel.",
            );
        } catch (e) {}
    });
}

// Shortlist via Reaction
client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial) {
        try { await reaction.fetch(); } catch (error) { return; }
    }
    if (user.partial) {
        try { await user.fetch(); } catch (error) { return; }
    }

    console.log(`Reaction Event The reaction was by ${user.tag}`);

    if (user.bot) return;

    if (reaction.message.channel?.type === ChannelType.DM) {
        await handleDmShortlistReaction(reaction, user);
        return;
    }

    if (isRateLimited(user.id)) {
        try {
            await user.send("⏳ You are clicking too fast! Please wait a few seconds before trying again.");
        } catch (error) {}
        return;
    }

    const jobCheck = getJobByMessageId(reaction.message.id);
    if (!jobCheck) return;

    if (jobCheck.status === "expired") {
        const matchesEmoji = !jobCheck.emoji || reaction.emoji.name === jobCheck.emoji;
        if (matchesEmoji) {
            try { await reaction.users.remove(user.id); } catch (e) {}
            await dmUserJobExpired(user, jobCheck);
            console.log(`[Reaction] Channel reaction removed: job ${jobCheck.id} expired, notified ${user.tag}`);
        } else {
            try { await reaction.users.remove(user.id); } catch (e) {}
        }
        return;
    }

    if (jobCheck.status !== "open") return;

    // Guard against jobs whose time window has passed but the expiry scheduler
    // hasn't run yet (up to 60-second gap). Treat them the same as expired.
    if (jobCheck.expire_at && new Date(jobCheck.expire_at) <= new Date()) {
        updateJob(jobCheck.id, { status: "expired" });
        try { await reaction.users.remove(user.id); } catch (e) {}
        await dmUserJobExpired(user, jobCheck);
        console.log(`[Reaction] Channel reaction removed: job ${jobCheck.id} time window elapsed, notified ${user.tag}`);
        return;
    }

    if (jobCheck.emoji && reaction.emoji.name !== jobCheck.emoji) {
        try { await reaction.users.remove(user.id); } catch (e) {}
        return;
    }

    console.log(`[Reaction] Job is valid and open! Proceeding to save to database...`);

    enqueueForJob(jobCheck.id, async () => {
        const job = getJobById(jobCheck.id);
        if (!job || job.status !== "open") return;

        const shortlistLimit = job.shortlist_limit ?? 10;
        const shortlistedUsers = Array.isArray(job.shortlisted_users)
            ? job.shortlisted_users
            : [];

        const candidateInfo = `${user.username} (${user.id})`;

        // Check if user is shortlisted elsewhere
        const openJobs = listOpenJobsWithShortlists();
        for (const openJob of openJobs) {
            if (openJob.id === job.id) continue;
            if (openJob.shortlisted_users.includes(candidateInfo)) {
                console.log(`[Bot] User ${user.tag} rejected from ${job.id}. Already on another shortlist.`);
                try {
                    await user.send(
                        "⚠️ You can only be shortlisted for **one job at a time**. Please wait for the admin to assign you.",
                    );
                } catch (e) {}
                return;
            }
        }

        if (shortlistedUsers.includes(candidateInfo)) return;
        if (shortlistedUsers.length >= shortlistLimit) return;

        const priorityIds = Array.isArray(job.priority_reaction_user_ids)
            ? job.priority_reaction_user_ids
            : [];
        const isPriority = priorityIds.includes(user.id);
        const updatedList = isPriority
            ? [candidateInfo, ...shortlistedUsers.filter((u) => u !== candidateInfo)]
            : [...shortlistedUsers, candidateInfo];

        const newPriority = priorityIds.filter((id) => id !== user.id);

        updateJob(job.id, {
            shortlisted_users: updatedList,
            priority_reaction_user_ids: newPriority,
        });

        console.log(
            `[Bot] Shortlisted user ${user.tag} for job "${job.description}" (${updatedList.length}/${shortlistLimit})`,
        );
        try {
            await user.send(
                `🎉 You have been shortlisted for this job:\n **${job.title}**\n\nThe admin will contact you shortly.`,
            );
        } catch (e) {}
    });
});

// Handle candidates removing their reaction to un-apply
client.on("messageReactionRemove", async (reaction, user) => {
    if (user.bot) return;

    if (reaction.partial) {
        try { await reaction.fetch(); } catch (e) { return; }
    }

    if (isRateLimited(user.id)) return;

    const job = getJobByMessageId(reaction.message.id);
    if (!job || job.status !== "open") return;

    const candidateInfo = `${user.username} (${user.id})`;
    const shortlistedUsers = Array.isArray(job.shortlisted_users) ? job.shortlisted_users : [];

    if (!shortlistedUsers.includes(candidateInfo)) return;

    updateJob(job.id, {
        shortlisted_users: shortlistedUsers.filter((u) => u !== candidateInfo),
    });

    console.log(`[Bot] User ${user.tag} securely removed themselves from job "${job.description}"`);
    try {
        await user.send("🗑️ You have successfully withdrawn your application/reaction for the job.");
    } catch (e) {}
});

let isPolling = false;

// New Job Poller (every 5 seconds)
setInterval(async () => {
    if (isPolling) return;
    isPolling = true;

    try {
        const jobs = listUnpostedOpenJobs();
        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            try {
                // Double-check: skip and expire jobs whose window has already passed.
                // listUnpostedOpenJobs filters these out, but guard here too in case
                // of clock drift or a job inserted with a past expire_at.
                if (job.expire_at && new Date(job.expire_at) <= new Date()) {
                    updateJob(job.id, { status: "expired" });
                    console.log(`[Bot] Skipped job ${job.id} "${job.title || job.description}" — already expired before posting.`);
                    continue;
                }

                const channel = await client.channels.fetch(job.channel_id);
                if (!channel) continue;

                const expireAt = new Date(job.expire_at);
                const unixTimeStamp = Math.floor(expireAt.getTime() / 1000);

                const isRepost = Boolean(job.is_repost);
                const repostBanner = isRepost
                    ? `↻ **Reposted listing** — previously enlisted members have priority when they reapply.\n\n`
                    : "";
                const titleLine = job.title?.trim() ? `**${job.title.trim()}**\n\n` : "";
                const message = await channel.send(
                    `🚀 **New Freelance Job**\n${repostBanner}${titleLine}${job.description}\n\nReact with ${job.emoji} emoji to express interest. Up to ${job.shortlist_limit ?? 10} candidates will be shortlisted. Opening ends in: <t:${unixTimeStamp}:R>`,
                );

                updateJob(job.id, { message_id: message.id });
                console.log(
                    `[Bot] Posted new job to Discord: "${job.title?.trim() || job.description}" (msg: ${message.id})`,
                );
            } catch (err) {
                console.error(`[Bot] Failed to post job ${job.id}:`, err);
            }
        }
    } finally {
        isPolling = false;
    }
}, 5000);

let isExpiryPolling = false;

// Expiration Scheduler (every 60 seconds)
setInterval(async () => {
    if (isExpiryPolling) return;
    isExpiryPolling = true;

    try {
        const jobs = listJobsByStatus("open");
        if (!jobs || jobs.length === 0) return;

        const now = new Date();
        for (const job of jobs) {
            try {
                if (!job.expire_at) {
                    console.warn(`[Expiry] Missing expire_at on Job ID: ${job.id}. Skipping.`);
                    continue;
                }

                const expireAt = new Date(job.expire_at);
                if (expireAt < now) {
                    const jobLabel = job.title?.trim() ? job.title.trim() : job.description;

                    updateJob(job.id, { status: "expired" });
                    console.log(`[Expiry] Job expired: "${jobLabel}" (id: ${job.id})`);

                    const shortlistedUsers = Array.isArray(job.shortlisted_users)
                        ? job.shortlisted_users
                        : [];

                    const channel = await client.channels.fetch(job.channel_id);
                    if (channel) {
                        await channel.send(
                            `⚠️ **Job Expired**\nThe timeframe for "${jobLabel}" has expired.\n` +
                                `${shortlistedUsers.length} candidate(s) were shortlisted. Awaiting admin review.`,
                        );
                    }
                }
            } catch (err) {
                console.error(`[Expiry Error] Failed processing job ${job.id}:`, err);
            }
        }
    } finally {
        isExpiryPolling = false;
    }
}, 60000);

// Login
client.login(process.env.DISCORD_BOT_TOKEN);
