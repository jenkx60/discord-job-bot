"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// We can only use realtime if we have anon key available on client side.
// Since we want this purely client side and we only have the supabaseAdmin client,
// let's create a standard supabase client for realtime listening.
import { createClient } from "@supabase/supabase-js";

// Note: NEVER pass service role key to the client. Realtime listening works with the anon key.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function RealtimeJobs() {
  const router = useRouter();

  useEffect(() => {
    // Subscribe to any changes on the 'jobs' table
    const channel = supabase
      .channel("realtime:jobs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        (payload) => {
          console.log("Job change detected!", payload);
          router.refresh(); // Trigger a Server Component re-render to fetch fresh data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // This is an invisible utility component
  return null;
}
