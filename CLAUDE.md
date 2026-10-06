@AGENTS.md

# Note Scribe

Note Scribe turns uploaded study material (photos and PDFs) into editable study notes and quizzes. Users sign up with email and password, upload files into a note, get AI-written parts they can edit, organise notes by subject, and generate quizzes whose scores are saved.

Read the documentation before making changes:

- `docs/features.md` — every feature and its exact behaviour, limits and failure handling
- `docs/architecture.md` — layers, request flows, data model, security model, AI integration
- `docs/developer-guide.md` — setup, scripts, conventions, and the checklist for adding a feature
- `docs/deployment.md` — hosting requirements and deploy steps
- `docs/security.md` — threat model, controls and the rules every new feature must follow
- `docs/changelog.md` — dated record of changes

## Stack

Next.js 16 App Router (Server Components + Server Actions, Turbopack), React 19, TypeScript, Tailwind v4, shadcn/ui on Base UI, Supabase (Auth, Storage, Postgres), Prisma 7 with the `pg` adapter, Google Gemini via `@google/genai`, zod. Package manager is **pnpm**.

## Where things live

| Path | Purpose |
| --- | --- |
| `src/app/(app)/**` | Signed-in pages (notes, subjects, settings); `src/app/(auth)/**` auth pages; `src/app/page.tsx` landing |
| `src/app/actions/*.ts` | Server Actions: authenticate → validate → one service call → revalidate |
| `src/server/services` | Business rules; `src/server/repositories` the only Prisma usage; `src/server/storage`, `src/server/ai`, `src/server/db.ts` gateways |
| `src/server/auth/session.ts` | `requireUser()` — the authorization boundary |
| `src/lib` | Browser-safe shared code: `validation.ts` (zod schemas and types), `constants.ts` (limits, bucket, colours), `review.ts` (spaced-review and mastery rules), Supabase clients |
| `src/components` | UI; `src/components/ui` is vendored shadcn (treat as library code) |
| `prisma/` | Schema, migrations, `storage.sql` (bucket + policies) |
| `src/generated/prisma` | Generated client (git-ignored; `pnpm install` regenerates) |

## Rules

1. **Document every change.** Any change or new feature must update the relevant files in `docs/` (`features.md` for behaviour, `architecture.md` for structure or data model, `developer-guide.md` for setup/scripts/conventions) and add an entry to `docs/changelog.md`. Work is not complete until the documentation matches the code.
2. **Respect the layers.** Pages and Server Actions never import Prisma; only repositories do. Services hold the rules. Everything under `src/server` imports `server-only`.
3. **Scope by user.** `requireUser()` first; every query includes `userId`; validate ids as UUIDs; check ownership before writes. Prisma bypasses Supabase RLS, so code is the only guard.
4. **Validate at the edge.** Untrusted input goes through a zod schema from `src/lib/validation.ts` via `parseInput`. Throw `AppError` with a user-readable message for expected failures.
5. **Schema changes** go through `pnpm prisma migrate dev --name <intent>` on a development database; new tables get `ENABLE ROW LEVEL SECURITY` in the migration. Never `db push` or `migrate dev` on a shared database.
6. **AI calls** go through `src/server/ai/gemini.ts` only and run inside `aiBudgetService.run` (budget, concurrency, usage ledger). Anything that spends money requires `requireVerifiedUser()`. Keep requests to one per generation.
7. **UI:** responsive at phone width, both themes, theme tokens over fixed colours, `ConfirmDialog` for destructive actions, toasts for action outcomes. Base UI inputs reject a changing `defaultValue` — use controlled inputs or a `key`.
8. **Next.js 16 differs from older versions** (async `params`/`searchParams`/`cookies`, `proxy.ts` instead of middleware, `retry` in error boundaries). Check `node_modules/next/dist/docs/` before using an API from memory.
9. **Before finishing:** `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` must pass. Note in the handoff anything that could not be verified (for example flows needing a signed-in browser session).
10. Do not commit, push, or touch `.env.local`.
