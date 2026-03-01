"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { createInstagramProvider } from "./providers/instagram";
import { calculateScore } from "../lib/scoring";
import { encrypt, CURRENT_KEY_VERSION } from "../lib/crypto";

function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 500;
  return new Promise((resolve) => setTimeout(resolve, ms + jitter));
}

const MAX_CANDIDATES = {
  basic: 20,
  deep: 50,
  exhaustive: 100,
};

const CONCURRENCY_LIMIT = 3;

export const startLookup = internalAction({
  args: {
    jobId: v.id("lookupJobs"),
    userId: v.string(),
    name: v.string(),
    emailHash: v.optional(v.string()),
    phoneHash: v.optional(v.string()),
    searchDepth: v.optional(
      v.union(v.literal("basic"), v.literal("deep"), v.literal("exhaustive")),
    ),
  },
  handler: async (ctx, args) => {
    const { jobId, userId, name } = args;
    const searchDepth = args.searchDepth ?? "deep";
    const startTime = Date.now();

    console.log(
      `[Lookup] Starting job=${jobId} name="${name}" depth=${searchDepth} user=${userId.slice(0, 8)}...`,
    );

    try {
      await ctx.runMutation(internal.jobs.updateStatus, {
        jobId,
        status: "running",
        progress: { totalCandidates: 0, processedCandidates: 0 },
      });

      const sessionId = await ctx.runAction(
        internal.settingsNode.getDecryptedSessionId,
        { userId },
      );
      console.log(
        `[Lookup] Session: ${sessionId ? "authenticated" : "unauthenticated"}`,
      );

      const provider = createInstagramProvider({
        sessionId: sessionId ?? undefined,
        searchDepth,
      });

      let searchResult;

      try {
        searchResult = await provider.searchCandidates(name);
      } catch (searchError) {
        const errorMsg =
          searchError instanceof Error ? searchError.message : "Unknown error";
        console.error(`[Lookup] Search failed job=${jobId}: ${errorMsg}`);

        await ctx.runMutation(internal.jobs.updateStatus, {
          jobId,
          status: "error",
          errorMessage: `Search failed: ${errorMsg}. Try again or check your session ID.`,
        });

        return { success: false, error: "Search failed" };
      }

      const { candidates, methodsUsed, errors } = searchResult;

      console.log(
        `[Lookup] Search complete: ${candidates.length} candidates via [${methodsUsed.join(", ") || "none"}]${errors.length > 0 ? ` (${errors.length} errors)` : ""}`,
      );

      if (candidates.length === 0) {
        console.log(
          `[Lookup] No candidates found for "${name}" - completing job`,
        );

        await ctx.runMutation(internal.jobs.updateStatus, {
          jobId,
          status: "done",
          progress: { totalCandidates: 0, processedCandidates: 0 },
        });

        return {
          success: true,
          candidatesFound: 0,
          resultsStored: 0,
          methodsUsed,
          message:
            errors.length > 0
              ? `No results found. Errors: ${errors.join("; ")}`
              : "No matching profiles found",
        };
      }

      const maxCandidates = MAX_CANDIDATES[searchDepth];
      const limitedCandidates = candidates.slice(0, maxCandidates);

      if (candidates.length > maxCandidates) {
        console.log(
          `[Lookup] Limiting candidates: ${candidates.length} -> ${maxCandidates} (depth=${searchDepth})`,
        );
      }

      await ctx.runMutation(internal.jobs.updateStatus, {
        jobId,
        status: "running",
        progress: {
          totalCandidates: limitedCandidates.length,
          processedCandidates: 0,
        },
      });

      let resultsStored = 0;
      let processedCount = 0;
      let skippedLowScore = 0;
      let fetchErrors = 0;

      const totalBatches = Math.ceil(
        limitedCandidates.length / CONCURRENCY_LIMIT,
      );

      for (let i = 0; i < limitedCandidates.length; i += CONCURRENCY_LIMIT) {
        const batchNum = Math.floor(i / CONCURRENCY_LIMIT) + 1;

        const isActive = await ctx.runQuery(api.jobs.isJobActive, { jobId });
        if (!isActive) {
          console.log(
            `[Lookup] Job canceled at batch ${batchNum}/${totalBatches} - stored ${resultsStored} results`,
          );
          return { success: false, canceled: true, resultsStored };
        }

        const batch = limitedCandidates.slice(i, i + CONCURRENCY_LIMIT);

        const batchResults = await Promise.allSettled(
          batch.map(async (username) => {
            try {
              await delay(800);

              const profile = await provider.fetchProfile(username);
              if (!profile) {
                console.log(
                  `[Lookup] @${username}: profile not found or empty`,
                );
                return { status: "no_profile" as const, username };
              }

              // Log what we found
              if (!profile.fullName && !profile.bio && !profile.followerCount) {
                console.log(
                  `[Lookup] @${username}: profile exists but no data extracted`,
                );
              }

              const scoringResult = calculateScore({
                targetName: name,
                username: profile.username,
                profileName: profile.fullName,
                isVerified: profile.isVerified,
              });

              if (scoringResult.score < 10) {
                console.log(
                  `[Lookup] Skipping @${username}: score=${scoringResult.score} (${scoringResult.explain.join(", ")})`,
                );
                return {
                  status: "low_score" as const,
                  username,
                  score: scoringResult.score,
                };
              }

              const profileJson = JSON.stringify({
                fullName: profile.fullName,
                bio: profile.bio,
                externalUrl: profile.externalUrl,
                followerCount: profile.followerCount,
                followingCount: profile.followingCount,
                mediaCount: profile.mediaCount,
                profilePicUrl: profile.profilePicUrl,
                emailHint: profile.emailHint,
                phoneHint: profile.phoneHint,
              });

              const { ciphertext, nonce } = encrypt(profileJson);

              return {
                status: "success" as const,
                username: profile.username,
                encryptedProfile: ciphertext,
                nonce,
                signals: scoringResult.signals,
                score: scoringResult.score,
                explain: scoringResult.explain,
                isVerified: profile.isVerified,
                isPrivate: profile.isPrivate,
              };
            } catch (err) {
              return {
                status: "error" as const,
                username,
                error: err instanceof Error ? err.message : String(err),
              };
            }
          }),
        );

        for (const result of batchResults) {
          processedCount++;

          if (result.status === "fulfilled") {
            const val = result.value;

            if (val.status === "success") {
              try {
                await ctx.runMutation(internal.jobs.insertResult, {
                  jobId,
                  username: val.username,
                  source: sessionId ? "official_api" : "public_scrape",
                  encryptedProfile: val.encryptedProfile,
                  nonce: val.nonce,
                  keyVersion: CURRENT_KEY_VERSION,
                  signals: val.signals,
                  score: val.score,
                  explain: val.explain,
                  isVerified: val.isVerified,
                  isPrivate: val.isPrivate,
                });
                resultsStored++;
                console.log(
                  `[Lookup] Stored @${val.username}: score=${val.score} (${val.explain.join(", ")})`,
                );
              } catch (insertErr) {
                console.error(
                  `[Lookup] Failed to insert @${val.username}: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}`,
                );
              }
            } else if (val.status === "low_score") {
              skippedLowScore++;
            } else if (val.status === "error") {
              fetchErrors++;
            }
          } else {
            fetchErrors++;
          }
        }

        if (batchNum % 5 === 0 || batchNum === totalBatches) {
          console.log(
            `[Lookup] Progress: batch ${batchNum}/${totalBatches}, stored=${resultsStored}, skipped=${skippedLowScore}, errors=${fetchErrors}`,
          );
        }

        await ctx.runMutation(internal.jobs.updateStatus, {
          jobId,
          status: "running",
          progress: {
            totalCandidates: limitedCandidates.length,
            processedCandidates: Math.min(
              processedCount,
              limitedCandidates.length,
            ),
          },
        });
      }

      const finalStatus = await ctx.runQuery(api.jobs.isJobActive, { jobId });
      if (!finalStatus) {
        console.log(
          `[Lookup] Job canceled before completion - stored ${resultsStored} results`,
        );
        return { success: false, canceled: true, resultsStored };
      }

      await ctx.runMutation(internal.jobs.updateStatus, {
        jobId,
        status: "done",
        progress: {
          totalCandidates: limitedCandidates.length,
          processedCandidates: limitedCandidates.length,
        },
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(
        `[Lookup] Complete job=${jobId} in ${duration}s: processed=${limitedCandidates.length}, stored=${resultsStored}, skipped=${skippedLowScore}, errors=${fetchErrors}, methods=[${methodsUsed.join(", ")}]`,
      );

      return {
        success: true,
        candidatesFound: limitedCandidates.length,
        resultsStored,
        methodsUsed,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Lookup] Fatal error job=${jobId}: ${errorMsg}`);

      await ctx.runMutation(internal.jobs.updateStatus, {
        jobId,
        status: "error",
        errorMessage:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });

      return { success: false, error: String(error) };
    }
  },
});
