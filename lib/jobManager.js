import { supabaseAdmin } from "./supabaseAdmin"
import client from "../bot/discordBot"

export async function postJob(job) {
    const channel = await client.channels.fetch(job.channel_id)

    const titleLine = job.title?.trim() ? `${job.title.trim()}\n\n` : ""
    const repostBanner = job.is_repost ? `↻ Reposted listing — previous shortlist members have priority.\n\n` : ""
    const message = await channel.send(
        `🚀 New Freelance Job\n${repostBanner}${titleLine}${job.description}\n\nReact with ${job.emoji} to claim.`,
    )

    await message.react(job.emoji)

    await supabaseAdmin
        .from("jobs")
        .update({ message_id: message.id })
        .eq("id", job.id)
}

// export async function handleReaction(reaction, user) {
//     const job = await supabase
//         .from("jobs")
//         .select("*")
//         .eq("message_id", reaction.message.id)
//         .single()

//     if (!job) return

//     if (reaction.emoji.name === job.emoji) {
//         await supabase
//             .from("jobs")
//             .update({ claimed_by: user.id })
//             .eq("id", job.id)
//     }
// }