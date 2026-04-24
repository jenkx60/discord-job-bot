# Scripts

## user-manager.js — Admin User Manager

An interactive CLI for managing JobBot admin accounts stored in `data/auth.db` (SQLite).

### Run

```bash
# from the discord-job-bot/ directory
npm run user-manager
```

### Menu options

| # | Action | Description |
|---|--------|-------------|
| 1 | **List users** | Show all admin accounts and their status |
| 2 | **Create user** | Add a new admin (email + password, min 12 chars) |
| 3 | **Reset password** | Change a password after verifying the current one |
| 4 | **Change email** | Update the login email for an account |
| 5 | **Lock account** | Prevent a user from logging in without deleting them |
| 6 | **Unlock account** | Re-enable a previously locked account |
| 7 | **Delete user** | Permanently remove an account (blocked if it's the only one) |
| 0 | **Exit** | Quit the tool |

### Notes

- Passwords are hashed with **argon2id** — they are never stored in plain text.
- You cannot delete the last remaining admin to avoid being locked out.  
  Create a replacement first, then delete the old one.
- The database lives at `data/auth.db`. It is excluded from git via `.gitignore`.
- On the server, run `npm run user-manager` inside a `screen` or `tmux` session so the interactive prompt works correctly.

---

## migrate-from-supabase.js — One-shot Data Migration

Copies all `jobs` and `candidate_metrics` rows from your old Supabase project into the local SQLite database. Safe to run multiple times (existing rows are skipped).

Run once on the server **before** cutting over to the new local setup:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
NEXT_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
npm run db:migrate-from-supabase
```

After confirming data migrated successfully, remove the Supabase env vars from your `.env` file.

---

## seed-admin.js — One-shot Admin Seeder

Creates (or resets) the admin user from environment variables. Useful during initial setup or CI.

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=supersecret123 npm run auth:seed-admin
```
