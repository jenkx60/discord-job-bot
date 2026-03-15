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


// Ready event to confirm the bot is online
client.once("ready", () => {
    console.log(`[discordBot] Managed sub-client ready as ${client.user.tag}`);
});