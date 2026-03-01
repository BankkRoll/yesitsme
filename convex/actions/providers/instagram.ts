"use node";

import { PublicProfile, delay, jitter } from "./types";
import { looksLikeUsername } from "./utils";
import { searchDuckDuckGo, searchGoogle, searchBing } from "./searchEngines";
import {
  searchInstagramWeb,
  searchInstagramMobile,
  fetchProfileMobileApi,
  fetchProfileWebGraphQL,
  advancedLookup,
} from "./instagramApi";
import { fetchProfilePublicPage } from "./profileScraper";

export interface InstagramConfig {
  sessionId?: string;
  searchDepth?: "basic" | "deep" | "exhaustive";
}

export class InstagramProvider {
  private sessionId?: string;
  private searchDepth: "basic" | "deep" | "exhaustive";
  private rateLimitedMethods: Set<string> = new Set();

  constructor(config: InstagramConfig = {}) {
    this.sessionId = config.sessionId;
    this.searchDepth = config.searchDepth ?? "deep";
  }

  async searchCandidates(name: string): Promise<{
    candidates: string[];
    methodsUsed: string[];
    errors: string[];
  }> {
    const candidates: string[] = [];
    const methodsUsed: string[] = [];
    const errors: string[] = [];
    const cleanName = name.trim();

    console.log(
      `[IG] Search starting: query="${cleanName}" depth=${this.searchDepth} auth=${!!this.sessionId}`,
    );

    await this.trySearchMethod(
      () => searchDuckDuckGo(cleanName),
      "duckduckgo",
      candidates,
      methodsUsed,
      errors,
    );

    if (this.searchDepth === "basic" && candidates.length >= 5) {
      console.log(`[IG] Early exit (basic): ${candidates.length} candidates`);
      return { candidates: candidates.slice(0, 20), methodsUsed, errors };
    }

    await delay(jitter(500, 300));

    await this.trySearchMethod(
      () => searchGoogle(cleanName),
      "google",
      candidates,
      methodsUsed,
      errors,
    );

    if (this.searchDepth !== "basic" && candidates.length < 10) {
      await delay(jitter(500, 300));
      await this.trySearchMethod(
        () => searchBing(cleanName),
        "bing",
        candidates,
        methodsUsed,
        errors,
      );
    }

    if (this.sessionId && this.searchDepth === "exhaustive") {
      await delay(jitter(800, 400));
      await this.trySearchMethod(
        () => searchInstagramWeb(cleanName, this.sessionId!),
        "instagram_web",
        candidates,
        methodsUsed,
        errors,
      );
    }

    if (this.sessionId && candidates.length < 15) {
      await delay(jitter(800, 400));
      await this.trySearchMethod(
        () => searchInstagramMobile(cleanName, this.sessionId!),
        "instagram_mobile",
        candidates,
        methodsUsed,
        errors,
      );
    }

    if (
      looksLikeUsername(cleanName) &&
      !candidates.includes(cleanName.toLowerCase())
    ) {
      candidates.unshift(cleanName.toLowerCase());
      console.log(
        `[IG] Added direct username candidate: @${cleanName.toLowerCase()}`,
      );
    }

    const limit =
      this.searchDepth === "basic"
        ? 20
        : this.searchDepth === "deep"
          ? 50
          : 100;
    const finalCandidates = candidates.slice(0, limit);

    console.log(
      `[IG] Search complete: ${finalCandidates.length} candidates, methods=[${methodsUsed.join(", ")}], errors=${errors.length}`,
    );

    return { candidates: finalCandidates, methodsUsed, errors };
  }

  private async trySearchMethod(
    searchFn: () => Promise<{ usernames: string[]; source: string } | string[]>,
    methodName: string,
    candidates: string[],
    methodsUsed: string[],
    errors: string[],
  ): Promise<void> {
    try {
      const result = await searchFn();
      const usernames = Array.isArray(result) ? result : result.usernames;

      if (usernames.length > 0) {
        methodsUsed.push(methodName);
        const newCount = usernames.filter(
          (u) => !candidates.includes(u),
        ).length;
        for (const username of usernames) {
          if (!candidates.includes(username)) candidates.push(username);
        }
        console.log(`[IG] ${methodName}: +${newCount} new candidates`);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      errors.push(`${methodName}: ${errMsg}`);
      console.error(`[IG] ${methodName} failed: ${errMsg}`);
    }
  }

  async fetchProfile(username: string): Promise<PublicProfile | null> {
    const profile: PublicProfile = { username: username.toLowerCase() };

    if (!this.rateLimitedMethods.has("public_page")) {
      const result = await this.tryFetchMethod(
        () => fetchProfilePublicPage(username),
        "public_page",
        profile,
      );
      if (result) return profile;
    }

    await delay(jitter(500, 300));

    if (!this.rateLimitedMethods.has("graphql")) {
      const result = await this.tryFetchMethod(
        () => fetchProfileWebGraphQL(username, this.sessionId),
        "graphql",
        profile,
      );
      if (result) return profile;
    }

    if (this.sessionId && !this.rateLimitedMethods.has("mobile_api")) {
      await delay(jitter(500, 300));
      const result = await this.tryFetchMethod(
        () => fetchProfileMobileApi(username, this.sessionId!),
        "mobile_api",
        profile,
      );
      if (result) return profile;
    }

    if (profile.fullName || profile.bio || profile.followerCount) {
      console.log(`[IG] Profile @${username}: partial data`);
    } else {
      console.log(`[IG] Profile @${username}: no data found`);
    }

    return profile;
  }

  private async tryFetchMethod(
    fetchFn: () => Promise<PublicProfile | null>,
    methodName: string,
    profile: PublicProfile,
  ): Promise<boolean> {
    try {
      const result = await fetchFn();
      if (result) {
        this.mergeProfile(profile, result);
        if (profile.fullName || profile.bio || profile.followerCount) {
          console.log(
            `[IG] Profile @${profile.username}: found via ${methodName} (${profile.fullName || "no name"})`,
          );
          return true;
        }
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      if (error.includes("429")) {
        this.rateLimitedMethods.add(methodName);
        console.warn(`[IG] Rate limited: ${methodName} method disabled`);
      }
    }
    return false;
  }

  private mergeProfile(target: PublicProfile, source: PublicProfile): void {
    if (source.fullName && !target.fullName) target.fullName = source.fullName;
    if (source.bio && !target.bio) target.bio = source.bio;
    if (source.externalUrl && !target.externalUrl)
      target.externalUrl = source.externalUrl;
    if (source.followerCount !== undefined && !target.followerCount)
      target.followerCount = source.followerCount;
    if (source.followingCount !== undefined && !target.followingCount)
      target.followingCount = source.followingCount;
    if (source.mediaCount !== undefined && !target.mediaCount)
      target.mediaCount = source.mediaCount;
    if (source.isVerified !== undefined && target.isVerified === undefined)
      target.isVerified = source.isVerified;
    if (source.isPrivate !== undefined && target.isPrivate === undefined)
      target.isPrivate = source.isPrivate;
    if (source.profilePicUrl && !target.profilePicUrl)
      target.profilePicUrl = source.profilePicUrl;
    if (source.emailHint && !target.emailHint)
      target.emailHint = source.emailHint;
    if (source.phoneHint && !target.phoneHint)
      target.phoneHint = source.phoneHint;
  }

  async advancedLookup(params: { email?: string; phone?: string }) {
    if (!this.sessionId) {
      console.log(`[IG] Advanced lookup skipped: no session`);
      return null;
    }
    return advancedLookup(params, this.sessionId);
  }
}

export function createInstagramProvider(
  config: InstagramConfig = {},
): InstagramProvider {
  return new InstagramProvider(config);
}
