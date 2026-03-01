"use client";

import { Plus, Search } from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { EmptyState } from "@/components/shared/empty-state";
import { Id } from "@convex/_generated/dataModel";
import { JobCard } from "./job-card";
import { NewLookupDialog } from "./new-lookup-dialog";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

export function JobsList() {
  const jobs = useQuery(api.jobs.list) ?? [];
  const removeJob = useMutation(api.jobs.remove);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<Id<"lookupJobs"> | null>(null);

  const handleDelete = async (jobId: Id<"lookupJobs">) => {
    setDeletingId(jobId);
    try {
      await removeJob({ jobId });
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
        <EmptyState
          icon={Search}
          title="No jobs yet"
          description="Create your first lookup job to get started"
          action={
            <button
              onClick={() => setShowNewDialog(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Lookup
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              onDelete={handleDelete}
              isDeleting={deletingId === job._id}
            />
          ))}
        </div>
      )}

      {/* New Lookup Dialog */}
      <NewLookupDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </div>
  );
}
