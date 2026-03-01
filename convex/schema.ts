import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  lookupJobs: defineTable({
    userId: v.string(),
    createdAt: v.number(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error"),
      v.literal("canceled"),
    ),
    input: v.object({
      name: v.string(),
      emailHash: v.optional(v.string()),
      phoneHash: v.optional(v.string()),
      notes: v.optional(v.string()),
    }),
    progress: v.object({
      totalCandidates: v.number(),
      processedCandidates: v.number(),
    }),
    errorMessage: v.optional(v.string()),
    finishedAt: v.optional(v.number()),
    keyVersion: v.number(),
  })
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_userId_status", ["userId", "status"]),

  lookupResults: defineTable({
    jobId: v.id("lookupJobs"),
    createdAt: v.number(),
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
  })
    .index("by_jobId_score", ["jobId", "score"])
    .index("by_jobId_username", ["jobId", "username"]),

  rateLimits: defineTable({
    userId: v.string(),
    windowStart: v.number(),
    actionName: v.string(),
    count: v.number(),
  }).index("by_userId_window_action", ["userId", "windowStart", "actionName"]),

  securityEvents: defineTable({
    eventType: v.union(
      v.literal("RATE_LIMIT_HIT"),
      v.literal("ANOMALY"),
      v.literal("SUSPICIOUS_PATTERN"),
      v.literal("JOB_BLOCKED"),
      v.literal("AUTH_FAILURE"),
    ),
    userId: v.optional(v.string()),
    jobId: v.optional(v.id("lookupJobs")),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_eventType_createdAt", ["eventType", "createdAt"]),

  userSettings: defineTable({
    userId: v.string(),
    encryptedSessionId: v.optional(v.string()),
    sessionIdNonce: v.optional(v.string()),
    sessionIdKeyVersion: v.optional(v.number()),
    sessionIdSetAt: v.optional(v.number()),
    sessionIdValid: v.optional(v.boolean()),
    defaultSearchDepth: v.optional(
      v.union(v.literal("basic"), v.literal("deep"), v.literal("exhaustive")),
    ),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  auditLogs: defineTable({
    action: v.union(
      v.literal("JOB_CREATED"),
      v.literal("JOB_STARTED"),
      v.literal("JOB_COMPLETED"),
      v.literal("JOB_FAILED"),
      v.literal("JOB_CANCELED"),
      v.literal("JOB_DELETED"),
      v.literal("DATA_EXPORTED"),
      v.literal("DATA_DELETED"),
    ),
    userId: v.string(),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_action_createdAt", ["action", "createdAt"]),
});
