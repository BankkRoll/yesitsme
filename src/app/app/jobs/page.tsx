"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";

import Link from "next/link";
import { NewLookupDialog } from "@/components/jobs/new-lookup-dialog";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

const statusConfig: Record<
  string,
  { icon: typeof Clock; color: string; label: string; spin?: boolean }
> = {
  queued: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    label: "Running",
    spin: true,
  },
  done: { icon: CheckCircle2, color: "text-green-500", label: "Done" },
  error: { icon: XCircle, color: "text-destructive", label: "Error" },
  canceled: { icon: AlertCircle, color: "text-yellow-500", label: "Canceled" },
};

export default function JobsPage() {
  const jobs = useQuery(api.jobs.list) ?? [];
  const removeJob = useMutation(api.jobs.remove);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (jobId: string) => {
    setDeletingId(jobId);
    try {
      await removeJob({ jobId: jobId as any });
      toast.success("Job deleted");
    } catch (error) {
      toast.error("Failed to delete job");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lookup Jobs</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your profile lookup jobs
          </p>
        </div>
        <button
          onClick={() => setShowNewDialog(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Lookup
        </button>
      </div>

      {/* Jobs list */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No jobs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first lookup job to get started
          </p>
          <button
            onClick={() => setShowNewDialog(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Lookup
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const status = statusConfig[job.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={job._id}
                className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <Link
                  href={`/app/jobs/${job._id}`}
                  className="flex flex-1 items-center gap-4"
                >
                  <StatusIcon
                    className={cn(
                      "h-5 w-5",
                      status.color,
                      status.spin && "animate-spin",
                    )}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{job.input.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{status.label}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(job.createdAt)}</span>
                      {job.status === "running" && (
                        <>
                          <span>•</span>
                          <span>
                            {job.progress.processedCandidates}/
                            {job.progress.totalCandidates || "?"} processed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleDelete(job._id);
                  }}
                  disabled={deletingId === job._id}
                  className="ml-4 rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                >
                  {deletingId === job._id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* New Lookup Dialog */}
      <NewLookupDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
