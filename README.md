<p align="center">
    <img src="https://github.com/blackeko/yesitsme/blob/media/logo.png" alt="yesitsme logo">
</p>

# Yes, it's me! Workspace

**Based on the original [yesitsme](https://github.com/0x0be/yesitsme/) by [0x0be](https://github.com/0x0be)**

---

## Overview

Yes, it's me! Workspace transforms the original yesitsme Python OSINT script into a web application with:

- **Real-time Results** - Watch matches stream in as they're found
- **Secure by Design** - PII is hashed, never stored raw
- **Multi-user Support** - OAuth authentication with per-user isolation
- **Premium UX** - Clean, Apple-like interface with smooth animations
- **Abuse Prevention** - Rate limiting, anomaly detection, audit logging

---

## Tech Stack

| Layer        | Technologies                                              |
| ------------ | --------------------------------------------------------- |
| **Frontend** | Next.js 15+, TypeScript, TailwindCSS 4, shadcn/ui, Motion |
| **Backend**  | Convex (database + functions), Convex Auth                |
| **Security** | HMAC-SHA-256, AES-256-GCM, HKDF key derivation            |
| **Tooling**  | pnpm, ESLint, Prettier, Zod                               |

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Convex account (free tier available)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/yesitsme.git
cd yesitsme

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### 2. Initialize Convex

```bash
# Initialize Convex (follow prompts to create project)
npx convex dev
```

This will auto-populate your `.env.local` with the deployment URLs.

### 3. Setup Convex Auth

```bash
# Initialize authentication
npx @convex-dev/auth
```

Follow the prompts to configure OAuth providers (GitHub, Google, etc.).

### 4. Setup Encryption Keys (Required)

The app requires encryption keys for secure data storage. **These must be set in Convex, not in `.env.local`.**

Generate the keys:

```bash
node -e "const c=require('crypto'); console.log('MASTER_KEY=' + c.randomBytes(32).toString('hex')); console.log('APP_SALT=' + c.randomBytes(16).toString('hex'))"
```

Then set them in Convex:

```bash
npx convex env set MASTER_KEY <your-64-char-hex-value>
npx convex env set APP_SALT <your-32-char-hex-value>
```

Or set them via the [Convex Dashboard](https://dashboard.convex.dev) under **Settings → Environment Variables**.

| Variable     | Length                  | Purpose                |
| ------------ | ----------------------- | ---------------------- |
| `MASTER_KEY` | 64 hex chars (32 bytes) | AES-256-GCM encryption |
| `APP_SALT`   | 32 hex chars (16 bytes) | HKDF key derivation    |

### 5. Start Development

```bash
# Terminal 1: Convex backend (keep running)
npx convex dev

# Terminal 2: Next.js frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### Dashboard

- View all lookup jobs with status indicators
- Quick access to create new lookups
- Summary statistics

### Lookup Jobs

- Enter name (required) + email/phone (optional)
- Real-time progress tracking
- Cancel running jobs

### Results

- Sortable, filterable results table
- Match score (0-100) with explanations
- Profile details (bio, follower count, verified status)
- Export capabilities

### Settings

- Instagram session management
- Search depth preferences (basic/deep/exhaustive)
- Rate limit usage
- Data retention controls

---

## Security

### Data Protection

- **No raw PII storage** - Email/phone hashed with HMAC-SHA-256
- **Field-level encryption** - Profile data encrypted with AES-256-GCM
- **Key derivation** - HKDF with versioned keys for rotation support

### Access Control

- OAuth authentication (GitHub, Google)
- Row-level authorization
- Users can only access their own data

### Abuse Prevention

- Per-user rate limits (daily/hourly/concurrent)
- Request throttling with jitter
- Anomaly detection and blocking
- Full audit logging

---

## Architecture

```
Frontend (Next.js)          Backend (Convex)           External
─────────────────           ────────────────           ────────
     │                           │
     │ ←── Real-time ──→ Queries │
     │     subscriptions         │
     │                           │
     │ ────── Create ────→ Mutations ──→ Database
     │         Job               │
     │                           │
     │                     Actions ──────────→ Search Engines
     │ ←── Stream ───────  (Node.js)          Instagram APIs
     │     results               │
```

See [OVERVIEW.md](./OVERVIEW.md) for detailed architecture documentation.
See [convex/README.md](./convex/README.md) for backend API documentation.

---

## Development

```bash
# Start Convex dev server (terminal 1)
npx convex dev

# Start Next.js dev server (terminal 2)
pnpm dev

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Format code
pnpm format
```

---

## Deployment

### Vercel (Frontend)

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
vercel
```

### Convex (Backend)

```bash
# Deploy to production
npx convex deploy

# Set production environment variables
npx convex env set MASTER_KEY <value> --prod
npx convex env set APP_SALT <value> --prod
```

---

## Credits

This project is inspired by and builds upon:

- **[yesitsme](https://github.com/0x0be/yesitsme/)** by [0x0be](https://github.com/0x0be) - Original Python OSINT script
- **[Toutatis](https://github.com/megadose/toutatis)** - Instagram OSINT tool

---

## Legal Disclaimer

This tool is intended for:

- Legitimate OSINT research
- Authorized security assessments
- Personal use with consent

Users must:

- Only research individuals they have authorization to investigate
- Comply with all applicable laws and regulations
- Not use for stalking, harassment, or unauthorized surveillance

The developers are not responsible for misuse of this tool.

---

## License

MIT License - See [LICENSE](./LICENSE) for details.

---

## Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request
