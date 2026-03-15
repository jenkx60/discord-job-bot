import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { JobForm } from "@/components/job-form";
import { JobsTable, Job } from "@/components/jobs-table";
import { Toaster } from "@/components/ui/sonner";
import { RealtimeJobs } from "@/components/realtime-jobs";

export const revalidate = 0; // Disable static caching for this page to always fetch fresh jobs

export default async function DashboardPage() {
  const { data, error } = await supabaseAdmin
    .from("jobs")
    .select("*")
    .order("id", { ascending: false });


  // Map the database rows to the Job interface expected by JobsTable
  const jobs: Job[] = (data || []).map((row: Record<string, any>) => ({
    id: row.id as string,
    description: row.description as string,
    status: row.status as Job["status"],
    emoji: row.emoji as string,
    assignedUser: (row.assigned_user ?? row.assigned_to) as string | null,
    assignedUserId: (row.assigned_user_id ?? row.assigned_to_id) as string | null,
    expirationTime: (row.expire_at ?? row.expires_at) as string | null,
    messageId: row.message_id as string | undefined,
    channelId: row.channel_id as string | undefined,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discord Job Manager</h1>
          <p className="text-muted-foreground mt-2">
            Post freelance jobs to your Discord server and manage them from this dashboard.
          </p>
        </div>

        <div className="grid gap-8">
          <section>
            <JobForm />
          </section>

          <section>
            <JobsTable jobs={jobs} />
          </section>
        </div>
      </div>
      <Toaster />
      <RealtimeJobs />
    </div>
  );
}
