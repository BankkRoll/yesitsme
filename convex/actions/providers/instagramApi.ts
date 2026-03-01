"use node";

import * as crypto from "crypto";
import { PublicProfile } from "./types";
import { getRandomUserAgent, generateSignature, IG_APP_ID } from "./utils";

export async function searchInstagramWeb(
  query: string,
  sessionId: string,
): Promise<string[]> {
  const url = `https://www.instagram.com/web/search/topsearch/?context=blended&query=${encodeURIComponent(query)}&rank_token=0.${Date.now()}&include_reel=false`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      "X-IG-App-ID": IG_APP_ID,
      "X-Requested-With": "XMLHttpRequest",
      Cookie: `sessionid=${sessionId}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const usernames: string[] = [];

  if (data.users && Array.isArray(data.users)) {
    for (const item of data.users) {
      if (item.user?.username) {
        usernames.push(item.user.username.toLowerCase());
      }
    }
  }

  return usernames;
}

export async function searchInstagramMobile(
  query: string,
  sessionId: string,
): Promise<string[]> {
  const url = `https://i.instagram.com/api/v1/users/search/?q=${encodeURIComponent(query)}&count=30`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(true),
      "X-IG-App-ID": IG_APP_ID,
      Cookie: `sessionid=${sessionId}`,
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const usernames: string[] = [];

  if (data.users && Array.isArray(data.users)) {
    for (const user of data.users) {
      if (user.username) {
        usernames.push(user.username.toLowerCase());
      }
    }
  }

  return usernames;
}

export async function fetchProfileMobileApi(
  username: string,
  sessionId: string,
): Promise<PublicProfile | null> {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(true),
      "X-IG-App-ID": IG_APP_ID,
      Cookie: `sessionid=${sessionId}`,
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const user = data.data?.user;

  if (!user) return null;

  return {
    username: user.username,
    fullName: user.full_name,
    bio: user.biography,
    externalUrl: user.external_url,
    followerCount: user.edge_followed_by?.count,
    followingCount: user.edge_follow?.count,
    mediaCount: user.edge_owner_to_timeline_media?.count,
    isVerified: user.is_verified,
    isPrivate: user.is_private,
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
  };
}

export async function fetchProfileWebGraphQL(
  username: string,
  sessionId?: string,
): Promise<PublicProfile | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

  const headers: Record<string, string> = {
    "User-Agent": getRandomUserAgent(),
    "X-IG-App-ID": IG_APP_ID,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
  };

  if (sessionId) {
    headers["Cookie"] = `sessionid=${sessionId}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const user = data.data?.user;

  if (!user) return null;

  return {
    username: user.username,
    fullName: user.full_name,
    bio: user.biography,
    externalUrl: user.external_url,
    followerCount: user.edge_followed_by?.count,
    followingCount: user.edge_follow?.count,
    mediaCount: user.edge_owner_to_timeline_media?.count,
    isVerified: user.is_verified,
    isPrivate: user.is_private,
    profilePicUrl: user.profile_pic_url_hd || user.profile_pic_url,
  };
}

export async function advancedLookup(
  params: { email?: string; phone?: string },
  sessionId: string,
): Promise<{
  userId?: string;
  username?: string;
  emailHint?: string;
  phoneHint?: string;
  found: boolean;
} | null> {
  if (!params.email && !params.phone) {
    return null;
  }

  console.log(
    `[IG-API] Advanced lookup: email=${!!params.email} phone=${!!params.phone}`,
  );

  try {
    const lookupData: Record<string, string> = {};
    if (params.email) lookupData.email = params.email;
    if (params.phone) lookupData.phone = params.phone;

    const signedBody = generateSignature(JSON.stringify(lookupData));

    const response = await fetch(
      "https://i.instagram.com/api/v1/users/lookup/",
      {
        method: "POST",
        headers: {
          "User-Agent": getRandomUserAgent(true),
          "X-IG-App-ID": IG_APP_ID,
          "X-IG-Device-ID": crypto.randomUUID(),
          "X-IG-Android-ID": `android-${crypto.randomBytes(8).toString("hex")}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: `sessionid=${sessionId}`,
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: signedBody,
      },
    );

    if (!response.ok) {
      console.error(`[IG-API] Advanced lookup failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.user) {
      console.log(
        `[IG-API] Advanced lookup success: found @${data.user.username}`,
      );
      return {
        userId: data.user.pk?.toString(),
        username: data.user.username,
        emailHint: data.user.obfuscated_email,
        phoneHint: data.user.obfuscated_phone,
        found: true,
      };
    }

    console.log(`[IG-API] Advanced lookup: no user found`);
    return { found: false };
  } catch (err) {
    console.error(
      `[IG-API] Advanced lookup error: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}
