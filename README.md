# Discord Job Bot

A modern, full-stack application for managing freelance job postings on Discord. Built with Next.js, TailwindCSS, Supabase, and Discord.js.

## Features

- 🚀 **Dashboard**: Post and manage jobs from a sleek web interface.
- 💬 **Discord Integration**: Automatic posting to specific channels.
- 🛠️ **Claiming System**: Users react to messages to claim jobs.
- ⏳ **Expiration Logic**: Automatic job expiration and admin-led reposting.
- 🔄 **Real-time Updates**: Live dashboard updates via Supabase Realtime.

---

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Supabase Account](https://supabase.com/)
- [Discord Developer Portal](https://discord.com/developers/applications) (to create a bot)

---

## 1. Supabase Setup

1. Create a new Supabase project.
2. Run the following SQL in the **SQL Editor** to create the `jobs` table:

```sql
create table jobs (
  id uuid default gen_random_uuid() primary key,
  description text not null,
  status text not null default 'open', -- 'open', 'assigned', 'expired'
  emoji text,
  channel_id text not null,
  message_id text,
  assigned_user text,
  assigned_user_id text,
  previous_claimers text[] default '{}',
  expire_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Enable Realtime for the 'jobs' table
alter publication supabase_realtime add table jobs;
```

---

## 2. Discord Bot Setup

1. Create an application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Navigate to **Bot** and enable the following **Privileged Gateway Intents**:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
3. Reset/Copy the **Token** for your `.env` file.
4. Invite the bot to your server with the following permissions:
   - Send Messages
   - Read Message History
   - Add Reactions
   - Manage Messages (recommended)

---

## 3. Environment Variables

Create a `.env` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=your_default_channel_id
```

---

## 4. Installation & Run

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the Dashboard (Next.js):**
   ```bash
   npm run dev
   ```

3. **Run the Discord Bot:**
   ```bash
   npm run bot
   ```

---

## Dashboard Usage

- Visit `http://localhost:3000/dashboard`.
- Use the **Create Job** form to post a new job.
- The bot will automatically post it to Discord.
- Users claim jobs by reacting to the message.
- Status changes are reflected instantly on the dashboard.
