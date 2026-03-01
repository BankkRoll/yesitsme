"use node";

import * as cheerio from "cheerio";
import { PublicProfile } from "./types";
import { getRandomUserAgent, parseCount } from "./utils";

export async function fetchProfilePublicPage(
  username: string,
): Promise<PublicProfile | null> {
  const url = `https://www.instagram.com/${username}/`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Cache-Control": "no-cache",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseProfileFromHtml(username, html);
}

export function parseProfileFromHtml(
  username: string,
  html: string,
): PublicProfile {
  const $ = cheerio.load(html);
  const profile: PublicProfile = { username };

  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle) {
    const nameMatch = ogTitle.match(/^([^(@]+)(?:\s*\(@|$)/);
    if (nameMatch) {
      const extracted = nameMatch[1].trim();
      if (extracted && extracted.toLowerCase() !== username.toLowerCase()) {
        profile.fullName = extracted;
      }
    }
  }

  const ogDescription =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content");
  if (ogDescription) {
    const statsMatch = ogDescription.match(
      /^([\d,KMB.]+)\s*Followers?,?\s*([\d,KMB.]+)\s*Following,?\s*([\d,KMB.]+)\s*Posts?/i,
    );
    if (statsMatch) {
      profile.followerCount = parseCount(statsMatch[1]);
      profile.followingCount = parseCount(statsMatch[2]);
      profile.mediaCount = parseCount(statsMatch[3]);
    }

    const bioMatch = ogDescription.match(
      /Posts?\s*[-–—:]\s*(.+?)(?:\s*$|See Instagram)/i,
    );
    if (bioMatch && bioMatch[1]) {
      const bio = bioMatch[1].trim();
      if (bio.length > 10) {
        profile.bio = bio.substring(0, 500);
      }
    }
  }

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) {
    profile.profilePicUrl = ogImage;
  }

  if (
    html.includes('"is_verified":true') ||
    html.includes('"isVerified":true') ||
    html.includes("Verified")
  ) {
    profile.isVerified = true;
  }

  if (
    html.includes('"is_private":true') ||
    html.includes('"isPrivate":true') ||
    html.includes("This Account is Private")
  ) {
    profile.isPrivate = true;
  }

  parseSharedData(html, profile);
  parseJsonLd(html, profile, username);

  return profile;
}

function parseSharedData(html: string, profile: PublicProfile): void {
  const sharedDataMatch = html.match(
    /window\._sharedData\s*=\s*(\{[\s\S]*?\});<\/script>/,
  );
  if (!sharedDataMatch) return;

  try {
    const sharedData = JSON.parse(sharedDataMatch[1]);
    const user = sharedData?.entry_data?.ProfilePage?.[0]?.graphql?.user;
    if (user) {
      if (user.full_name && !profile.fullName)
        profile.fullName = user.full_name;
      if (user.biography && !profile.bio) profile.bio = user.biography;
      if (user.edge_followed_by?.count && !profile.followerCount)
        profile.followerCount = user.edge_followed_by.count;
      if (user.edge_follow?.count && !profile.followingCount)
        profile.followingCount = user.edge_follow.count;
      if (user.is_verified !== undefined) profile.isVerified = user.is_verified;
      if (user.is_private !== undefined) profile.isPrivate = user.is_private;
    }
  } catch {
    // Ignore parse errors
  }
}

function parseJsonLd(
  html: string,
  profile: PublicProfile,
  username: string,
): void {
  const ldMatch = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (!ldMatch) return;

  try {
    const jsonLd = JSON.parse(ldMatch[1]);
    if (
      jsonLd.name &&
      !profile.fullName &&
      jsonLd.name.toLowerCase() !== username.toLowerCase()
    ) {
      profile.fullName = jsonLd.name;
    }
    if (jsonLd.description && !profile.bio) {
      profile.bio = jsonLd.description.substring(0, 500);
    }
  } catch {
    // Ignore parse errors
  }
}
