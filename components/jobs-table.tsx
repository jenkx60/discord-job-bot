"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ExternalLink, RefreshCw, Users, X, ChevronLeft, ChevronRight } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge, JobStatus } from "./status-badge";

export interface Job {
  id: string;
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

// Self-contained shortlist modal — no extra shadcn dependency needed
function ShortlistModal({ 
  job, onClose, onAssign, onAction, jobs 
  }: { 
    job: Job; 
    onClose: () => void, 
    onAssign: (jobId: string, candidateInfo: string) => void,
    onAction: (action: "complete" | "cancel", jobId: string, candidateInfo: string) => void,
    jobs: Job[]
  }) {
  const users = job.shortlistedUsers ?? [];
  const limit = job.shortlistLimit ?? 10;
  const [assigningUser, setAssigningUser] = useState<string | null>(null);
  const [confirmingAction, setConfirmingAction] = useState<{type: string, userId: string} | null>(null);

  const getAssignedCount = (candidateStr: string) => {
    const match = candidateStr.match(/\((\d+)\)$/);
    const candidateId = match ? match[1].trim() : null;

    if (!candidateId) return 0;
    // to count how many assigned jobs match this user ID
    return jobs.filter(j => j.status === "assigned" && j.assignedUserId === candidateId).length;
  };

  const handleAssignClick = async (userId: string) => {
    setAssigningUser(userId);
    onAssign(job.id, userId);
    setAssigningUser(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-background border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold leading-tight">Shortlisted Candidates</h2>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{job.description}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* List */}
        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No candidates shortlisted yet.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto">
            {users.map((userId, index) => (
              <li
                key={userId}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/50 text-sm"
              >
                <div className="flex gap-1">
                  <span className="text-muted-foreground font-mono w-5 text-right shrink-0">
                    {index + 1}.
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs break-all">{userId}</span>
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-[10px] font-semibold px-2 py-0.5 rounded-full w-max dark:bg-blue-900 dark:text-blue-300">
                      Previous Assignments: {getAssignedCount(userId)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {/* Assign Job Button */}
                  {job.status !== "assigned" && confirmingAction?.userId !== userId && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs cursor-pointer"
                      onClick={() => setConfirmingAction({type: "assign", userId})}
                    >
                      {assigningUser === userId ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Assign
                    </Button>
                  )}

                  {/* Assign Job Showing Complete and Cancel Button */}
                  {job.status === "assigned" && job.assignedUserId && userId.includes(`(${job.assignedUserId})`) && confirmingAction?.userId !== userId && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50" 
                        onClick={() => setConfirmingAction({ type: "cancel", userId })}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-7 text-xs bg-green-600 hover:bg-green-700" 
                        onClick={() => setConfirmingAction({ type: "complete", userId })}
                      >
                        Complete
                      </Button>
                    </>
                  )}

                  {/* Confirmation Dialog */}
                  {confirmingAction?.userId === userId && (
                    <div className="flex items-center gap-2 bg-muted p-1 rounded border shadow-sm">
                      <span className="text-[10px] font-bold px-1 whitespace-nowrap">Are you sure?</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:bg-white" onClick={() => setConfirmingAction(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                      <Button variant="default" size="sm" className="h-6 px-2 text-[10px]" disabled={!!assigningUser} onClick={() => {
                        if (confirmingAction.type === "assign") handleAssignClick(userId);
                        if (confirmingAction.type === "cancel") onAction("cancel", job.id, userId);
                        if (confirmingAction.type === "complete") onAction("complete", job.id, userId);
                      }}>
                        {assigningUser === userId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes"}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-4 text-right">
          {users.length} of {limit} slots filled
        </p>
      </div>
    </div>
  );
}

export function JobsTable({ jobs, isLoading }: JobsTableProps) {
  const router = useRouter();
  const [repostingId, setRepostingId] = useState<string | null>(null);
  const [shortlistJob, setShortlistJob] = useState<Job | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [activeTab, setActiveTab] = useState<string>("all");

  const filteredJobs = jobs.filter((job) => {
    if (activeTab === "all")
      return true;
    return job.status === activeTab;
  });

  // Sorting logic
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    // pin open jobs to the top
    if (a.status === "open" && b.status !== "open") return -1;
    if (b.status === "open" && a.status !== "open") return 1;

    // then sort by expiration time (earliest first)
    const timeA = a.expirationTime ? new Date(a.expirationTime).getTime() : Infinity;
    const timeB = b.expirationTime ? new Date(b.expirationTime).getTime() : Infinity;
    if (timeA !== timeB) return timeA - timeB;

    // sort by description
    const descA = (a.description || "").toLowerCase();
    const descB = (b.description || "").toLowerCase();

    if (descA < descB) return -1;
    if (descA > descB) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const paginatedJobs = sortedJobs.slice(
    (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
  );

  const handleAction = async (action: "complete" | "cancel", jobId: string, candidateInfo: string) => {
    try {
      const response = await fetch(`/api/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, candidateInfo }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} job`);
      toast.success(action === "complete" ? "Job marked as completed!" : "Assignment cancelled!");
      setShortlistJob(null);
      router.refresh();
    } catch (error) {
      toast.error(`Failed to ${action} job. Please try again.`);
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

      toast.success("User assigned successfully!");
      setShortlistJob(null);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign user. Please try again.");
    }
  }

  const handleRepost = async (id: string) => {
    setRepostingId(id);
    try {
      const res = await fetch("/api/repost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id }),
      });

      if (!res.ok) {
        throw new Error("Failed to repost job");
      }

      toast.success("Job reposted successfully!");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to repost job. Please try again.");
    } finally {
      setRepostingId(null);
    }
  };

  const getJobUrl = (channelId?: string, messageId?: string) => {
    if (channelId && messageId) {
      return `https://discord.com/channels/@me/${channelId}/${messageId}`;
    }
    return "#";
  };

  return (
    <>
      {/* Shortlist Modal */}
      {shortlistJob && (
        <ShortlistModal job={shortlistJob} onClose={() => setShortlistJob(null)} onAssign={handleAssign} onAction={handleAction} jobs={jobs} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>Manage and view your freelance job postings.</CardDescription>
          <div>
            {["all", "open", "assigned", "completed", "expired"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setCurrentPage(1);
                }}
                className={`capitalize px-4 py-1.5 text-sm font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === tab ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {tab === "all" ? "All Jobs" : `${tab} Jobs`}
              </button>
            )
          )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed rounded-md bg-muted/20">
              <p className="text-muted-foreground">No jobs exist yet.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[35%]">Job Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Shortlisted</TableHead>
                    <TableHead>Assigned User</TableHead>
                    <TableHead>Exp Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJobs.map((job) => {
                    const shortlistedCount = (job.shortlistedUsers ?? []).length;
                    const shortlistLimit = job.shortlistLimit ?? 10;
                    const isFull = shortlistedCount >= shortlistLimit;

                    return (
                      <TableRow key={job.id} className="group transition-colors hover:bg-muted/50">
                        <TableCell className="font-medium line-clamp-2 max-w-[200px]">
                          {job.description}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setShortlistJob(job)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border cursor-pointer
                              ${isFull
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
                                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                              }`}
                            title="View shortlist"
                          >
                            <Users className="h-3.5 w-3.5" />
                            {shortlistedCount} / {shortlistLimit}
                          </button>
                        </TableCell>
                        <TableCell>{job.assignedUser ?? "—"}</TableCell>
                        <TableCell>
                          {job.expirationTime ? formatDate(job.expirationTime) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRepost(job.id)}
                              disabled={repostingId === job.id}
                              className="cursor-pointer"
                            >
                              {repostingId === job.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Repost
                            </Button>
                            {job.messageId ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() =>
                                  window.open(
                                    getJobUrl(job.channelId, job.messageId),
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            ) : (
                              <Button variant="default" size="sm" disabled>
                                <ExternalLink className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {/* Pagination Control */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, jobs.length)} of {jobs.length} jobs
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="cursor-pointer"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
