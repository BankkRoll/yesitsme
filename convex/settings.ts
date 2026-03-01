import { v } from "convex/values";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      return {
        hasSessionId: false,
        sessionIdValid: false,
        sessionIdSetAt: null,
        defaultSearchDepth: "deep" as const,
      };
    }

    return {
      hasSessionId: !!settings.encryptedSessionId,
      sessionIdValid: settings.sessionIdValid ?? false,
      sessionIdSetAt: settings.sessionIdSetAt ?? null,
      defaultSearchDepth: settings.defaultSearchDepth ?? "deep",
    };
  },
});

export const hasSessionId = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return !!settings?.encryptedSessionId;
  },
});

export const getEncryptedSessionData = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!settings?.encryptedSessionId || !settings?.sessionIdNonce) {
      return null;
    }

    return {
      encryptedSessionId: settings.encryptedSessionId,
      sessionIdNonce: settings.sessionIdNonce,
    };
  },
});

export const clearSessionId = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedSessionId: undefined,
        sessionIdNonce: undefined,
        sessionIdKeyVersion: undefined,
        sessionIdSetAt: undefined,
        sessionIdValid: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const updateSearchDepth = mutation({
  args: {
    depth: v.union(
      v.literal("basic"),
      v.literal("deep"),
      v.literal("exhaustive"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        defaultSearchDepth: args.depth,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        defaultSearchDepth: args.depth,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const storeEncryptedSessionId = internalMutation({
  args: {
    userId: v.string(),
    encryptedSessionId: v.string(),
    sessionIdNonce: v.string(),
    keyVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        encryptedSessionId: args.encryptedSessionId,
        sessionIdNonce: args.sessionIdNonce,
        sessionIdKeyVersion: args.keyVersion,
        sessionIdSetAt: now,
        sessionIdValid: true,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userSettings", {
        userId: args.userId,
        encryptedSessionId: args.encryptedSessionId,
        sessionIdNonce: args.sessionIdNonce,
        sessionIdKeyVersion: args.keyVersion,
        sessionIdSetAt: now,
        sessionIdValid: true,
        defaultSearchDepth: "deep",
        updatedAt: now,
      });
    }
  },
});

export const markSessionInvalid = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sessionIdValid: false,
        updatedAt: Date.now(),
      });
    }
  },
});
