export type MatchLevel = "none" | "weak" | "strong";

export interface ScoringInput {
  targetName: string;
  profileName?: string;
  username?: string;
  emailHashMatch?: MatchLevel;
  phoneHashMatch?: MatchLevel;
  isVerified?: boolean;
}

export interface ScoringResult {
  score: number;
  signals: {
    nameMatch: MatchLevel;
    emailHintMatch?: MatchLevel;
    phoneHintMatch?: MatchLevel;
  };
  explain: string[];
}

function jaroWinkler(s1: string, s2: string): number {
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / a.length +
      matches / b.length +
      (matches - transpositions / 2) / matches) /
    3;

  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[._-]/g, "").replace(/\s+/g, "").trim();
}

function matchUsername(
  target: string,
  username?: string,
): { level: MatchLevel; reason?: string } {
  if (!username) {
    return { level: "none" };
  }

  const targetNorm = normalize(target);
  const usernameNorm = normalize(username);

  if (targetNorm === usernameNorm) {
    return { level: "strong", reason: `Username exact match: @${username}` };
  }

  if (usernameNorm.includes(targetNorm) && targetNorm.length >= 3) {
    return {
      level: "strong",
      reason: `Username contains search term: @${username}`,
    };
  }

  if (targetNorm.includes(usernameNorm) && usernameNorm.length >= 3) {
    return { level: "weak", reason: `Search contains username: @${username}` };
  }

  const similarity = jaroWinkler(targetNorm, usernameNorm);
  if (similarity >= 0.85) {
    return {
      level: "strong",
      reason: `Username similar (${Math.round(similarity * 100)}%): @${username}`,
    };
  }

  if (similarity >= 0.7) {
    return {
      level: "weak",
      reason: `Username partially similar (${Math.round(similarity * 100)}%): @${username}`,
    };
  }

  return { level: "none" };
}

function matchName(
  target: string,
  profile?: string,
): { level: MatchLevel; reason?: string } {
  if (!profile) {
    return { level: "none" };
  }

  const targetLower = target.toLowerCase().trim();
  const profileLower = profile.toLowerCase().trim();

  if (targetLower === profileLower) {
    return { level: "strong", reason: `Exact name match: "${profile}"` };
  }

  const targetParts = targetLower.split(/\s+/);
  const profileParts = profileLower.split(/\s+/);

  const allPartsFound = targetParts.every((part) =>
    profileParts.some((pp) => pp.includes(part) || part.includes(pp)),
  );

  if (allPartsFound && targetParts.length >= 2) {
    return {
      level: "strong",
      reason: `Name contains all parts: "${profile}"`,
    };
  }

  const similarity = jaroWinkler(targetLower, profileLower);

  if (similarity >= 0.9) {
    return {
      level: "strong",
      reason: `High similarity (${Math.round(similarity * 100)}%): "${profile}"`,
    };
  }

  if (similarity >= 0.75) {
    return {
      level: "weak",
      reason: `Partial similarity (${Math.round(similarity * 100)}%): "${profile}"`,
    };
  }

  const hasPartialMatch = targetParts.some(
    (part) => part.length > 2 && profileLower.includes(part),
  );

  if (hasPartialMatch) {
    return {
      level: "weak",
      reason: `Partial name match in: "${profile}"`,
    };
  }

  return { level: "none" };
}

export function calculateScore(input: ScoringInput): ScoringResult {
  const explain: string[] = [];
  let score = 0;

  const usernameResult = matchUsername(input.targetName, input.username);
  let usernameScore = 0;

  if (usernameResult.level === "strong") {
    usernameScore = 50;
    if (usernameResult.reason) explain.push(usernameResult.reason);
  } else if (usernameResult.level === "weak") {
    usernameScore = 20;
    if (usernameResult.reason) explain.push(usernameResult.reason);
  }

  const nameResult = matchName(input.targetName, input.profileName);
  let nameScore = 0;

  if (nameResult.level === "strong") {
    nameScore = 60;
    if (nameResult.reason) explain.push(nameResult.reason);
  } else if (nameResult.level === "weak") {
    nameScore = 25;
    if (nameResult.reason) explain.push(nameResult.reason);
  }

  score += Math.max(usernameScore, nameScore);

  const overallNameMatch: MatchLevel =
    nameResult.level === "strong" || usernameResult.level === "strong"
      ? "strong"
      : nameResult.level === "weak" || usernameResult.level === "weak"
        ? "weak"
        : "none";

  if (input.emailHashMatch === "strong") {
    score += 25;
    explain.push("Email hint matches (strong)");
  } else if (input.emailHashMatch === "weak") {
    score += 10;
    explain.push("Email hint partially matches");
  }

  if (input.phoneHashMatch === "strong") {
    score += 25;
    explain.push("Phone hint matches (strong)");
  } else if (input.phoneHashMatch === "weak") {
    score += 10;
    explain.push("Phone hint partially matches");
  }

  if (input.isVerified) {
    score += 5;
    explain.push("Account is verified");
  }

  score = Math.min(100, score);

  if (explain.length === 0) {
    explain.push("No matching signals found");
  }

  return {
    score,
    signals: {
      nameMatch: overallNameMatch,
      emailHintMatch: input.emailHashMatch,
      phoneHintMatch: input.phoneHashMatch,
    },
    explain,
  };
}
