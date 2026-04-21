"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Loader2,
    ExternalLink,
    RefreshCw,
    Users,
    X,
    ChevronLeft,
    ChevronRight,
    LayoutList,
    Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge, JobStatus } from "./status-badge";

export interface Job {
    id: string;
    title?: string | null;
    description: string;
    status: JobStatus;
    emoji: string;
    assignedUser: string | null | undefined;
    assignedUserId: string | null | undefined;
    expirationTime: string | null | undefined;
    messageId?: string;
    channelId?: string;
    shortlistedUsers?: string[];
    shortlistLimit?: number;
    /** True after a repost reset (cancel+repost or Repost button). */
    isRepost?: boolean;
    /** Discord user IDs who were on the shortlist before the last repost (cancel+repost flow). */
    priorShortlistUserIds?: string[];
}

interface JobsTableProps {
    jobs: Job[];
    isLoading?: boolean;
}

// Pin locale and options so server + client render identically
function formatDate(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

const TAB_FILTER_EMPTY: Record<
    string,
    { title: string; subtitle: string }
> = {
    open: {
        title: "No open jobs",
        subtitle:
            "Nothing is waiting for assignment right now. Try another tab or post a new job.",
    },
    assigned: {
        title: "No assigned jobs",
        subtitle: "No jobs are in progress with a freelancer at the moment.",
    },
    completed: {
        title: "No completed jobs",
        subtitle: "When jobs are marked complete, they will appear here.",
    },
    expired: {
        title: "No expired jobs",
        subtitle: "Expired postings will show up in this view when you have any.",
    },
};

// Self-contained shortlist modal — no extra shadcn dependency needed
function ShortlistModal({
  job, onClose, onAssign, onAction, jobs 
}: {
    job: Job;
    onClose: () => void, 
    onAssign: (jobId: string, candidateInfo: string) => Promise<void>,
    onAction: (
        action: "complete" | "cancel",
        jobId: string,
        candidateInfo: string,
        options?: { repost?: boolean },
    ) => Promise<void>,
    jobs: Job[]
}) {
    const users = job.shortlistedUsers ?? [];
    const limit = job.shortlistLimit ?? 10;
    const [pendingUser, setPendingUser] = useState<string | null>(null);
    const [confirmingAction, setConfirmingAction] = useState<{ type: string; userId: string } | null>(null);
    const [cancelRepost, setCancelRepost] = useState(false);
    const [candidateStatsTab, setCandidateStatsTab] = useState<Record<string, "assigned" | "completed">>({});

    const parseCandidateDiscordId = (candidateStr: string) => {
        const m = candidateStr.match(/\((\d+)\)\s*$/);
        return m ? m[1].trim() : null;
    };

    /** Jobs where this user is still stored as assignee (any status). Best all-time proxy without an assignment-history table. */
    const getAllTimeAssignedJobCount = (candidateStr: string) => {
        const id = parseCandidateDiscordId(candidateStr);
        if (!id) return 0;
        return jobs.filter((j) => String(j.assignedUserId ?? "") === id).length;
    };

    const getCompletedJobCount = (candidateStr: string) => {
        const id = parseCandidateDiscordId(candidateStr);
        if (!id) return 0;
        return jobs.filter((j) => j.status === "completed" && String(j.assignedUserId ?? "") === id).length;
    };

    const handleAssignClick = async (userId: string) => {
        setPendingUser(userId);
        try {
            await onAssign(job.id, userId);
        } finally {
            setPendingUser(null);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative mx-4 w-full max-w-md rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.08)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">Enlisted Candidates</h2>
                            {job.isRepost ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                    Reposted job
                                </span>
                            ) : null}
                        </div>
                        {job.title?.trim() ? (
                            <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-1">{job.title.trim()}</p>
                        ) : null}
                        <p className={cn("text-sm text-slate-600 line-clamp-2", job.title?.trim() ? "mt-0.5" : "mt-1")}>{job.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="shrink-0 cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                        <X size={16} />
                    </button>
                </div>

                {confirmingAction?.type === "cancel" && (
                    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <label className="flex cursor-pointer items-start gap-2.5 text-left text-xs text-slate-600">
                            <input
                                type="checkbox"
                                checked={cancelRepost}
                                onChange={(e) => setCancelRepost(e.target.checked)}
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-slate-300 accent-[var(--mantis-primary)]"
                            />
                            <span>
                                Repost this job in Discord and DM everyone still on the shortlist so they can
                                react to that message to re-confirm (priority queue in the channel).
                            </span>
                        </label>
                    </div>
                )}

                {/* List */}
                {users.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-600">
                        No candidates shortlisted yet.
                    </p>
                ) : (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                        {users.map((userId, index) => {
                            const assignedN = getAllTimeAssignedJobCount(userId);
                            const completedN = getCompletedJobCount(userId);
                            const statsTab = candidateStatsTab[userId] ?? "assigned";
                            const priorIds = new Set(job.priorShortlistUserIds ?? []);
                            const rowDiscordId = parseCandidateDiscordId(userId);
                            const isPriorShortlist = Boolean(rowDiscordId && priorIds.has(rowDiscordId));
                            return (
                            <li
                                key={userId}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm"
                            >
                                <div className="flex gap-2">
                                    <span className="w-5 shrink-0 text-right font-mono text-xs text-slate-400">
                                        {index + 1}.
                                    </span>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="break-all font-mono text-xs text-slate-900">{userId}</span>
                                            {isPriorShortlist ? (
                                                <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-800">
                                                    Prior shortlist
                                                </span>
                                            ) : null}
                                        </div>
                                        <div
                                            className="mt-1 flex w-max rounded-lg border border-slate-200 bg-white p-0.5"
                                            role="tablist"
                                            aria-label="Candidate job stats"
                                        >
                                            <button
                                                type="button"
                                                role="tab"
                                                title="Total jobs this candidate is recorded as assignee on (includes completed and expired if assignee is still stored)."
                                                aria-selected={statsTab === "assigned"}
                                                className={cn(
                                                    "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                                                    statsTab === "assigned"
                                                        ? "bg-[var(--mantis-primary-bg)] text-[var(--mantis-primary-active)]"
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                                                )}
                                                onClick={() =>
                                                    setCandidateStatsTab((prev) => ({
                                                        ...prev,
                                                        [userId]: "assigned",
                                                    }))
                                                }
                                            >
                                                Assigned {assignedN}
                                            </button>
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={statsTab === "completed"}
                                                className={cn(
                                                    "rounded-md px-2 py-1 text-[10px] font-semibold transition-colors",
                                                    statsTab === "completed"
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                                                )}
                                                onClick={() =>
                                                    setCandidateStatsTab((prev) => ({
                                                        ...prev,
                                                        [userId]: "completed",
                                                    }))
                                                }
                                            >
                                                Completed {completedN}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                  {/* Assign Job Button */}
                                    {job.status !== "assigned" && confirmingAction?.userId !== userId && (
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-7 cursor-pointer rounded-lg text-xs"
                                            style={{
                                                background: "var(--mantis-primary)",
                                            }}
                                            onClick={() => setConfirmingAction({ type: "assign", userId })}
                                        >
                                            Assign
                                        </Button>
                                    )}

                                    {job.status === "assigned" &&
                                        job.assignedUserId &&
                                        userId.includes(`(${job.assignedUserId})`) &&
                                        confirmingAction?.userId !== userId && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 cursor-pointer rounded-lg border-red-200 text-xs text-red-600 hover:bg-red-50"
                                                    onClick={() => {
                                                        setCancelRepost(false);
                                                        setConfirmingAction({ type: "cancel", userId });
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="h-7 cursor-pointer rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700"
                                                    onClick={() => setConfirmingAction({ type: "complete", userId })}
                                                >
                                                    Complete
                                                </Button>
                                            </>
                                        )}

                                    {confirmingAction?.userId === userId && (
                                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm">
                                            <span className="whitespace-nowrap px-1 text-[10px] font-bold text-slate-900">
                                                Sure?
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                onClick={() => setConfirmingAction(null)}
                                            >
                                                <X size={12} />
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="h-6 cursor-pointer rounded-md px-2 text-[10px]"
                                                disabled={!!pendingUser}
                                                style={{
                                                    background: "var(--mantis-primary)",
                                                }}
                                                onClick={async () => {
                                                    if (confirmingAction.type === "assign") {
                                                        await handleAssignClick(userId);
                                                        return;
                                                    }

                                                    setPendingUser(userId);
                                                    try {
                                                        if (confirmingAction.type === "cancel") {
                                                            await onAction("cancel", job.id, userId, { repost: cancelRepost });
                                                        }
                                                        if (confirmingAction.type === "complete") {
                                                            await onAction("complete", job.id, userId);
                                                        }
                                                    } finally {
                                                        setPendingUser(null);
                                                    }
                                                }}
                                            >
                                                {pendingUser === userId ? (
                                                    <Loader2 size={10} className="animate-spin" />
                                                ) : (
                                                    "Yes"
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                )}

                <p className="mt-4 text-right text-xs text-slate-400">
                    {users.length} of {limit} slots filled
                </p>
            </div>
        </div>
    );
}

/* Main Table */
export function JobsTable({ jobs, isLoading }: JobsTableProps) {
    const router = useRouter();
    const [repostingId, setRepostingId] = useState<string | null>(null);
    const [shortlistJobId, setShortlistJobId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState("all");
    const itemsPerPage = 10;
    const shortlistJob = useMemo(
        () => jobs.find((job) => job.id === shortlistJobId) ?? null,
        [jobs, shortlistJobId],
    );

    useEffect(() => {
        if (shortlistJobId && !shortlistJob) {
            setShortlistJobId(null);
        }
    }, [shortlistJobId, shortlistJob]);

    const TABS = ["all", "open", "assigned", "completed", "expired"];

    const filteredJobs = jobs.filter((job) =>
        activeTab === "all" ? true : job.status === activeTab,
    );

    const sortedJobs = [...filteredJobs].sort((a, b) => {
        if (a.status === "open" && b.status !== "open") return -1;
        if (b.status === "open" && a.status !== "open") return 1;
        const timeA = a.expirationTime ? new Date(a.expirationTime).getTime() : Infinity;
        const timeB = b.expirationTime ? new Date(b.expirationTime).getTime() : Infinity;
        if (timeA !== timeB) return timeA - timeB;
        const titleA = (a.title || "").trim();
        const titleB = (b.title || "").trim();
        if (titleA !== titleB) return titleA.localeCompare(titleB);
        return (a.description || "").localeCompare(b.description || "");
    });

    const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
    const paginatedJobs = sortedJobs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage,
    );

    const handleAction = async (
        action: "complete" | "cancel",
        jobId: string,
        candidateInfo: string,
        options?: { repost?: boolean },
    ) => {
        try {
            const body =
                action === "cancel"
                    ? { jobId, candidateInfo, repost: options?.repost ?? false }
                    : { jobId, candidateInfo };
            const response = await fetch(`/api/${action}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data?.error || `Failed to ${action} job`);
            if (action === "cancel" && data?.reposted) {
                toast.success(
                    typeof data.remindersSent === "number"
                        ? `Assignment cancelled. Job reposted. ${data.remindersSent} reminder DM(s) sent.`
                        : "Assignment cancelled and job reposted.",
                );
            } else {
                toast.success(action === "complete" ? "Job marked as completed!" : "Assignment cancelled!");
            }
            setShortlistJobId(null);
            router.refresh();
        } catch (e) {
            const msg = e instanceof Error ? e.message : `Failed to ${action} job. Please try again.`;
            toast.error(msg);
        }
    };

    const handleAssign = async (jobId: string, candidate: string) => {
        try {
            const response = await fetch("/api/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId, candidateInfo: candidate }),
            });
            if (!response.ok) throw new Error("Failed to assign user");
            const result = await response.json();
            toast.success(
                result.notificationSent
                    ? "User assigned and notified successfully!"
                    : "User assigned successfully!",
            );
            router.refresh();
        } catch {
            toast.error("Failed to assign user. Please try again.");
        }
    };

    const handleRepost = async (id: string) => {
        setRepostingId(id);
        try {
            const res = await fetch("/api/repost", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ jobId: id }),
            });
            if (!res.ok) throw new Error("Failed to repost job");
            toast.success("Job reposted successfully!");
            router.refresh();
        } catch {
            toast.error("Failed to repost job. Please try again.");
        } finally {
            setRepostingId(null);
        }
    };

    const getJobUrl = (channelId?: string, messageId?: string) =>
        channelId && messageId
            ? `https://discord.com/channels/@me/${channelId}/${messageId}`
            : "#";

    /* table header cell */
    const Th = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
        <th
            className={cn(
                "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.5px] text-slate-500",
                right ? "text-right" : "text-left",
            )}
        >
            {children}
        </th>
    );

    return (
        <>
            {shortlistJob && (
                <ShortlistModal
                    job={shortlistJob}
                    onClose={() => setShortlistJobId(null)}
                    onAssign={handleAssign}
                    onAction={handleAction}
                    jobs={jobs}
                />
            )}

            {/* Card */}
            <div className="rounded-lg border border-[var(--mantis-border)] bg-[var(--mantis-paper)] shadow-[var(--mantis-shadow-card)]">
                <div className="flex items-start justify-between px-6 pt-5 pb-4">
                    <div>
                        <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--mantis-text)]">
                            <LayoutList size={18} className="text-[var(--mantis-primary)]" />
                            Active Jobs
                        </h2>
                        <p className="mt-0.5 text-sm text-[var(--mantis-text-secondary)]">
                            Manage and track all freelance postings.
                        </p>
                    </div>
                    <span className="rounded-full bg-[var(--mantis-primary-bg)] px-3 py-1 text-xs font-semibold text-[var(--mantis-primary-active)]">
                        {filteredJobs.length} jobs
                    </span>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 px-6 pb-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => {
                                setActiveTab(tab);
                                setCurrentPage(1);
                            }}
                            className={cn(
                                "cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all duration-200",
                                activeTab === tab
                                    ? "text-white shadow-[0_0_12px_rgba(24,144,255,0.35)]"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                            )}
                            style={
                                activeTab === tab
                                    ? { background: "var(--mantis-primary)" }
                                    : {}
                            }
                        >
                            {tab === "all" ? "All Jobs" : `${tab}`}
                        </button>
                    ))}
                </div>

                {/* Thin separator */}
                <div className="mx-6 h-px bg-[var(--mantis-border)]" />

                {/* Table body */}
                {isLoading ? (
                    <div className="space-y-3 px-6 py-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200" />
                        ))}
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="py-16 text-center">
                        <Inbox
                            className="mx-auto mb-4 h-12 w-12 text-slate-400"
                            strokeWidth={1.25}
                            aria-hidden
                        />
                        <p className="text-sm font-semibold text-slate-700">No jobs yet</p>
                        <p className="mt-2 text-sm text-slate-600">
                            Post a job above to see it listed here.
                        </p>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <Inbox
                            className="mx-auto mb-4 h-12 w-12 text-slate-400"
                            strokeWidth={1.25}
                            aria-hidden
                        />
                        <p className="text-sm font-semibold text-slate-900">
                            {TAB_FILTER_EMPTY[activeTab]?.title ?? "No jobs match this filter"}
                        </p>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                            {TAB_FILTER_EMPTY[activeTab]?.subtitle ??
                                "Try a different tab or check back later."}
                        </p>
                        {activeTab !== "all" && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-6 border-[var(--mantis-border)] text-[var(--mantis-text)] hover:border-[var(--mantis-primary)] hover:bg-[var(--mantis-primary-bg)] hover:text-[var(--mantis-primary-active)]"
                                onClick={() => {
                                    setActiveTab("all");
                                    setCurrentPage(1);
                                }}
                            >
                                View all jobs
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-[#fafafa]">
                                    <Th>Job</Th>
                                    <Th>Status</Th>
                                    <Th>Candidate</Th>
                                    <Th>Assigned User</Th>
                                    <Th>Expires</Th>
                                    <Th right>Actions</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedJobs.map((job) => {
                                    const shortlistedCount = (job.shortlistedUsers ?? []).length;
                                    const shortlistLimit = job.shortlistLimit ?? 10;
                                    const isFull = shortlistedCount >= shortlistLimit;

                                    return (
                                        <tr
                                            key={job.id}
                                            className="border-t border-slate-100 transition-colors hover:bg-slate-50"
                                        >
                                            {/* Title + description */}
                                            <td className="max-w-[220px] px-4 py-3.5">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {job.isRepost ? (
                                                            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                                                Reposted
                                                            </span>
                                                        ) : null}
                                                        {job.title?.trim() ? (
                                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                                {job.title.trim()}
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                    <p
                                                        className={cn(
                                                            "truncate text-sm text-slate-600",
                                                            job.title?.trim() ? "mt-0.5" : "font-medium text-slate-900",
                                                        )}
                                                    >
                                                        {job.description}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3.5">
                                                <StatusBadge status={job.status} />
                                            </td>

                                            {/* Shortlisted */}
                                            <td className="px-4 py-3.5">
                                                <button
                                                    onClick={() => setShortlistJobId(job.id)}
                                                    className={cn(
                                                        "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                                                        isFull
                                                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                                            : "bg-[var(--mantis-primary-bg)] text-[var(--mantis-primary-active)] hover:brightness-95",
                                                    )}
                                                >
                                                    <Users size={12} />
                                                    {shortlistedCount}/{shortlistLimit}
                                                </button>
                                            </td>

                                            {/* Assigned user */}
                                            <td className="px-4 py-3.5 text-sm text-slate-600">
                                                {job.assignedUser ?? (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Expires */}
                                            <td className="px-4 py-3.5 text-sm text-slate-600">
                                                {job.expirationTime ? (
                                                    formatDate(job.expirationTime)
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleRepost(job.id)}
                                                        disabled={repostingId === job.id}
                                                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--mantis-border)] px-3 py-1.5 text-xs font-medium text-[var(--mantis-text)] transition-all hover:border-[var(--mantis-primary)] hover:bg-[var(--mantis-primary-bg)] hover:text-[var(--mantis-primary-active)] disabled:opacity-50"
                                                    >
                                                        {repostingId === job.id ? (
                                                            <Loader2 size={12} className="animate-spin" />
                                                        ) : (
                                                            <RefreshCw size={12} />
                                                        )}
                                                        Repost
                                                    </button>
                                                    <a
                                                        href={getJobUrl(job.channelId, job.messageId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={cn(
                                                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-px",
                                                            !job.messageId && "pointer-events-none opacity-40",
                                                        )}
                                                        style={{
                                                            background: "var(--mantis-primary)",
                                                            boxShadow: "0 2px 10px rgba(24,144,255,0.35)",
                                                        }}
                                                    >
                                                        <ExternalLink size={12} />
                                                        View
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && sortedJobs.length > 0 && (
                    <div className="flex items-center justify-between border-t border-[var(--mantis-border)] px-6 py-4">
                        <span className="text-xs text-slate-600">
                            Showing {(currentPage - 1) * itemsPerPage + 1}–
                            {Math.min(currentPage * itemsPerPage, sortedJobs.length)} of{" "}
                            {sortedJobs.length} jobs
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--mantis-border)] px-3 py-1.5 text-xs font-medium text-[var(--mantis-text)] transition-all hover:border-[var(--mantis-primary)] hover:bg-[var(--mantis-primary-bg)] hover:text-[var(--mantis-primary-active)] disabled:pointer-events-none disabled:opacity-40"
                            >
                                <ChevronLeft size={13} /> Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--mantis-border)] px-3 py-1.5 text-xs font-medium text-[var(--mantis-text)] transition-all hover:border-[var(--mantis-primary)] hover:bg-[var(--mantis-primary-bg)] hover:text-[var(--mantis-primary-active)] disabled:pointer-events-none disabled:opacity-40"
                            >
                                Next <ChevronRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
