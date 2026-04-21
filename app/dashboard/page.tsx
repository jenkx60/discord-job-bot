import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { JobForm } from "@/components/job-form";
import { JobsTable, Job } from "@/components/jobs-table";
import { Briefcase, Clock, UserCheck, CheckCircle } from "lucide-react";
import { CandidateLeaderboard } from "@/components/candidate-leaderboard";

export const revalidate = 0;

export default async function DashboardPage() {
    const { data } = await supabaseAdmin
        .from("jobs")
        .select("*")
        .order("id", { ascending: false });

    const jobs: Job[] = (data || []).map((row: Record<string, any>) => ({
        id: row.id as string,
        title: (row.title ?? null) as string | null,
        description: row.description as string,
        status: row.status as Job["status"],
        emoji: row.emoji as string,
        assignedUser: (row.assigned_user ?? row.assigned_to) as string | null,
        assignedUserId: (row.assigned_user_id ?? row.assigned_to_id) as string | null,
        expirationTime: (row.expire_at ?? row.expires_at) as string | null,
        messageId: row.message_id as string | undefined,
        channelId: row.channel_id as string | undefined,
        shortlistedUsers: (row.shortlisted_users ?? []) as string[],
        shortlistLimit: (row.shortlist_limit ?? 10) as number,
        isRepost: Boolean(row.is_repost),
        priorShortlistUserIds: (Array.isArray(row.prior_shortlist_user_ids)
            ? row.prior_shortlist_user_ids
            : []) as string[],
    }));

    // Stat counts
    const total = jobs.length;
    const open = jobs.filter((j) => j.status === "open").length;
    const assigned = jobs.filter((j) => j.status === "assigned").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const stats = [
        {
            label: "Total Jobs",
            value: total,
            sub: "All time",
            icon: Briefcase,
            iconWrap: "bg-[var(--mantis-primary-bg)] text-[var(--mantis-primary)]",
        },
        {
            label: "Open Jobs",
            value: open,
            sub: "Awaiting assignment",
            icon: Clock,
            iconWrap: "bg-amber-50 text-amber-600",
        },
        {
            label: "Assigned",
            value: assigned,
            sub: "In progress",
            icon: UserCheck,
            iconWrap: "bg-[#f9f0ff] text-[#722ed1]",
        },
        {
            label: "Completed",
            value: completed,
            sub: "Successfully closed",
            icon: CheckCircle,
            iconWrap: "bg-emerald-50 text-emerald-600",
        },
    ];

    const { data: metrics } = await supabaseAdmin
        .from("candidate_metrics")
        .select("*")
        .order("completed_count", { ascending: false });

    return (
        <>
            <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--mantis-text)]">Dashboard</h1>
                <p className="text-sm text-[var(--mantis-text-secondary)]">
                    Overview of jobs, shortlists, and candidate performance.
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map(({ label, value, sub, icon: Icon, iconWrap }) => (
                    <div
                        key={label}
                        className="rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] p-5 shadow-[var(--mantis-shadow-card)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-[var(--mantis-text-secondary)]">{label}</p>
                                <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--mantis-text)]">{value}</p>
                                <p className="mt-1 text-xs text-[var(--mantis-text-secondary)]">{sub}</p>
                            </div>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconWrap}`}>
                                <Icon size={20} strokeWidth={2} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <section>
                <JobForm />
            </section>

            <section>
                <JobsTable jobs={jobs} />
            </section>

            <section>
                <CandidateLeaderboard metrics={metrics || []} />
            </section>
        </>
    );
}
