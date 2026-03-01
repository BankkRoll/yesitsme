"use client";

import { ArrowLeft, User } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { EmptyState } from "../shared/empty-state";
import { Id } from "@convex/_generated/dataModel";
import Link from "next/link";
import { LoadingSpinner } from "../shared/loading-spinner";
import { ProgressBar } from "./progress-bar";
import { ResultCard } from "./result-card";
import { StatusBadge } from "../shared/status-badge";
import { api } from "@convex/_generated/api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface JobDetailProps {
  jobId: Id<"lookupJobs">;
}

export function JobDetail({ jobId }: JobDetailProps) {
  const job = useQuery(api.jobs.get, { jobId });
  const results = useQuery(api.jobs.getResults, { jobId, limit: 100 });
  const cancelJob = useMutation(api.jobs.cancel);

  if (job === undefined) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (job === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h2 className="text-lg font-medium">Job not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This job may have been deleted or you don&apos;t have access.
        </p>
        <Link
          href="/app/jobs"
          className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
      </div>
    );
  }

  const handleCancel = async () => {
    try {
      await cancelJob({ jobId });
      toast.success("Job canceled");
    } catch (error) {
      toast.error("Failed to cancel job");
    }
  };

  const canCancel = job.status === "running" || job.status === "queued";

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/app/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {job.input.name}
          </h1>
          <div className="mt-2 flex items-center gap-4">
            <StatusBadge status={job.status} />
            <span className="text-sm text-muted-foreground">
              Created {formatDate(job.createdAt)}
            </span>
            {job.finishedAt && (
              <span className="text-sm text-muted-foreground">
                • Finished {formatDate(job.finishedAt)}
              </span>
            )}
          </div>
        </div>

        {canCancel && (
          <button
            onClick={handleCancel}
            className="rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Cancel Job
          </button>
        )}
      </div>

      {/* Progress bar */}
      {job.status === "running" && job.progress.totalCandidates > 0 && (
        <ProgressBar
          current={job.progress.processedCandidates}
          total={job.progress.totalCandidates}
        />
      )}

      {/* Error message */}
      {job.errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{job.errorMessage}</p>
        </div>
      )}

      {/* Results section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Results</h2>
          {results && results.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {results.length} profiles found
            </span>
          )}
        </div>

        {!results || results.length === 0 ? (
          <EmptyState
            icon={User}
            title={
              job.status === "running" ? "Searching..." : "No results found"
            }
            description={
              job.status === "running"
                ? "Results will appear here as they're found"
                : "No matching profiles were found for this search"
            }
          />
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <ResultCard key={result._id} result={result} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
