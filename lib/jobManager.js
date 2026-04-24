import { updateJob } from "./db/jobs.js";
import client from "../bot/discordBot.js";

export async function postJob(job) {
    const channel = await client.channels.fetch(job.channel_id);

    const titleLine = job.title?.trim() ? `${job.title.trim()}\n\n` : "";
    const repostBanner = job.is_repost
        ? `↻ Reposted listing — previous shortlist members have priority.\n\n`
        : "";
    const message = await channel.send(
        `🚀 New Freelance Job\n${repostBanner}${titleLine}${job.description}\n\nReact with ${job.emoji} to claim.`,
    );

    await message.react(job.emoji);

    updateJob(job.id, { message_id: message.id });
}
