"use node";

import * as crypto from "crypto";

export const IG_APP_ID = "936619743392459";

const MOBILE_USER_AGENTS = [
  "Instagram 275.0.0.27.98 Android (33/13; 420dpi; 1080x2400; Google/google; Pixel 7; panther; panther; en_US; 458229237)",
  "Instagram 275.0.0.27.98 Android (31/12; 440dpi; 1080x2340; samsung; SM-G991B; o1s; exynos2100; en_US; 458229237)",
  "Instagram 275.0.0.27.98 Android (30/11; 480dpi; 1080x2340; OnePlus; IN2023; OnePlus9Pro; qcom; en_US; 458229237)",
];

const WEB_USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

export function getRandomUserAgent(mobile = false): string {
  const agents = mobile ? MOBILE_USER_AGENTS : WEB_USER_AGENTS;
  return agents[Math.floor(Math.random() * agents.length)];
}

export function generateSignature(data: string): string {
  const sigKey =
    "9193488027538fd3450b83b7d05286d4ca9599a0f7eeed90d8c85925698a05dc";
  const sigVersion = "4";
  const signature = crypto
    .createHmac("sha256", sigKey)
    .update(data)
    .digest("hex");
  return `ig_sig_key_version=${sigVersion}&signed_body=${signature}.${encodeURIComponent(data)}`;
}

export function parseCount(countStr: string): number {
  const cleaned = countStr.replace(/[,\s]/g, "").toUpperCase();
  if (cleaned.endsWith("K"))
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000);
  if (cleaned.endsWith("M"))
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000);
  if (cleaned.endsWith("B"))
    return Math.round(parseFloat(cleaned.slice(0, -1)) * 1000000000);
  return parseInt(cleaned, 10) || 0;
}

export const NON_PROFILE_PATHS = new Set([
  "p",
  "explore",
  "stories",
  "reels",
  "accounts",
  "about",
  "legal",
  "privacy",
  "terms",
  "help",
  "api",
  "developer",
  "press",
  "blog",
  "jobs",
  "brand",
  "direct",
  "tv",
  "lite",
  "download",
  "session",
  "challenge",
  "login",
  "signup",
  "nametag",
  "directory",
  "emails",
  "settings",
]);

// Common TLDs that might get matched as usernames
const DOMAIN_TLDS = new Set([
  "com",
  "org",
  "net",
  "io",
  "co",
  "me",
  "app",
  "dev",
  "ai",
  "edu",
  "gov",
  "info",
  "biz",
  "us",
  "uk",
  "de",
  "fr",
  "ru",
]);

export function isValidUsername(username: string): boolean {
  // Must be 1-30 chars, alphanumeric with underscores and dots
  if (!/^[a-zA-Z0-9_.]{1,30}$/.test(username)) return false;

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(username)) return false;

  // Filter out things that look like domains (e.g., "duckduckgo.com")
  if (username.includes(".")) {
    const parts = username.split(".");
    const lastPart = parts[parts.length - 1].toLowerCase();
    if (DOMAIN_TLDS.has(lastPart)) return false;
  }

  // Filter out very short usernames that are likely noise
  if (username.length < 2) return false;

  // Filter out if it's a non-profile path
  if (NON_PROFILE_PATHS.has(username.toLowerCase())) return false;

  return true;
}

export function extractUsernamesFromHtml(html: string): string[] {
  const usernames: string[] = [];

  // Extract from instagram.com URLs - be more specific to avoid partial matches
  const igUrlPattern =
    /instagram\.com\/([a-zA-Z0-9_.]{1,30})(?:\/|\?|$|"|\s)/gi;

  const matches = html.matchAll(igUrlPattern);
  for (const match of matches) {
    const username = match[1].toLowerCase();
    if (isValidUsername(username) && !usernames.includes(username)) {
      usernames.push(username);
    }
  }

  // Extract @mentions - but be careful not to match emails
  const mentionPattern =
    /(?:^|[^\w.])@([a-zA-Z][a-zA-Z0-9_.]{0,29})(?:[^\w]|$)/g;
  const mentionMatches = html.matchAll(mentionPattern);
  for (const match of mentionMatches) {
    const username = match[1].toLowerCase();
    if (isValidUsername(username) && !usernames.includes(username)) {
      usernames.push(username);
    }
  }

  return usernames;
}

export function looksLikeUsername(str: string): boolean {
  // Use the same validation as isValidUsername
  return isValidUsername(str);
}
