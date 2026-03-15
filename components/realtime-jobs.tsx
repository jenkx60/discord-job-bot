"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

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

  return null;
}
