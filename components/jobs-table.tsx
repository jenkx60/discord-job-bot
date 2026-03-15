"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";

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

export function JobsTable({ jobs, isLoading }: JobsTableProps) {
  const router = useRouter();
  const [repostingId, setRepostingId] = useState<string | null>(null);

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
      router.refresh(); // Refresh the jobs table
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
    <Card>
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>Manage and view your freelance job postings.</CardDescription>
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
                  <TableHead className="w-[40%]">Job Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned User</TableHead>
                  <TableHead>Exp Time</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="group transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium line-clamp-2 max-w-[200px]">
                      {job.description}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>{job.assignedUser}</TableCell>
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
                            onClick={() => window.open(getJobUrl(job.channelId, job.messageId), "_blank", "noopener,noreferrer")}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
