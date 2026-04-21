const API = "https://discord.com/api/v10"

function botHeaders(json = false) {
    const h = { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
    if (json) h["Content-Type"] = "application/json"
    return h
}

/**
 * Open or create a DM channel with a user. Returns { id } or null.
 */
export async function createDmChannel(userId) {
    const token = process.env.DISCORD_BOT_TOKEN
    if (!token || !userId) return null
    const res = await fetch(`${API}/users/@me/channels`, {
        method: "POST",
        headers: botHeaders(true),
        body: JSON.stringify({ recipient_id: userId }),
    })
    if (!res.ok) return null
    return res.json()
}

/**
 * Send a DM to a user. Returns { ok, messageId, channelId }.
 */
export async function sendDm(userId, content) {
    const ch = await createDmChannel(userId)
    if (!ch?.id) return { ok: false, messageId: null, channelId: null }
    const res = await fetch(`${API}/channels/${ch.id}/messages`, {
        method: "POST",
        headers: botHeaders(true),
        body: JSON.stringify({ content }),
    })
    if (!res.ok) return { ok: false, messageId: null, channelId: ch.id }
    const msg = await res.json()
    return { ok: true, messageId: msg.id, channelId: ch.id }
}

/**
 * Bot adds a reaction to a message (e.g. so users can click the same emoji).
 */
export async function addBotReactionToMessage(channelId, messageId, emoji) {
    const token = process.env.DISCORD_BOT_TOKEN
    if (!token || !channelId || !messageId || !emoji) return false
    const emojiEncoded = encodeURIComponent(emoji)
    const res = await fetch(
        `${API}/channels/${channelId}/messages/${messageId}/reactions/${emojiEncoded}/@me`,
        { method: "PUT", headers: botHeaders(false) },
    )
    return res.ok
}
