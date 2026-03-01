"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  AlertTriangle,
  User,
  Shield,
  Lock,
  ExternalLink,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Ban,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatRelativeTime,
  getScoreColor,
  getScoreBgColor,
  getScoreLabel,
} from "@/lib/utils";
import { toast } from "sonner";
import { Id } from "@convex/_generated/dataModel";

const statusConfig: Record<
  string,
  {
    icon: typeof Clock;
    color: string;
    bg: string;
    label: string;
    description: string;
    spin?: boolean;
  }
> = {
  queued: {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Queued",
    description: "Waiting to start...",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Running",
    description: "Searching and analyzing profiles...",
    spin: true,
  },
  done: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Completed",
    description: "Lookup finished successfully",
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Error",
    description: "Something went wrong",
  },
  canceled: {
    icon: Ban,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Canceled",
    description: "Job was canceled",
  },
};

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.jobId as Id<"lookupJobs">;

  const [isCanceling, setIsCanceling] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(
    new Set(),
  );
  const [scoreFilter, setScoreFilter] = useState<number>(0);

  const job = useQuery(api.jobs.get, { jobId });
  const results = useQuery(api.jobs.getResults, {
    jobId,
    limit: 100,
    minScore: scoreFilter,
  });
  const cancelJob = useMutation(api.jobs.cancel);

  // Auto-scroll to new results when they come in
  const [lastResultCount, setLastResultCount] = useState(0);
  useEffect(() => {
    if (
      results &&
      results.length > lastResultCount &&
      job?.status === "running"
    ) {
      setLastResultCount(results.length);
    }
  }, [results, lastResultCount, job?.status]);

  // Loading state
  if (job === undefined) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  // Not found state
  if (job === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-medium">Job not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This job may have been deleted or you don't have access.
        </p>
        <Link
          href="/app/jobs"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to jobs
        </Link>
      </div>
    );
  }

  const status = statusConfig[job.status] || statusConfig.error;
  const StatusIcon = status.icon;
  const progress =
    job.progress.totalCandidates > 0
      ? Math.round(
          (job.progress.processedCandidates / job.progress.totalCandidates) *
            100,
        )
      : 0;

  const isActive = job.status === "running" || job.status === "queued";
  const filteredResults = results ?? [];

  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);
    try {
      await cancelJob({ jobId });
      toast.success("Job canceled", {
        description: "The lookup has been stopped.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel job";
      toast.error("Failed to cancel", { description: message });
    } finally {
      setIsCanceling(false);
    }
  };

  const toggleResultExpanded = (resultId: string) => {
    setExpandedResults((prev) => {
      const next = new Set(prev);
      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <Link
        href="/app/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {job.input.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Status badge */}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                status.bg,
                status.color,
              )}
            >
              <StatusIcon
                className={cn("h-3.5 w-3.5", status.spin && "animate-spin")}
              />
              {status.label}
            </span>

            {/* Timestamps */}
            <span className="text-sm text-muted-foreground">
              Created {formatRelativeTime(job.createdAt)}
            </span>
            {job.finishedAt && (
              <span className="text-sm text-muted-foreground">
                • Finished {formatRelativeTime(job.finishedAt)}
              </span>
            )}
          </div>

          {/* Status description */}
          <p className="mt-2 text-sm text-muted-foreground">
            {status.description}
          </p>
        </div>

        {/* Cancel button */}
        {isActive && (
          <button
            onClick={handleCancel}
            disabled={isCanceling}
            className={cn(
              "shrink-0 rounded-lg border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition-colors",
              "hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {isCanceling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Cancel Job"
            )}
          </button>
        )}
      </div>

      {/* Progress section */}
      {isActive && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
              </div>
              <div>
                <p className="font-medium">
                  {job.status === "queued"
                    ? "Preparing lookup..."
                    : "Processing candidates..."}
                </p>
                <p className="text-sm text-muted-foreground">
                  {job.progress.totalCandidates > 0
                    ? `${job.progress.processedCandidates} of ${job.progress.totalCandidates} profiles analyzed`
                    : job.status === "queued"
                      ? "Your job will start shortly"
                      : "Searching for matching profiles..."}
                </p>
              </div>
            </div>
            {job.progress.totalCandidates > 0 && (
              <span className="text-2xl font-semibold text-blue-500">
                {progress}%
              </span>
            )}
          </div>

          {/* Progress bar */}
          {job.progress.totalCandidates > 0 && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Live indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Live updates enabled - results appear automatically
          </div>
        </div>
      )}

      {/* Error message */}
      {job.errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Error occurred</p>
            <p className="mt-1 text-sm text-destructive/80">
              {job.errorMessage}
            </p>
          </div>
        </div>
      )}

      {/* Results section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">Results</h2>
            {filteredResults.length > 0 && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {filteredResults.length} found
              </span>
            )}
          </div>

          {/* Score filter */}
          {(results?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(Number(e.target.value))}
                className="rounded-lg border bg-background px-3 py-1.5 text-sm"
              >
                <option value={0}>All scores</option>
                <option value={40}>40%+ (Possible)</option>
                <option value={60}>60%+ (Good)</option>
                <option value={80}>80%+ (High)</option>
              </select>
            </div>
          )}
        </div>

        {/* Empty state */}
        {filteredResults.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            {isActive ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  Results will appear here as they're found...
                </p>
              </>
            ) : job.status === "done" ? (
              <>
                <User className="h-8 w-8 text-muted-foreground" />
                <p className="mt-4 font-medium">No matching profiles found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                  No results available
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredResults.map((result) => {
              const isExpanded = expandedResults.has(result._id);

              return (
                <div
                  key={result._id}
                  className="overflow-hidden rounded-lg border bg-card transition-colors hover:bg-muted/30"
                >
                  {/* Main row */}
                  <div
                    className="flex cursor-pointer items-center justify-between p-4"
                    onClick={() => toggleResultExpanded(result._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            @{result.username}
                          </span>
                          {result.isVerified && (
                            <span title="Verified">
                              <Shield className="h-4 w-4 text-blue-500" />
                            </span>
                          )}
                          {result.isPrivate && (
                            <span title="Private Account">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              getScoreBgColor(result.score),
                              getScoreColor(result.score),
                            )}
                          >
                            {result.score}%
                          </span>
                          <span className="text-muted-foreground">
                            {getScoreLabel(result.score)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://instagram.com/${result.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 p-4">
                      {/* Match signals */}
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-background p-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            Name Match
                          </p>
                          <p
                            className={cn(
                              "mt-1 font-medium capitalize",
                              result.signals.nameMatch === "strong" &&
                                "text-green-500",
                              result.signals.nameMatch === "weak" &&
                                "text-yellow-500",
                              result.signals.nameMatch === "none" &&
                                "text-muted-foreground",
                            )}
                          >
                            {result.signals.nameMatch}
                          </p>
                        </div>
                        {result.signals.emailHintMatch && (
                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Email Match
                            </p>
                            <p
                              className={cn(
                                "mt-1 font-medium capitalize",
                                result.signals.emailHintMatch === "strong" &&
                                  "text-green-500",
                                result.signals.emailHintMatch === "weak" &&
                                  "text-yellow-500",
                              )}
                            >
                              {result.signals.emailHintMatch}
                            </p>
                          </div>
                        )}
                        {result.signals.phoneHintMatch && (
                          <div className="rounded-lg bg-background p-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              Phone Match
                            </p>
                            <p
                              className={cn(
                                "mt-1 font-medium capitalize",
                                result.signals.phoneHintMatch === "strong" &&
                                  "text-green-500",
                                result.signals.phoneHintMatch === "weak" &&
                                  "text-yellow-500",
                              )}
                            >
                              {result.signals.phoneHintMatch}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Match reasons */}
                      {result.explain.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-muted-foreground">
                            Match reasons
                          </p>
                          <ul className="mt-2 space-y-1">
                            {result.explain.map((reason, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-sm"
                              >
                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
