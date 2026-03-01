"use client";

import Link from "next/link";
import { Trash2, Loader2 } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { statusConfig, type JobStatus } from "@/components/shared/status-badge";
import { Id } from "@convex/_generated/dataModel";

interface JobCardProps {
  job: {
    _id: Id<"lookupJobs">;
    status: JobStatus;
    input: {
      name: string;
    };
    createdAt: number;
    progress: {
      totalCandidates: number;
      processedCandidates: number;
    };
  };
  onDelete?: (jobId: Id<"lookupJobs">) => void;
  isDeleting?: boolean;
}

export function JobCard({ job, onDelete, isDeleting }: JobCardProps) {
  const status = statusConfig[job.status];
  const StatusIcon = status.icon;

  return (
    <div className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      <Link
        href={`/app/jobs/${job._id}`}
        className="flex flex-1 items-center gap-4"
      >
        <StatusIcon
          className={cn("h-5 w-5", status.color, status.spin && "animate-spin")}
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

      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onDelete(job._id);
          }}
          disabled={isDeleting}
          className="ml-4 rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
