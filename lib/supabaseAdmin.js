import { createClient } from "@supabase/supabase-js";

// This client uses the service role key which bypasses Row Level Security.
// NEVER expose this key on the client side — only use it in server-side API routes.
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
