-- Run this in the Supabase SQL Editor to add shortlisting columns to the jobs table.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS shortlisted_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shortlist_limit    integer NOT NULL DEFAULT 10;

-- Job title (short label shown in Discord and the dashboard)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

-- After cancel+repost: DM reaction registration + priority queue for channel reactions
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS dm_shortlist_pending jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS priority_reaction_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Repost tracking (UI + Discord copy)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS is_repost boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prior_shortlist_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
