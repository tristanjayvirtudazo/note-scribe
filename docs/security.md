# Security plan

Status: steps 1 (cost and abuse), 2 (browser hardening), 3 (accounts) and 5 (calendar feed) **implemented** on 2026-10-05. Step 4 (social sign-in) is **deferred** until developer accounts are available; step 6 (operations) is on the owner's dashboards. This document is the agreed baseline that new features (social sign-in, calendar) must build on. Items are marked ✅ in place, 🔲 planned.

## 1. What we are protecting

| Asset | Why it matters |
| --- | --- |
| User accounts and sessions | Takeover exposes a person's notes and files |
| Uploaded files and notes | Private study material, sometimes personal |
| AI credits (Gemini) | Every generation costs money or free-tier quota; abuse is a direct cost |
| Storage and database capacity | Unbounded uploads or rows cost money and degrade service |
| Secrets (service keys, OAuth client secrets, database URL) | Leak = full compromise |

## 2. Threat model

Who could cause harm and how:

1. **Anonymous abuser** — scripts creating many accounts to burn AI credits and storage, or hammering sign-in/reset endpoints.
2. **Signed-in abuser** — a real account pushing past intended limits (uploads straight to storage, concurrent generations, oversized inputs).
3. **Attacker targeting another user** — guessing ids, tampering with action parameters, open redirects, session theft via XSS, OAuth account-linking tricks.
4. **Malicious content** — uploaded documents containing instructions for the AI, Markdown that renders scripts or phishing links.
5. **Operational failure** — leaked keys, missing backups, dependency vulnerabilities, no alerts until the bill arrives.

## 3. Current controls

| Area | Control | Status |
| --- | --- | --- |
| Authorization | `requireUser()` on every page and action; every query scoped by user id; ids validated as UUIDs; ownership checked before writes | ✅ |
| Database exposure | Row level security enabled (no policies) on all tables, including `_prisma_migrations`; Prisma is the only path | ✅ |
| Storage | Private bucket; per-user folder policies; server-issued signed upload targets; server verifies files exist before saving | ✅ |
| Input validation | zod at every entry point with length and count limits | ✅ |
| Sessions | Supabase cookies via `@supabase/ssr`; verified with `getClaims()` in the proxy and `getUser()` in the DAL | ✅ |
| CSRF | Next.js Server Actions reject cross-origin requests | ✅ |
| Open redirect | `/auth/callback` only follows same-site relative paths | ✅ |
| Enumeration | Sign-up, sign-in and reset return the same message whether or not the account exists | ✅ |
| AI prompt injection | Documents and user text are framed as material, not instructions; structured JSON output validated with zod | ✅ |
| Rendering | `react-markdown` without raw HTML; user text rendered as text | ✅ |
| Cost limits | Per-user daily caps (20 notes, 40 quizzes, 20 flashcard batches); one generation per note at a time; model fallback with cooldowns | ✅ (partial) |

## 4. Gaps and the plan

### 4.1 Cost and abuse (highest priority)

| # | Gap | Measure | Status |
| --- | --- | --- | --- |
| C1 | Unlimited free accounts can each spend the daily caps | Require a **confirmed email** before uploads and AI generation (`requireVerifiedUser`, checks `email_confirmed_at`), and Cloudflare **Turnstile** on sign-up, sign-in and password reset (token verified by Supabase; see developer-guide.md for the dashboard settings) | ✅ |
| C2 | No global ceiling: many accounts × per-user caps = unbounded spend | **`ai_usage` table** records every request (user, task, model, tokens, outcome, including failures); `aiBudgetService.run` enforces a **global daily request budget** (`AI_DAILY_REQUEST_BUDGET`, default 300) before each call | ✅ |
| C3 | Only notes have an in-flight guard | `aiBudgetService.run` allows 1 generation per user and `AI_MAX_CONCURRENT` (default 5) server-wide, for notes, quizzes and flashcards alike | ✅ |
| C4 | Storage policy lets a signed-in user upload any number of objects directly, bypassing the 5-file rule | User insert/delete policies removed (`prisma/storage.sql`); upload targets, listing and deletion use the **service-role key** (`src/server/supabase-admin.ts`); **per-user storage quota** `STORAGE_QUOTA_MB` (default 100, suited to Supabase's 1 GB free plan) checked before issuing targets; `pnpm storage:cleanup` removes orphaned objects older than a day | ✅ |
| C5 | Provider-side limits not set | Google AI Studio: billing alerts / hard cap. Supabase: usage alerts, auth rate limits reviewed. Never run without a spend ceiling | 🔲 (ops) |
| C6 | Long actions (`maxDuration = 300`) can be held open | Bounded by the concurrency limit; Gemini HTTP calls time out at 120 s | ✅ |

### 4.2 Authentication and accounts

| # | Gap | Measure | Status |
| --- | --- | --- | --- |
| A1 | Weak-password reuse | Supabase **leaked-password protection** (dashboard setting, see developer-guide.md); 8-character minimum kept | ✅ (config) |
| A2 | No way for a user to end other sessions | After any password change or reset, every *other* session is signed out (`signOut({ scope: "others" })`) | ✅ |
| A3 | No account deletion | Settings → **Delete account** (type DELETE to confirm): removes stored files, all rows by cascade, then the auth user via the service role; redirects to the landing page | ✅ |
| A4 | Social sign-in | See §5 | ⏸ deferred (needs Google Cloud and Apple Developer accounts) |
| A5 | MFA | Optional TOTP later; not required for launch | ⏸ |

### 4.3 Browser hardening

| # | Gap | Measure | Status |
| --- | --- | --- | --- |
| B1 | No security headers | `next.config.ts` sets `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and removes `X-Powered-By` | ✅ |
| B2 | No Content-Security-Policy | Per-request nonce generated in `src/proxy.ts`; policy in `src/lib/security-headers.ts` (`script-src 'nonce' 'strict-dynamic'`, `connect-src` self + Supabase, `frame-src` Turnstile, `object-src 'none'`, `frame-ancestors 'none'`). **Report-only** until `CSP_ENFORCE=true`; violations are logged as `[csp]` lines by `/api/csp-report`. All pages render dynamically so the nonce applies | ✅ (report-only) |
| B3 | Markdown links | Links in notes open in a new tab with `rel="noopener noreferrer nofollow"`; react-markdown drops `javascript:` and `data:` URLs | ✅ |

### 4.4 Secrets and operations

| # | Gap | Measure | Status |
| --- | --- | --- | --- |
| O1 | Service-role key will be introduced (C4, A3) | Server-only module `src/server/supabase-admin.ts`; never prefixed `NEXT_PUBLIC_`; never passed to the browser or logged | ✅ |
| O2 | Key hygiene | Rotate the Gemini key before launch; keep `.env.local` out of git (already ignored); production secrets only in the host's secret store | 🔲 (ops) |
| O3 | Dependency risk | `shadcn` CLI moved to devDependencies (the one `pnpm audit` finding is build-time only). Run `pnpm audit` in CI; enable automated dependency updates | ✅ (partial) |
| O4 | No error monitoring | Sentry (or similar) with PII scrubbing; alert on error spikes and on AI budget thresholds | 🔲 |
| O5 | Backups | Supabase daily backups (and PITR on paid plans); document restore steps | 🔲 (ops) |
| O6 | Logging | Never log file contents, tokens or email addresses; keep the existing `[ai]` usage lines; add request ids | 🔲 |

### 4.5 Data protection

- Files and notes are private to the account; the only sharing surface will be the calendar feed (§6), which must contain titles and dates only.
- Account deletion (A3) covers the right to erasure. A data export (JSON of notes, cards, scores) is a small follow-up.

## 5. Social sign-in (Google, Apple) — security requirements

Use Supabase Auth's providers with the PKCE flow through the existing `/auth/callback`. Requirements:

1. **Email verification from the provider.** Only accept identities where the provider reports the email as verified. Google and Apple both do; keep Supabase's automatic linking by email *only* because of that. If a future provider does not verify emails, linking must be manual.
2. **Apple private relay emails.** Users may sign in with a relay address. The profile email syncs from the auth user, so nothing breaks, but transactional emails will go through the relay; Apple requires the sender domain to be registered for relay delivery.
3. **Provider-only accounts have no password.** Settings must offer **Set a password** instead of **Change password** for those accounts (Supabase `updateUser({ password })` works without a current password only when none exists; the UI must branch on `app_metadata.providers`).
4. **Redirect allow-list.** Add the exact callback URL for each environment in Supabase; no wildcards in production.
5. **Nonce and state** are handled by Supabase; do not hand-roll OAuth.
6. **Scopes:** request only `openid email profile`. Calendar scopes are a separate consent (§6) and must not be bundled into sign-in.
7. **Account takeover check:** a sign-in with Google for an email that already has a password account must link to that account, not create a second profile. Our `syncFromAuth` keys on the auth user id, so this holds as long as Supabase links identities; test it explicitly.

## 6. Calendar integration — recommended approach

Two options were considered.

**A. Subscription feed (implemented):** a per-user, secret, read-only iCalendar feed (`webcal://…/calendar/<token>.ics`) listing each note's next review date and flashcards due. Works with Apple Calendar (iPhone, Mac), Google Calendar, Outlook and Android with no provider OAuth, no scopes and no tokens from Google or Apple stored on our side.

Security requirements:
- The token is random (32 bytes, base64url), stored **hashed** (SHA-256) in `profiles.calendar_token_hash`, shown once and **regenerable** (old feed stops working immediately). Malformed tokens are rejected before any database query.
- The feed is **read-only**, contains only note titles and dates (no file names, no scores), and sets `Cache-Control: private`.
- Served by `/calendar/[token]/feed.ics` with per-token rate limiting (60 requests per hour, in-process); unknown and malformed tokens both get a 404. The proxy skips this path, so no session work happens for feed fetches. Events older than 7 days are dropped.
- Plus an **"Add to calendar"** menu on the note page (Google and Outlook links, and an authenticated `.ics` download at `/notes/[id]/review.ics`) for a single review.

**B. Google Calendar API write access:** requires the `calendar.events` scope, storing refresh tokens (encrypted at rest), Google's OAuth verification review for a sensitive scope, and token revocation handling. Higher risk, more upkeep, and it only covers Google. Defer until there is a clear need.

## 6a. Provider terms that affect the plan (checked 2026-10-05)

- **Gemini free tier:** Google uses prompts and responses on the unpaid tier to improve its products and may have human reviewers read them, and asks that no sensitive or personal information be submitted. Users' uploaded study material is personal data. **Enable billing (Tier 1) before real users upload files**; paid usage is not used for training. Limits are per project; the free tier's exact numbers are shown only in the AI Studio dashboard.
- **Supabase free plan:** 1 GB of file storage in total, 50 MB per file, 5 GB egress per month, 500 MB database, projects pause after a week of inactivity. The per-user storage quota therefore defaults to 100 MB; raise `STORAGE_QUOTA_MB` (for example to 500) on the Pro plan, which includes 100 GB.

## 7. Implementation order

1. **Cost and abuse** (C1–C4, C6) and the service-role module (O1) — one migration (`ai_usage`, storage quota fields), storage policy change, limits.
2. **Browser hardening** (B1–B3) and dependency clean-up (O3).
3. **Account features** (A1–A3).
4. **Social sign-in** per §5, with explicit tests for account linking and the password-less settings path.
5. **Calendar feed** per §6.
6. **Operations** (C5, O2, O4, O5) alongside launch.

## 8. Rules for every future change

- No new data path without `requireUser()` and a user-scoped query.
- No new table without row level security enabled.
- No new secret without a server-only module and a `.env.example` entry.
- No new AI call outside `src/server/ai/gemini.ts`, and every call recorded in `ai_usage`.
- No new external integration without an entry in this document (threats, data shared, revocation).
- `pnpm audit` clean (or documented exceptions) before release.
