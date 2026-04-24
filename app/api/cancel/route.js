import { getJobById, updateJob, incrementMetric } from "@/lib/db/jobs";
import { repostJob } from "@/lib/repostJob";
import { sendDm, addBotReactionToMessage } from "@/lib/discordDm";

function parseDiscordUserId(candidateInfo) {
    const m = String(candidateInfo).match(/\((\d+)\)\s*$/);
    return m ? m[1].trim() : null;
}

function parseUsername(candidateInfo) {
    const m = String(candidateInfo).match(/^(.+)\s+\(\d+\)\s*$/);
    return m ? m[1].trim() : String(candidateInfo).split(" (")[0] || candidateInfo;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { jobId, candidateInfo, repost = false } = body;

        if (!jobId || !candidateInfo) {
            return Response.json(
                { success: false, error: "Missing jobId or candidateInfo" },
                { status: 400 },
            );
        }

        const job = getJobById(jobId);
        if (!job) {
            return Response.json({ success: false, error: "Job not found" }, { status: 404 });
        }

        const claimerBeforeCancel =
            job.assigned_user_id || parseDiscordUserId(candidateInfo) || job.assigned_user;

        let updatedCandidate = Array.isArray(job.shortlisted_users)
            ? [...job.shortlisted_users]
            : [];
        updatedCandidate = updatedCandidate.filter((c) => c !== candidateInfo);

        updateJob(jobId, {
            status: "open",
            assigned_user: null,
            assigned_user_id: null,
            shortlisted_users: updatedCandidate,
        });

        const cancelledUserId = parseDiscordUserId(candidateInfo);
        const jobTitle = (job.title && job.title.trim()) || "this job";
        const shortLabel = jobTitle.length > 80 ? `${jobTitle.slice(0, 77)}…` : jobTitle;

        if (cancelledUserId && process.env.DISCORD_BOT_TOKEN) {
            await sendDm(
                cancelledUserId,
                `❌ Your assignment for **${shortLabel}** has been **canceled** by the admin. You have been removed from the shortlist.`,
            );
        }

        const userId = parseDiscordUserId(candidateInfo) || candidateInfo;
        const username = parseUsername(candidateInfo);

        incrementMetric(userId, username, "canceled");

        const remaining = updatedCandidate;

        if (repost) {
            const snapshot = [...remaining];
            const repostResult = await repostJob(jobId, {
                previousClaimantId: claimerBeforeCancel || null,
            });
            if (!repostResult.ok) {
                throw new Error(repostResult.error?.message || "Repost failed");
            }

            const jobAfter = getJobById(jobId);
            const emoji = jobAfter?.emoji || job.emoji || "👍";
            const priorityIds = snapshot.map(parseDiscordUserId).filter(Boolean);
            const pendingEntries = [];

            for (const entry of snapshot) {
                const uid = parseDiscordUserId(entry);
                if (!uid) continue;

                const dmText =
                    `📌 **Assignment canceled** — this job was **reposted**.\n\n` +
                    `**${shortLabel}**\n\n` +
                    `React with ${emoji} to **this message** to re-confirm your shortlist spot. ` +
                    `You have **priority** in the queue when others react in the channel.\n\n` +
                    `(Job ID: \`${jobId}\`)`;

                const sent = await sendDm(uid, dmText);
                if (sent.ok && sent.messageId && sent.channelId) {
                    await addBotReactionToMessage(sent.channelId, sent.messageId, emoji);
                    pendingEntries.push({ user_id: uid, message_id: sent.messageId });
                }
            }

            updateJob(jobId, {
                priority_reaction_user_ids: priorityIds,
                dm_shortlist_pending: pendingEntries,
                prior_shortlist_user_ids: priorityIds,
                is_repost: true,
            });

            return Response.json({
                success: true,
                reposted: true,
                remindersSent: pendingEntries.length,
            });
        }

        if (remaining.length > 0 && process.env.DISCORD_BOT_TOKEN) {
            for (const entry of remaining) {
                const uid = parseDiscordUserId(entry);
                if (!uid) continue;
                await sendDm(
                    uid,
                    `ℹ️ The assignment for **${shortLabel}** was canceled by the admin. ` +
                        `You are still on the shortlist while the job remains open.`,
                );
            }
        }

        return Response.json({ success: true, reposted: false });
    } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
