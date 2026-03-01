"use client";

import { ExternalLink, Lock, Shield, User } from "lucide-react";
import { cn, getScoreBgColor, getScoreColor, getScoreLabel } from "@/lib/utils";

import { Id } from "@convex/_generated/dataModel";

interface ResultCardProps {
  result: {
    _id: Id<"lookupResults">;
    username: string;
    score: number;
    signals: {
      nameMatch: "none" | "weak" | "strong";
      emailHintMatch?: "none" | "weak" | "strong";
      phoneHintMatch?: "none" | "weak" | "strong";
    };
    explain: string[];
    isVerified?: boolean;
    isPrivate?: boolean;
  };
}

export function ResultCard({ result }: ResultCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">@{result.username}</span>
              {result.isVerified && (
                <span title="Verified">
                  <Shield className="h-4 w-4 text-blue-500" />
                </span>
              )}
              {result.isPrivate && (
                <span title="Private">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  getScoreBgColor(result.score),
                  getScoreColor(result.score),
                )}
              >
                {result.score}% - {getScoreLabel(result.score)}
              </span>
              <span>•</span>
              <span>
                Name: {result.signals.nameMatch}
                {result.signals.emailHintMatch &&
                  result.signals.emailHintMatch !== "none" &&
                  ` • Email: ${result.signals.emailHintMatch}`}
                {result.signals.phoneHintMatch &&
                  result.signals.phoneHintMatch !== "none" &&
                  ` • Phone: ${result.signals.phoneHintMatch}`}
              </span>
            </div>
          </div>
        </div>

        <a
          href={`https://instagram.com/${result.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Explanation */}
      {result.explain.length > 0 && (
        <div className="mt-3 rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Match reasons:
          </p>
          <ul className="mt-1 space-y-0.5 text-sm">
            {result.explain.map((reason, i) => (
              <li key={i} className="text-muted-foreground">
                • {reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
