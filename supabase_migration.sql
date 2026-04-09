-- Run this in the Supabase SQL Editor to add shortlisting columns to the jobs table.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS shortlisted_users jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shortlist_limit    integer NOT NULL DEFAULT 10;
