"use node";

export interface PublicProfile {
  username: string;
  fullName?: string;
  bio?: string;
  externalUrl?: string;
  followerCount?: number;
  followingCount?: number;
  mediaCount?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  profilePicUrl?: string;
  emailHint?: string;
  phoneHint?: string;
}

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(baseMs: number, varianceMs: number): number {
  return baseMs + Math.random() * varianceMs;
}
