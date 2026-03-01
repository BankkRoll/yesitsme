import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const jobs = await ctx.db
      .query("lookupJobs")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return jobs;
  },
});

export const get = query({
  args: { jobId: v.id("lookupJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) return null;

    return job;
  },
});

export const getResults = query({
  args: {
    jobId: v.id("lookupJobs"),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify job ownership
    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) return [];

    let results = await ctx.db
      .query("lookupResults")
      .withIndex("by_jobId_score", (q) => q.eq("jobId", args.jobId))
      .order("desc")
      .take(args.limit ?? 100);

    if (args.minScore !== undefined) {
      results = results.filter((r) => r.score >= args.minScore!);
    }

    return results;
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        totalJobs: 0,
        runningJobs: 0,
        completedToday: 0,
        dailyLimit: 20,
        dailyUsed: 0,
      };
    }

    const now = Date.now();
    const dayStart = now - 24 * 60 * 60 * 1000;

    const allJobs = await ctx.db
      .query("lookupJobs")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .collect();

    const runningJobs = allJobs.filter(
      (j) => j.status === "running" || j.status === "queued",
    );
    const todaysJobs = allJobs.filter((j) => j.createdAt > dayStart);
    const completedToday = todaysJobs.filter((j) => j.status === "done");

    return {
      totalJobs: allJobs.length,
      runningJobs: runningJobs.length,
      completedToday: completedToday.length,
      dailyLimit: 20,
      dailyUsed: todaysJobs.length,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const trimmedName = args.name.trim();
    if (trimmedName.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    if (trimmedName.length > 100) {
      throw new Error("Name must be less than 100 characters");
    }

    const now = Date.now();
    const dayStart = now - 24 * 60 * 60 * 1000;
    const hourStart = now - 60 * 60 * 1000;

    const recentJobs = await ctx.db
      .query("lookupJobs")
      .withIndex("by_userId_createdAt", (q) =>
        q.eq("userId", userId).gt("createdAt", dayStart),
      )
      .collect();

    if (recentJobs.length >= 20) {
      throw new Error("Daily job limit reached (20/day). Try again tomorrow.");
    }

    const hourlyJobs = recentJobs.filter((j) => j.createdAt > hourStart);
    if (hourlyJobs.length >= 5) {
      throw new Error(
        "Hourly job limit reached (5/hour). Please wait before creating more jobs.",
      );
    }

    const runningJobs = await ctx.db
      .query("lookupJobs")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "running"),
      )
      .collect();

    if (runningJobs.length >= 1) {
      throw new Error(
        "You already have a job running. Please wait for it to complete.",
      );
    }

    const queuedJobs = await ctx.db
      .query("lookupJobs")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", userId).eq("status", "queued"),
      )
      .collect();

    if (queuedJobs.length >= 1) {
      throw new Error(
        "You already have a job queued. Please wait for it to start.",
      );
    }

    const jobId = await ctx.db.insert("lookupJobs", {
      userId,
      createdAt: now,
      status: "queued",
      input: {
        name: trimmedName,
        emailHash: args.email?.trim() || undefined,
        phoneHash: args.phone?.trim() || undefined,
        notes: args.notes?.trim() || undefined,
      },
      progress: {
        totalCandidates: 0,
        processedCandidates: 0,
      },
      keyVersion: 1,
    });

    await ctx.db.insert("auditLogs", {
      action: "JOB_CREATED",
      userId,
      resourceType: "lookupJob",
      resourceId: jobId,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.actions.runLookup.startLookup, {
      jobId,
      userId,
      name: trimmedName,
      emailHash: args.email?.trim() || undefined,
      phoneHash: args.phone?.trim() || undefined,
    });

    return jobId;
  },
});

export const updateStatus = internalMutation({
  args: {
    jobId: v.id("lookupJobs"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error"),
      v.literal("canceled"),
    ),
    errorMessage: v.optional(v.string()),
    progress: v.optional(
      v.object({
        totalCandidates: v.number(),
        processedCandidates: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");

    const updates: Record<string, unknown> = {
      status: args.status,
    };

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }

    if (args.progress !== undefined) {
      updates.progress = args.progress;
    }

    if (
      args.status === "done" ||
      args.status === "error" ||
      args.status === "canceled"
    ) {
      updates.finishedAt = Date.now();

      // Log completion audit event
      const action =
        args.status === "done"
          ? "JOB_COMPLETED"
          : args.status === "error"
            ? "JOB_FAILED"
            : "JOB_CANCELED";

      await ctx.db.insert("auditLogs", {
        action,
        userId: job.userId,
        resourceType: "lookupJob",
        resourceId: args.jobId,
        metadata: args.errorMessage ? { error: args.errorMessage } : undefined,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(args.jobId, updates);
  },
});

export const cancel = mutation({
  args: { jobId: v.id("lookupJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Job not found");
    }

    if (job.status !== "running" && job.status !== "queued") {
      throw new Error("Job cannot be canceled - it's already " + job.status);
    }

    await ctx.db.patch(args.jobId, {
      status: "canceled",
      finishedAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      action: "JOB_CANCELED",
      userId,
      resourceType: "lookupJob",
      resourceId: args.jobId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { jobId: v.id("lookupJobs") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.jobId);
    if (!job || job.userId !== userId) {
      throw new Error("Job not found");
    }

    if (job.status === "running") {
      throw new Error("Cannot delete a running job. Cancel it first.");
    }

    const results = await ctx.db
      .query("lookupResults")
      .withIndex("by_jobId_score", (q) => q.eq("jobId", args.jobId))
      .collect();

    for (const result of results) {
      await ctx.db.delete(result._id);
    }

    await ctx.db.delete(args.jobId);

    await ctx.db.insert("auditLogs", {
      action: "JOB_DELETED",
      userId,
      resourceType: "lookupJob",
      resourceId: args.jobId,
      createdAt: Date.now(),
    });
  },
});

export const insertResult = internalMutation({
  args: {
    jobId: v.id("lookupJobs"),
    username: v.string(),
    source: v.union(
      v.literal("public_scrape"),
      v.literal("official_api"),
      v.literal("placeholder"),
    ),
    encryptedProfile: v.string(),
    nonce: v.string(),
    keyVersion: v.number(),
    signals: v.object({
      nameMatch: v.union(
        v.literal("none"),
        v.literal("weak"),
        v.literal("strong"),
      ),
      emailHintMatch: v.optional(
        v.union(v.literal("none"), v.literal("weak"), v.literal("strong")),
      ),
      phoneHintMatch: v.optional(
        v.union(v.literal("none"), v.literal("weak"), v.literal("strong")),
      ),
    }),
    score: v.number(),
    explain: v.array(v.string()),
    isVerified: v.optional(v.boolean()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lookupResults")
      .withIndex("by_jobId_username", (q) =>
        q.eq("jobId", args.jobId).eq("username", args.username),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    const resultId = await ctx.db.insert("lookupResults", {
      jobId: args.jobId,
      createdAt: Date.now(),
      username: args.username,
      source: args.source,
      encryptedProfile: args.encryptedProfile,
      nonce: args.nonce,
      keyVersion: args.keyVersion,
      signals: args.signals,
      score: args.score,
      explain: args.explain,
      isVerified: args.isVerified,
      isPrivate: args.isPrivate,
    });

    return resultId;
  },
});

export const isJobActive = query({
  args: { jobId: v.id("lookupJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return false;
    return job.status === "running" || job.status === "queued";
  },
});
