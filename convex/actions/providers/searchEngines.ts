"use node";

import * as cheerio from "cheerio";
import {
  getRandomUserAgent,
  extractUsernamesFromHtml,
  isValidUsername,
} from "./utils";

export interface SearchResult {
  usernames: string[];
  source: string;
}

export async function searchDuckDuckGo(query: string): Promise<SearchResult> {
  const searchQuery = `site:instagram.com "${query}"`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const usernames = extractUsernamesWithCheerio(html);

  return { usernames, source: "duckduckgo" };
}

export async function searchGoogle(query: string): Promise<SearchResult> {
  const searchQuery = `site:instagram.com "${query}"`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const usernames = extractUsernamesWithCheerio(html);

  return { usernames, source: "google" };
}

export async function searchBing(query: string): Promise<SearchResult> {
  const searchQuery = `site:instagram.com "${query}"`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const usernames = extractUsernamesWithCheerio(html);

  return { usernames, source: "bing" };
}

function extractUsernamesWithCheerio(html: string): string[] {
  const $ = cheerio.load(html);
  const usernames: string[] = [];

  // First extract using regex-based method
  const basicUsernames = extractUsernamesFromHtml(html);
  for (const username of basicUsernames) {
    if (!usernames.includes(username)) {
      usernames.push(username);
    }
  }

  // Then extract from specific HTML elements (links, citations)
  $("a[href*='instagram.com'], cite, .result__url").each((_, el) => {
    const href = $(el).attr("href") || $(el).text();
    // Match instagram.com/username but stop at next slash, query param, or end
    const match = href.match(
      /instagram\.com\/([a-zA-Z0-9_.]{1,30})(?:\/|\?|$)/i,
    );
    if (match && match[1]) {
      const username = match[1].toLowerCase();
      if (isValidUsername(username) && !usernames.includes(username)) {
        usernames.push(username);
      }
    }
  });

  return usernames;
}
