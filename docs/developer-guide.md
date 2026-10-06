# Developer guide

Note Scribe is a Next.js 16 app (App Router, Server Actions) on Supabase (Auth, Storage, Postgres) with Prisma 7 and Google Gemini. Package manager: **pnpm**. Node 20 or newer.

## Setup

1. `pnpm install` (runs `prisma generate`).
2. Copy `.env.example` to `.env.local` and fill it in:

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project (Project Settings → API) |
   | `DATABASE_URL` | Pooled Postgres connection (port 6543), used by the app |
   | `DIRECT_URL` | Direct connection (port 5432), used by Prisma migrations |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (Project Settings → API). Server only. Needed for uploads and file deletion |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key; leave empty to skip the challenge locally |
   | `AI_DAILY_REQUEST_BUDGET` | AI requests allowed across all users per 24 h (default 300) |
   | `AI_MAX_CONCURRENT` | Generations that may run at once, server-wide (default 5) |
   | `STORAGE_QUOTA_MB` | Stored source files per user (default 100) |
   | `CSP_ENFORCE` | `true` to enforce the Content Security Policy; otherwise report-only (default) |
   | `GEMINI_API_KEY` | Google AI Studio key |
   | `GEMINI_NOTES_MODELS`, `GEMINI_QUIZ_MODELS`, `GEMINI_FLASHCARD_MODELS` | Optional comma-separated model lists in order of preference |

   `prisma7.config.ts` loads `.env.local` for the Prisma CLI.

3. `pnpm db:migrate` then `pnpm db:storage` (creates the bucket and its policies; safe to re-run).
4. In the Supabase dashboard:
   - Authentication → URL Configuration: set the Site URL and add `<site>/auth/callback` to the redirect URLs.
   - Authentication → Sign In / Providers → Email: keep **Confirm email** on. Uploads and AI generation are refused for unconfirmed accounts.
   - Authentication → Attack Protection: enable **Captcha protection** with provider **Turnstile** and paste the Turnstile *secret* key (the *site* key goes in `.env.local`). Also enable **leaked password protection**.
   - Re-run `pnpm db:storage` after upgrading from a version that had user upload policies; it removes them.
5. `pnpm dev`, then open http://localhost:3000.

### Before real users

- Enable billing (Tier 1) on the Gemini API key: free-tier prompts and responses may be used by Google to improve its products, which is not acceptable for users' study material (see [security.md](./security.md#6a-provider-terms-that-affect-the-plan-checked-2026-10-05)).
- Set a billing cap in Google AI Studio and usage alerts in Supabase.
- Raise `STORAGE_QUOTA_MB` and `AI_DAILY_REQUEST_BUDGET` to match the plans you are on.
- Replace the Turnstile test keys with real ones and set `CSP_ENFORCE=true` once no `[csp]` reports appear.

## Scripts

| Script | Does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build and server |
| `pnpm lint` | ESLint |
| `pnpm tsc --noEmit` | Type check |
| `pnpm db:migrate` | `prisma migrate deploy` (applies pending migrations; safe for shared databases) |
| `pnpm db:storage` | Runs `prisma/storage.sql` |
| `pnpm storage:cleanup` | Deletes stored files no note refers to (older than a day); run on a schedule |
| `sh scripts/vercel-build.sh` | Vercel's build command: on Production builds runs `db:migrate` and `db:storage`, then `next build`; other builds just `next build` |
| `pnpm prisma migrate dev --name <change>` | Create a migration from schema changes (development database only) |

## Schema changes

Edit `prisma/schema.prisma`, run `pnpm prisma migrate dev --name <intent>` against a development database, read the generated SQL, and commit the schema together with the new folder under `prisma/migrations`. **Restart `pnpm dev` after any schema change:** the Prisma client is cached on `globalThis` across hot reloads, so the running server keeps the old client (symptom: `Cannot read properties of undefined (reading 'count')` on a new model). Never use `db push` or `migrate dev` on a shared database. New tables must have `ENABLE ROW LEVEL SECURITY` added in the migration (see the init migration) so they are not exposed through the Supabase REST API.

## Conventions

- **Layering** (see [architecture.md](./architecture.md)): pages read through services; Server Actions authenticate, validate, call one service and revalidate; only repositories import Prisma; `src/server/**` imports `server-only`.
- **Validation:** every untrusted input is parsed with a zod schema from `src/lib/validation.ts` at the entry point (`parseInput`). Services receive typed input.
- **Errors:** throw `AppError` (or `NotFoundError`) with a message written for the user. Unknown errors are logged and shown as a generic message. Never put secrets or internals in messages.
- **Ownership:** every repository query includes `userId`. Never query by id alone.
- **Client components:** mark with `"use client"`, keep them presentational, and call Server Actions from `src/app/actions`. Multi-step flows belong in a hook (`src/hooks`).
- **UI:** use `src/components/ui` primitives, `PageHeader`/`EmptyState`, `ConfirmDialog` for destructive actions, toasts for action outcomes, and theme tokens rather than fixed colours. Everything must work at phone width.
- **Copy:** plain, friendly English; errors say what to do next.
- **Before handing back:** `pnpm tsc --noEmit`, `pnpm lint` and `pnpm build` must pass.

## Adding or changing a feature

Use this checklist for every change:

1. Schema change → migration + RLS enabled on new tables (`prisma/`).
2. Repository function(s) scoped by user (`src/server/repositories`).
3. Service with the business rules (`src/server/services`).
4. zod schema for new input (`src/lib/validation.ts`) and a thin Server Action (`src/app/actions`).
5. UI: page or client component; mobile layout checked in both themes.
6. New environment variable → `.env.example` and the table above.
7. New limit or constant → `src/lib/constants.ts` and the limits table in [features.md](./features.md).
8. **Documentation:** update [features.md](./features.md) (behaviour), [architecture.md](./architecture.md) (structure, data model, flows) and this file (setup, scripts, conventions) as applicable, and add an entry to [changelog.md](./changelog.md). A change is not finished until its documentation is updated.

## Content Security Policy roll-out

The policy is report-only by default. After deploying, use the app normally and watch the server log for `[csp]` lines (also sent by browsers to `/api/csp-report`). Fix or allow anything reported, then set `CSP_ENFORCE=true`. If a third-party script is added later, it must be loaded by a nonce-carrying script (for example `next/script`), and any new origin it talks to must be added in `src/lib/security-headers.ts`.

## Testing status

There is no automated test suite yet. Services and repositories are plain functions that can be exercised against a local Postgres (apply the migrations with `DIRECT_URL` pointing at it); the Gemini module can be run outside Next.js with `tsx --conditions=react-server`. Flows that need a signed-in browser session (uploads, generation from the UI) are verified manually.
