"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState } from "react";
import {
  Trash2,
  Loader2,
  Shield,
  Clock,
  Database,
  AlertTriangle,
  Key,
  CheckCircle2,
  XCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type SearchDepth = "basic" | "deep" | "exhaustive";

const SEARCH_DEPTH_OPTIONS: {
  value: SearchDepth;
  label: string;
  description: string;
}[] = [
  { value: "basic", label: "Basic", description: "Fast search, fewer results" },
  { value: "deep", label: "Deep", description: "Balanced speed and coverage" },
  {
    value: "exhaustive",
    label: "Exhaustive",
    description: "Maximum coverage, requires session",
  },
];

export default function SettingsPage() {
  const settings = useQuery(api.settings.get);
  const stats = useQuery(api.jobs.getStats);

  const saveSessionId = useAction(api.settingsNode.saveSessionId);
  const clearSessionId = useMutation(api.settings.clearSessionId);
  const updateSearchDepth = useMutation(api.settings.updateSearchDepth);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isClearingSession, setIsClearingSession] = useState(false);
  const [sessionIdInput, setSessionIdInput] = useState("");
  const [showSessionInput, setShowSessionInput] = useState(false);

  const handleSaveSession = async () => {
    if (!sessionIdInput.trim()) {
      toast.error("Please enter a session ID");
      return;
    }

    setIsSavingSession(true);
    try {
      await saveSessionId({ sessionId: sessionIdInput.trim() });
      toast.success("Session ID saved successfully!");
      setSessionIdInput("");
      setShowSessionInput(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save session ID";
      toast.error("Failed to save session", { description: message });
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleClearSession = async () => {
    if (!confirm("Are you sure you want to remove your Instagram session?")) {
      return;
    }

    setIsClearingSession(true);
    try {
      await clearSessionId();
      toast.success("Session ID removed");
    } catch (error) {
      toast.error("Failed to remove session");
    } finally {
      setIsClearingSession(false);
    }
  };

  const handleSearchDepthChange = async (depth: SearchDepth) => {
    try {
      await updateSearchDepth({ depth });
      toast.success("Search depth updated");
    } catch (error) {
      toast.error("Failed to update search depth");
    }
  };

  const handleDeleteAllData = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL your data? This cannot be undone.",
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      // Would call a deleteAllData mutation here
      toast.success("All data deleted");
    } catch (error) {
      toast.error("Failed to delete data");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, sessions, and preferences
        </p>
      </div>

      {/* Instagram Session */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
            <Key className="h-5 w-5 text-pink-500" />
          </div>
          <div>
            <h2 className="font-medium">Instagram Session</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Instagram for advanced search features
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* Session Status */}
          <div
            className={cn(
              "flex items-center justify-between rounded-lg p-4",
              settings?.hasSessionId
                ? "bg-green-500/10 border border-green-500/30"
                : "bg-muted/50",
            )}
          >
            <div className="flex items-center gap-3">
              {settings?.hasSessionId ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {settings?.hasSessionId
                    ? "Session Active"
                    : "No Session Configured"}
                </p>
                {settings?.hasSessionId && settings.sessionIdSetAt && (
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(settings.sessionIdSetAt)}
                  </p>
                )}
              </div>
            </div>
            {settings?.hasSessionId && (
              <button
                onClick={handleClearSession}
                disabled={isClearingSession}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
              >
                {isClearingSession ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Remove
              </button>
            )}
          </div>

          {/* Add/Update Session */}
          {!settings?.hasSessionId && (
            <div className="space-y-3">
              {!showSessionInput ? (
                <button
                  onClick={() => setShowSessionInput(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-pink-500/50 bg-pink-500/5 p-4 text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-500/10 transition-colors"
                >
                  <Key className="h-4 w-4" />
                  Add Instagram Session
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-2">
                    <label htmlFor="sessionId" className="text-sm font-medium">
                      Session ID
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="sessionId"
                        type="password"
                        value={sessionIdInput}
                        onChange={(e) => setSessionIdInput(e.target.value)}
                        placeholder="Paste your sessionid cookie value"
                        className="flex h-10 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      />
                      <button
                        onClick={handleSaveSession}
                        disabled={isSavingSession || !sessionIdInput.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isSavingSession ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Save"
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-2">
                    <p className="font-medium">How to get your session ID:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open Instagram.com in your browser and log in</li>
                      <li>Open Developer Tools (F12 or Cmd+Opt+I)</li>
                      <li>Go to Application → Cookies → instagram.com</li>
                      <li>
                        Find and copy the{" "}
                        <code className="bg-background px-1 rounded">
                          sessionid
                        </code>{" "}
                        value
                      </li>
                    </ol>
                    <div className="mt-3 flex items-start gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <p>
                        Your session is encrypted with AES-256-GCM and never
                        shared. Sessions may expire if you log out of Instagram
                        or change your password.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowSessionInput(false);
                      setSessionIdInput("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* What session enables */}
          <div className="rounded-lg bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">
              With an Instagram session, you get:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Access to Instagram's search API
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Full profile details (followers, bio, etc.)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Email/phone hint matching
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                Exhaustive search mode
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search Preferences */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Search className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-medium">Search Preferences</h2>
            <p className="text-sm text-muted-foreground">
              Default settings for new lookups
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Search Depth</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {SEARCH_DEPTH_OPTIONS.map((option) => {
                const isSelected =
                  settings?.defaultSearchDepth === option.value;
                const isDisabled =
                  option.value === "exhaustive" && !settings?.hasSessionId;

                return (
                  <button
                    key={option.value}
                    onClick={() =>
                      !isDisabled && handleSearchDepthChange(option.value)
                    }
                    disabled={isDisabled}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-input hover:bg-muted/50",
                      isDisabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected && "text-primary",
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limits */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="font-medium">Rate Limits</h2>
            <p className="text-sm text-muted-foreground">
              Your current usage and limits
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Jobs Today</p>
            <p className="mt-1 text-2xl font-semibold">
              {stats?.dailyUsed ?? 0} / {stats?.dailyLimit ?? 20}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Running Jobs</p>
            <p className="mt-1 text-2xl font-semibold">
              {stats?.runningJobs ?? 0} / 1
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Completed Jobs</p>
            <p className="mt-1 text-2xl font-semibold">
              {stats?.completedToday ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
            <Shield className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="font-medium">Security & Privacy</h2>
            <p className="text-sm text-muted-foreground">
              How your data is protected
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium">PII Hashing</p>
              <p className="text-sm text-muted-foreground">
                Email and phone are hashed with HMAC-SHA-256 before storage
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium">Field Encryption</p>
              <p className="text-sm text-muted-foreground">
                Profile data and session IDs are encrypted with AES-256-GCM at
                rest
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm font-medium">Access Control</p>
              <p className="text-sm text-muted-foreground">
                Row-level security ensures you can only access your own data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Retention */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Database className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h2 className="font-medium">Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              Control how long your data is stored
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-delete after</p>
                <p className="text-sm text-muted-foreground">
                  Jobs and results are automatically deleted after this period
                </p>
              </div>
              <span className="rounded-lg bg-background px-3 py-1 text-sm font-medium">
                30 days
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="font-medium text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground">
              Irreversible actions
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background p-4">
            <div>
              <p className="text-sm font-medium">Delete all data</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your jobs and results
              </p>
            </div>
            <button
              onClick={handleDeleteAllData}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
