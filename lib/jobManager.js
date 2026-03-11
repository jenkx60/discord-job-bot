import { supabase } from "./supabase"

export async function postJob(job) {
    const channel = await client.channels.fetch(job.channel_id)
    const message = await channel.send(
        `🚀 New Freelance Job ${job.description} React with ${job.emoji} to claim. Time Window: ${job.time_window} minutes`
    )

    await message.react(job.emoji)

    await supabase
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