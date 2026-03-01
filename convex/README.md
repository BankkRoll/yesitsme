# Convex Backend - # Yes, it's me! Workspace

Backend for the Instagram profile lookup system using Convex serverless functions.

## Architecture

```
convex/
├── _generated/          # Auto-generated types (do not edit)
├── actions/
│   ├── providers/
│   │   ├── instagram.ts # Multi-method Instagram scraping
│   │   └── types.ts     # Provider interfaces
│   └── runLookup.ts     # Main lookup orchestration
├── lib/
│   ├── crypto.ts        # Encryption utilities (AES-256-GCM, HMAC)
│   └── scoring.ts       # Match scoring algorithm (Jaro-Winkler)
├── schema.ts            # Database schema definitions
├── auth.ts              # Convex Auth configuration
├── jobs.ts              # Job CRUD operations
├── settings.ts          # User settings (queries/mutations)
└── settingsNode.ts      # Settings with Node.js (encryption actions)
```

## Database Schema

### `lookupJobs`

Stores lookup job state and progress.

| Field                          | Type                                                       | Description                          |
| ------------------------------ | ---------------------------------------------------------- | ------------------------------------ |
| `userId`                       | `string`                                                   | Owner's user ID                      |
| `createdAt`                    | `number`                                                   | Unix timestamp (ms)                  |
| `status`                       | `"queued" \| "running" \| "done" \| "error" \| "canceled"` | Job state                            |
| `input.name`                   | `string`                                                   | Search query (name/username)         |
| `input.emailHash`              | `string?`                                                  | Optional email (for future matching) |
| `input.phoneHash`              | `string?`                                                  | Optional phone (for future matching) |
| `input.notes`                  | `string?`                                                  | User notes                           |
| `progress.totalCandidates`     | `number`                                                   | Total profiles to process            |
| `progress.processedCandidates` | `number`                                                   | Profiles processed                   |
| `errorMessage`                 | `string?`                                                  | Error details if failed              |
| `finishedAt`                   | `number?`                                                  | Completion timestamp                 |
| `keyVersion`                   | `number`                                                   | Encryption key version               |

**Indexes:**

- `by_userId_createdAt` - List user's jobs
- `by_userId_status` - Find running/queued jobs

### `lookupResults`

Stores encrypted profile matches for each job.

| Field                    | Type                                                 | Description                  |
| ------------------------ | ---------------------------------------------------- | ---------------------------- |
| `jobId`                  | `Id<"lookupJobs">`                                   | Parent job reference         |
| `createdAt`              | `number`                                             | Unix timestamp (ms)          |
| `username`               | `string`                                             | Instagram username           |
| `source`                 | `"public_scrape" \| "official_api" \| "placeholder"` | Data source                  |
| `encryptedProfile`       | `string`                                             | AES-256-GCM encrypted JSON   |
| `nonce`                  | `string`                                             | Encryption nonce (base64)    |
| `keyVersion`             | `number`                                             | Key version for decryption   |
| `signals.nameMatch`      | `"none" \| "weak" \| "strong"`                       | Name match strength          |
| `signals.emailHintMatch` | `MatchLevel?`                                        | Email hint match             |
| `signals.phoneHintMatch` | `MatchLevel?`                                        | Phone hint match             |
| `score`                  | `number`                                             | Match score (0-100)          |
| `explain`                | `string[]`                                           | Human-readable score reasons |
| `isVerified`             | `boolean?`                                           | Instagram verified badge     |
| `isPrivate`              | `boolean?`                                           | Private account flag         |

**Indexes:**

- `by_jobId_score` - Results sorted by score
- `by_jobId_username` - Dedupe by username

### `userSettings`

User preferences and encrypted session storage.

| Field                 | Type                                 | Description                             |
| --------------------- | ------------------------------------ | --------------------------------------- |
| `userId`              | `string`                             | User ID                                 |
| `encryptedSessionId`  | `string?`                            | AES-256-GCM encrypted Instagram session |
| `sessionIdNonce`      | `string?`                            | Encryption nonce                        |
| `sessionIdKeyVersion` | `number?`                            | Key version                             |
| `sessionIdSetAt`      | `number?`                            | When session was saved                  |
| `sessionIdValid`      | `boolean?`                           | Whether session is working              |
| `defaultSearchDepth`  | `"basic" \| "deep" \| "exhaustive"?` | Preferred search depth                  |
| `updatedAt`           | `number`                             | Last update timestamp                   |

### `auditLogs`

Security audit trail for compliance.

| Field          | Type      | Description                     |
| -------------- | --------- | ------------------------------- |
| `action`       | `string`  | Action type (JOB_CREATED, etc.) |
| `userId`       | `string`  | Who performed action            |
| `resourceType` | `string`  | Resource type affected          |
| `resourceId`   | `string?` | Resource ID                     |
| `metadata`     | `any?`    | Additional context              |
| `createdAt`    | `number`  | Timestamp                       |

### `securityEvents`

Security anomaly detection.

| Field       | Type      | Description                   |
| ----------- | --------- | ----------------------------- |
| `eventType` | `string`  | RATE_LIMIT_HIT, ANOMALY, etc. |
| `userId`    | `string?` | Associated user               |
| `jobId`     | `Id?`     | Associated job                |
| `metadata`  | `any`     | Event details                 |
| `createdAt` | `number`  | Timestamp                     |

---

## API Reference

### Queries (Read-only, Reactive)

#### `jobs.list`

List all jobs for current user, newest first.

```ts
const jobs = useQuery(api.jobs.list);
// Returns: LookupJob[]
```

#### `jobs.get`

Get single job by ID (with ownership check).

```ts
const job = useQuery(api.jobs.get, { jobId });
// Returns: LookupJob | null
```

#### `jobs.getResults`

Get results for a job, sorted by score descending.

```ts
const results = useQuery(api.jobs.getResults, {
  jobId,
  limit: 50, // Optional, default 100
  minScore: 30, // Optional, filter low scores
});
// Returns: LookupResult[]
```

#### `jobs.getStats`

Get user's job statistics and rate limit info.

```ts
const stats = useQuery(api.jobs.getStats);
// Returns: { totalJobs, runningJobs, completedToday, dailyLimit, dailyUsed }
```

#### `settings.get`

Get user settings (session status, search depth).

```ts
const settings = useQuery(api.settings.get);
// Returns: { hasSessionId, sessionIdValid, sessionIdSetAt, defaultSearchDepth }
```

#### `settings.hasSessionId`

Quick check if user has session configured.

```ts
const hasSession = useQuery(api.settings.hasSessionId);
// Returns: boolean
```

### Mutations (Write Operations)

#### `jobs.create`

Create a new lookup job.

```ts
const createJob = useMutation(api.jobs.create);
const jobId = await createJob({
  name: "john doe", // Required: search query
  email: "john@example.com", // Optional: for matching
  phone: "+1234567890", // Optional: for matching
  notes: "Looking for...", // Optional: user notes
});
```

**Rate Limits:**

- 20 jobs/day
- 5 jobs/hour
- 1 concurrent job (running or queued)

#### `jobs.cancel`

Cancel a running or queued job.

```ts
const cancelJob = useMutation(api.jobs.cancel);
await cancelJob({ jobId });
```

#### `jobs.remove`

Delete a job and its results (cannot delete running jobs).

```ts
const removeJob = useMutation(api.jobs.remove);
await removeJob({ jobId });
```

#### `settings.clearSessionId`

Remove stored Instagram session.

```ts
const clearSession = useMutation(api.settings.clearSessionId);
await clearSession();
```

#### `settings.updateSearchDepth`

Set default search depth preference.

```ts
const updateDepth = useMutation(api.settings.updateSearchDepth);
await updateDepth({ depth: "deep" }); // "basic" | "deep" | "exhaustive"
```

### Actions (Node.js Runtime)

#### `settingsNode.saveSessionId`

Encrypt and store Instagram session ID.

```ts
const saveSession = useAction(api.settingsNode.saveSessionId);
await saveSession({ sessionId: "your_instagram_sessionid_here" });
```

---

## Search Methods

The Instagram provider uses multiple search methods with fallbacks:

| Method               | Auth Required | Rate Limit Risk | Coverage |
| -------------------- | ------------- | --------------- | -------- |
| DuckDuckGo HTML      | No            | Low             | Good     |
| Google HTML          | No            | Medium          | Good     |
| Bing HTML            | No            | Medium          | Fair     |
| Instagram Web API    | Yes (session) | High            | Best     |
| Instagram Mobile API | Yes (session) | High            | Best     |

**Search Depth Levels:**

| Depth        | Max Candidates | Methods Used                                     |
| ------------ | -------------- | ------------------------------------------------ |
| `basic`      | 20             | DDG, Google (stops early if enough found)        |
| `deep`       | 50             | DDG, Google, Bing, + Mobile API if authenticated |
| `exhaustive` | 100            | All methods including Instagram Web API          |

---

## Scoring Algorithm

Profiles are scored 0-100 based on match signals:

| Signal                    | Points | Condition                         |
| ------------------------- | ------ | --------------------------------- |
| Username exact match      | 50     | Normalized username equals search |
| Username contains search  | 50     | Username includes search term     |
| Name exact match          | 60     | Full name exactly matches         |
| Name contains all parts   | 60     | All search words found in name    |
| High name similarity      | 60     | Jaro-Winkler >= 0.90              |
| Partial name similarity   | 25     | Jaro-Winkler 0.75-0.90            |
| Partial name match        | 25     | Any search word found in name     |
| Weak username similarity  | 20     | Jaro-Winkler 0.70-0.85            |
| Email hint match (strong) | 25     | Hash matches provided email       |
| Phone hint match (strong) | 25     | Hash matches provided phone       |
| Verified badge            | 5      | Account is verified               |

**Minimum Score:** Results below 10 are discarded.

---

## Security

### Encryption

- **Algorithm:** AES-256-GCM with random 12-byte nonces
- **Key Derivation:** HKDF-SHA256 from master key
- **What's Encrypted:**
  - Instagram session IDs
  - Profile data (bio, follower counts, etc.)

### Key Management

```
MASTER_KEY (env) → HKDF → K_hash (for HMAC)
                        → K_enc (for AES-GCM)
```

### Rate Limiting

| Limit           | Value                    |
| --------------- | ------------------------ |
| Jobs per day    | 20                       |
| Jobs per hour   | 5                        |
| Concurrent jobs | 1                        |
| Request delay   | 800-1300ms (with jitter) |

---

## Environment Variables

Set these in Convex dashboard or via CLI:

```bash
# Required for encryption (server-side only)
npx convex env set MASTER_KEY <64-char-hex-string>
npx convex env set APP_SALT <32-char-hex-string>
```

Generate secure values:

```bash
node -e "const c=require('crypto');console.log('MASTER_KEY='+c.randomBytes(32).toString('hex'));console.log('APP_SALT='+c.randomBytes(16).toString('hex'))"
```

---

## Development

```bash
# Start Convex dev server
npx convex dev

# Deploy to production
npx convex deploy

# View logs
npx convex logs

# Set environment variable
npx convex env set KEY value

# List environment variables
npx convex env list
```

---

## Internal Functions

These are called by the system, not directly by clients:

- `internal.jobs.updateStatus` - Update job status/progress
- `internal.jobs.insertResult` - Store a lookup result
- `internal.settings.storeEncryptedSessionId` - Store encrypted session
- `internal.settings.getEncryptedSessionData` - Get encrypted session for decryption
- `internal.settingsNode.getDecryptedSessionId` - Decrypt session for use in lookups
- `internal.actions.runLookup.startLookup` - Execute the lookup workflow
