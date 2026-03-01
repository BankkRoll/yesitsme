"use node";

import { CURRENT_KEY_VERSION, decrypt, encrypt } from "./lib/crypto";
import { action, internalAction } from "./_generated/server";

import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const saveSessionId = action({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sessionId = args.sessionId.trim();
    if (!sessionId || sessionId.length < 20) {
      console.error(
        `[Settings] Invalid session ID format: length=${sessionId.length}`,
      );
      throw new Error(
        "Invalid session ID format. Session ID should be at least 20 characters.",
      );
    }

    const { ciphertext, nonce } = encrypt(sessionId);

    await ctx.runMutation(internal.settings.storeEncryptedSessionId, {
      userId,
      encryptedSessionId: ciphertext,
      sessionIdNonce: nonce,
      keyVersion: CURRENT_KEY_VERSION,
    });

    console.log(
      `[Settings] Session ID saved for user=${userId.slice(0, 8)}...`,
    );
    return { success: true };
  },
});

export const getDecryptedSessionId = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const encryptedData = await ctx.runQuery(
      internal.settings.getEncryptedSessionData,
      {
        userId: args.userId,
      },
    );

    if (!encryptedData) {
      return null;
    }

    try {
      const sessionId = decrypt(
        encryptedData.encryptedSessionId,
        encryptedData.sessionIdNonce,
      );
      return sessionId;
    } catch (err) {
      console.error(
        `[Settings] Failed to decrypt session for user=${args.userId.slice(0, 8)}...: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  },
});
