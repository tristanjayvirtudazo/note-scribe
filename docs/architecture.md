# Architecture

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions, Turbopack), React 19, TypeScript.
- **Supabase**: Auth (sessions via `@supabase/ssr` cookies), Storage (private `note-files` bucket), Postgres.
- **Prisma 7** with the `pg` driver adapter; generated client in `src/generated/prisma` (git-ignored, built by `postinstall`).
- **Google Gemini** through `@google/genai`.
- **Tailwind CSS v4**, shadcn/ui components on Base UI (`src/components/ui`), lucide icons, `react-markdown` + `remark-gfm`, `next-themes`, `sonner` toasts, `zod` validation.
- Package manager: **pnpm**.

## Layers

Everything that touches the database, storage or AI runs on the server. Each layer only calls the one below it.

| Layer | Location | Responsibility |
| --- | --- | --- |
| UI | `src/app/**/page.tsx`, `src/components`, `src/hooks` | Pages are Server Components that read through services. Client components (`"use client"`) handle interaction and call Server Actions. |
| Entry points | `src/app/actions/*.ts` (auth, notes, subjects, quizzes, flashcards, calendar), `src/app/auth/callback/route.ts`, `src/app/calendar/[token]/feed.ics/route.ts`, `src/app/(app)/notes/[id]/review.ics/route.ts`, `src/app/api/csp-report/route.ts` | `requireUser()`, validate input with zod, call one service, `revalidatePath`, return a plain `ActionResult`. No business rules, no queries. |
| Services | `src/server/services/*.service.ts` | Business rules and use cases: ownership checks, daily limits, upload and generation flows, quiz scoring. Throw `AppError` for expected failures. |
| Repositories | `src/server/repositories/*.repository.ts` | The only code that imports Prisma. Every query is scoped by `userId`. |
| Gateways | `src/server/storage/note-files.storage.ts`, `src/server/ai/gemini.ts`, `src/server/db.ts` | Supabase Storage, Gemini, the Prisma client. |
| Shared | `src/lib` | Safe for both browser and server: zod schemas (`validation.ts`), constants, Supabase clients, pure helpers. |

Supporting modules:

- `src/server/auth/session.ts`: `getAuthUser()` (verified with the Auth server, cached per request) and `requireUser()` (redirects to `/login`, creates or syncs the profile row).
- `src/server/errors.ts`: `AppError` (message safe to show) and `NotFoundError`.
- `src/server/action-result.ts`: `parseInput`, `toActionResult`, `toFormState`, which turn `AppError`s into results and log anything unexpected. `redirect()`/`notFound()` are re-thrown.
- `src/proxy.ts`: refreshes the Supabase session on every request, performs the optimistic sign-in redirects, and generates the per-request nonce and Content Security Policy (`src/lib/security-headers.ts`). Static security headers live in `next.config.ts`; `/api/csp-report` logs policy violations.
- `src/instrumentation-client.ts` + `src/components/navigation-progress.tsx`: top-of-page loading bar.
- Every file under `src/server` imports `server-only`; importing it from a client component fails the build.

## Request flows

**Page render:** `page.tsx` → `requireUser()` → `xService.get…()` → repository → Prisma. Malformed ids in URLs are rejected with `isUuid` before any query.

**Mutation:** client component → Server Action → `requireUser()` → `parseInput(schema)` → service → repository → `revalidatePath` → `ActionResult` back to the client, which shows a toast or inline error.

**Create a note:**
1. `prepareNoteUploads` validates the declared file list, enforces the daily limit and the storage quota, and returns a one-time signed upload target per file (issued with the service role) under `<userId>/<uploadId>/<index>.<ext>`.
2. The browser uploads each file straight to Supabase Storage with `uploadToSignedUrl` (`src/lib/supabase/upload.ts`), so large files never pass through the app server.
3. `createNote` lists the storage folder and only accepts files that actually arrived, resolves the subject, and inserts the note and file rows. On any failure the uploaded files are removed.
4. `generateNoteContent` downloads the files, uploads them to the Gemini Files API, requests structured JSON, and replaces the note's sections in one transaction. Failures mark the note `FAILED` only when it has no content.

**Review loop:** `src/lib/review.ts` holds the pure rules (box intervals, score → box movement, mastery, explanation unlocking, streak). `progressService.refreshNote` recomputes mastery from `quiz_attempts.answers`, moves the note's box after a score, and lists unlocked explanations; `progressService.recordStudy` advances the streak. `quizService.submitAttempt` and `flashcardService.review` call these.

**Flashcards:** `flashcardService.generate` sends the note's section text to Gemini (task `flashcards`, same fallback chain as quizzes) and appends cards. `startSession` picks up to 20 due cards; `review` applies a self-rating to one card.

**Calendar:** `calendarService.enableFeed` stores a SHA-256 hash of a random token on the profile; `/calendar/[token]/feed.ics` looks the hash up and builds iCalendar text with the pure helpers in `src/lib/ics.ts` (escaping, line folding, all-day events, web-calendar links). The proxy matcher excludes `/calendar/`.

**Quiz:** `generateQuiz` sends the note's section text (not the files) to Gemini, validates the JSON, and inserts the quiz with positioned questions. `submitAttempt` scores on the server against stored `correctIndex` values.

## Data model (`prisma/schema.prisma`)

| Model (table) | Purpose | Key fields |
| --- | --- | --- |
| `Profile` (`profiles`) | One row per Supabase Auth user; `id` is the auth user id | `email`, `fullName` |
| `Subject` (`subjects`) | User's subject or topic | `name` (unique per user), `color` |
| `Note` (`notes`) | A study note | `title`, `description`, `status` (`PENDING`/`READY`/`FAILED`), `error`, `subjectId` (set null on subject delete) |
| `NoteFile` (`note_files`) | Uploaded source file | `name`, `path` (storage key), `mimeType`, `size` |
| `NoteSection` (`note_sections`) | One editable part of a note | `heading`, `content` (Markdown), `position` |
| `Quiz` (`quizzes`) | A generated quiz | `title`, `noteId` |
| `QuizQuestion` (`quiz_questions`) | A question | `type` (`MULTIPLE_CHOICE`/`TRUE_FALSE`), `prompt`, `options[]`, `correctIndex`, `explanation`, `position` |
| `QuizAttempt` (`quiz_attempts`) | A scored attempt | `score`, `total`, `answers` (JSON `{questionId: optionIndex}`) |
| `Flashcard` (`flashcards`) | A two-sided card with its own review state | `front`, `back`, `position`, `box` (0–5), `dueAt`, `reviewedCount`, `lastReviewedAt` |
| `AiUsage` (`ai_usage`) | One row per AI request, success or failure | `task`, `model`, token counts, `ok` |

Review state on other tables: `notes.review_box`, `notes.review_due_at`, `notes.mastery`; `profiles.study_streak`, `profiles.last_studied_on`. Calendar: `profiles.calendar_token_hash`.

Deleting a profile cascades to everything; deleting a note cascades to files, sections and quizzes; deleting a quiz cascades to questions and attempts. All timestamps are `timestamptz`.

## Security model

- Prisma connects as the database owner and **bypasses row level security**. Authorization is therefore enforced in code: `requireUser()` is the boundary, and every repository query includes the user id.
- RLS is still **enabled with no policies** on every table (including `_prisma_migrations`), so the tables cannot be read through Supabase's public REST API with the anon key.
- Storage: the `note-files` bucket is private. The only policy lets a user **read** objects under a top-level folder named after their own user id (`prisma/storage.sql`). There is no user upload or delete policy: upload targets, listing and deletion go through the service-role client (`src/server/supabase-admin.ts`), so file counts, sizes and the per-user quota (`STORAGE_QUOTA_MB`) are enforced by the server.
- Accounts: a password change or reset ends all other sessions; account deletion removes storage, database rows (cascade from `profiles`) and the auth user, in that order so a failure part-way can be retried.
- Spending: uploads and AI generation require a confirmed email (`requireVerifiedUser`). Every AI call runs inside `aiBudgetService.run`, which enforces one generation per user, a server-wide concurrency cap, and a global daily request budget backed by the `ai_usage` ledger. Auth forms carry a Cloudflare Turnstile token that Supabase verifies.
- Server Actions re-verify the user on every call; ids from the client are validated as UUIDs and ownership is checked before any write.
- Uploaded documents, titles and descriptions are treated as material, not instructions, in the AI prompts.
- The `/auth/callback` `next` parameter only accepts same-site relative paths.
- Browser hardening: HSTS, nosniff, frame denial, referrer and permissions policies, and a nonce-based CSP (report-only until `CSP_ENFORCE=true`). The root layout reads the nonce from the request, which makes every page dynamic; next-themes receives it for its inline script.

## AI integration (`src/server/ai/gemini.ts`)

- Three tasks, `notes`, `quiz` and `flashcards`, each with an ordered model list (`GEMINI_NOTES_MODELS`, `GEMINI_QUIZ_MODELS`, `GEMINI_FLASHCARD_MODELS`). Notes default to the strongest model first; quizzes to the cheapest.
- A model that answers 429 (quota), 5xx (overloaded) or 404 (retired) is skipped and rested for a period (the API's `retryDelay` for 429, 60 s for 5xx, 1 h for 404), and the next model is tried. The rest list is in-process memory.
- Responses are requested as JSON against a schema derived from zod, then validated again with zod.
- Thinking is set to `LOW` (falling back to no setting when a model rejects it); output is capped (16k tokens for notes, 8k for quizzes); quiz input is truncated to 24,000 characters.
- Each call logs `[ai] task=… model=… input=… output=… thinking=…`.
- Files are uploaded to the Gemini Files API before the request and deleted afterwards.

## Styling

- Design tokens live in `src/app/globals.css` (`:root` and `.dark`), with indigo as the primary colour. Shared decorative classes: `page-glow`, `dot-grid`, `card-lift`.
- `src/components/ui/*` are vendored shadcn components (Base UI primitives). Base UI inputs reject a changing `defaultValue`; use controlled inputs or a `key` when the initial value can change while mounted.
- Page chrome: `PageHeader` and `EmptyState` (`src/components/page-header.tsx`), `AppHeader`/`MobileTabBar` (`src/components/app-nav.tsx`).
