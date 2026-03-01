"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Key,
  Loader2,
  Search,
  Shield,
  X,
  Zap,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface NewLookupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SubmitState =
  | "idle"
  | "validating"
  | "saving_session"
  | "creating"
  | "starting";
type SearchDepth = "basic" | "deep" | "exhaustive";

const SEARCH_DEPTH_INFO: Record<
  SearchDepth,
  { label: string; description: string; icon: React.ReactNode }
> = {
  basic: {
    label: "Basic",
    description: "Fast search, ~20 results max",
    icon: <Zap className="h-4 w-4" />,
  },
  deep: {
    label: "Deep",
    description: "Thorough search, ~50 results max",
    icon: <Search className="h-4 w-4" />,
  },
  exhaustive: {
    label: "Exhaustive",
    description: "Maximum coverage, ~100 results (requires session)",
    icon: <Shield className="h-4 w-4" />,
  },
};

export function NewLookupDialog({ open, onOpenChange }: NewLookupDialogProps) {
  const createJob = useMutation(api.jobs.create);
  const saveSessionId = useAction(api.settingsNode.saveSessionId);
  const stats = useQuery(api.jobs.getStats);
  const settings = useQuery(api.settings.get);
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [searchDepth, setSearchDepth] = useState<SearchDepth>("deep");
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = submitState !== "idle";
  const canSubmit = name.trim().length >= 2 && !isSubmitting;
  const hasSessionId = settings?.hasSessionId ?? false;

  // Check if user is at limits
  const atDailyLimit = stats && stats.dailyUsed >= stats.dailyLimit;
  const hasRunningJob = stats && stats.runningJobs > 0;

  // Exhaustive search requires session
  const needsSessionForDepth =
    searchDepth === "exhaustive" && !hasSessionId && !sessionId.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate locally first
    setSubmitState("validating");

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters");
      setSubmitState("idle");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Name must be less than 100 characters");
      setSubmitState("idle");
      return;
    }

    // Validate email format if provided
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError("Please enter a valid email address");
        setSubmitState("idle");
        return;
      }
    }

    // Save session ID if provided
    if (sessionId.trim() && !hasSessionId) {
      setSubmitState("saving_session");
      try {
        await saveSessionId({ sessionId: sessionId.trim() });
        toast.success("Session ID saved!");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save session ID";
        setError(message);
        setSubmitState("idle");
        return;
      }
    }

    // Create job
    setSubmitState("creating");

    try {
      const jobId = await createJob({
        name: trimmedName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSubmitState("starting");

      toast.success("Lookup started!", {
        description:
          "Your job has been queued and will start processing shortly.",
      });

      // Small delay for UX before navigating
      setTimeout(() => {
        onOpenChange(false);
        resetForm();
        router.push(`/app/jobs/${jobId}`);
      }, 300);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create job";
      setError(message);
      toast.error("Failed to start lookup", { description: message });
      setSubmitState("idle");
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setSessionId("");
    setShowSessionInput(false);
    setError(null);
    setSubmitState("idle");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg mx-4 rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">New Lookup</h2>
              <p className="text-sm text-muted-foreground">
                Search for Instagram profiles by name
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Session ID Banner - Show if not configured */}
        {!hasSessionId && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowSessionInput(!showSessionInput)}
              className="w-full flex items-center justify-between rounded-lg border border-blue-500/50 bg-blue-500/10 p-3 text-left hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    Add Instagram Session for Better Results
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enables advanced search methods and profile details
                  </p>
                </div>
              </div>
              {showSessionInput ? (
                <ChevronUp className="h-4 w-4 text-blue-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500" />
              )}
            </button>

            {showSessionInput && (
              <div className="mt-3 space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-2">
                  <label htmlFor="sessionId" className="text-sm font-medium">
                    Instagram Session ID
                  </label>
                  <input
                    id="sessionId"
                    type="password"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder="Paste your sessionid cookie value"
                    disabled={isSubmitting}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
                    <p className="font-medium">How to get your session ID:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open Instagram in your browser and log in</li>
                      <li>Open Developer Tools (F12)</li>
                      <li>
                        Go to Application {">"} Cookies {">"} instagram.com
                      </li>
                      <li>
                        Find and copy the{" "}
                        <code className="bg-background px-1 rounded">
                          sessionid
                        </code>{" "}
                        value
                      </li>
                    </ol>
                    <p className="mt-2 text-yellow-600 dark:text-yellow-400">
                      Your session is encrypted and never shared. It enables API
                      access for better results.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session configured indicator */}
        {hasSessionId && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/50 p-3">
            <Shield className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">
              Session configured - Advanced search enabled
            </p>
          </div>
        )}

        {/* Rate limit warning */}
        {(atDailyLimit || hasRunningJob) && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
            <div className="text-sm">
              {atDailyLimit ? (
                <p className="text-yellow-600 dark:text-yellow-400">
                  You've reached your daily limit ({stats?.dailyLimit} jobs).
                  Try again tomorrow.
                </p>
              ) : (
                <p className="text-yellow-600 dark:text-yellow-400">
                  You have a job currently running. Please wait for it to
                  complete.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={isSubmitting}
              autoFocus
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              We'll search for Instagram profiles matching this name
            </p>
          </div>

          {/* Search Depth */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Depth</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SEARCH_DEPTH_INFO) as SearchDepth[]).map(
                (depth) => {
                  const info = SEARCH_DEPTH_INFO[depth];
                  const isSelected = searchDepth === depth;
                  const isDisabled =
                    depth === "exhaustive" &&
                    !hasSessionId &&
                    !sessionId.trim();

                  return (
                    <button
                      key={depth}
                      type="button"
                      onClick={() => !isDisabled && setSearchDepth(depth)}
                      disabled={isDisabled}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input hover:bg-muted/50",
                        isDisabled && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {info.icon}
                      <span className="text-xs font-medium">{info.label}</span>
                    </button>
                  );
                },
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {SEARCH_DEPTH_INFO[searchDepth].description}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Used for advanced matching (hashed, never stored in plain text)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Phone <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              disabled={isSubmitting}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Used for advanced matching (hashed, never stored in plain text)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
              disabled={isSubmitting}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Usage info */}
          {stats && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>
                {stats.dailyUsed}/{stats.dailyLimit} jobs used today
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                !canSubmit ||
                atDailyLimit ||
                hasRunningJob ||
                needsSessionForDepth
              }
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {submitState === "validating" && "Validating..."}
                    {submitState === "saving_session" && "Saving session..."}
                    {submitState === "creating" && "Creating job..."}
                    {submitState === "starting" && "Starting lookup..."}
                  </span>
                </>
              ) : (
                "Start Lookup"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
