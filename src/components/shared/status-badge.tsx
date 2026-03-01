"use client";

import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type JobStatus = "queued" | "running" | "done" | "error" | "canceled";

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
  label: string;
  spin?: boolean;
}

export const statusConfig: Record<JobStatus, StatusConfig> = {
  queued: {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Queued",
  },
  running: {
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "Running",
    spin: true,
  },
  done: {
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Done",
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Error",
  },
  canceled: {
    icon: AlertCircle,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
    label: "Canceled",
  },
};

interface StatusBadgeProps {
  status: JobStatus;
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  showLabel = true,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const badgeSize =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        badgeSize,
        config.bg,
        config.color,
        className,
      )}
    >
      <Icon className={cn(iconSize, config.spin && "animate-spin")} />
      {showLabel && config.label}
    </span>
  );
}
