# Changelog

Newest first. Add an entry for every change that affects behaviour, data, configuration or architecture.

## 2026-10-06

- Vercel builds now apply database migrations automatically: `scripts/vercel-build.sh` (set as `buildCommand` in `vercel.json`) runs `pnpm db:migrate` and `pnpm db:storage` on Production builds before `next build`, and skips them on Preview builds. Manual migration commands remain for other hosts.
- Vercel deployment: added `vercel.json` pinning functions to `icn1` (Seoul) to sit next to the Supabase project in `ap-northeast-2`; `docs/deployment.md` now documents the CLI deploy path for a repository without a Git remote and the region pin.

## 2026-10-05

- Added `docs/deployment.md`: hosting requirements, pre-deploy checklist, Vercel, Netlify and generic Node/Docker steps, scheduled storage clean-up via GitHub Actions, post-deploy checks, and free-tier limits with the upgrade path.
- README now describes the product and its features only; setup moved to `docs/developer-guide.md` (renamed from `development.md`). Removed unused files: npm lockfile, placeholder `.env`, Prisma-init agent folders and `skills-lock.json`, default Next.js assets in `public/`, `src/lib/utils.ts`, and unused UI components (card, label, progress, select, separator, sheet).
- Sign-in and sign-up redesign: gradient brand panel with a product preview and three benefits, larger form card, inputs with icons and placeholders, show/hide password toggle, full-width primary buttons; shared `IconInput` and `PasswordInput` components.
- Landing page: the "Your AI study companion" pill animates in with a light sweep and twinkling spark, and the headline, intro and buttons rise in sequence (disabled under reduced motion); fixed the "Create a free account" button being unreadable in dark mode (colour classes were concatenated instead of merged).
- **Calendar feed (security plan step 5):** per-user secret iCalendar subscription (`/calendar/<token>/feed.ics`, token stored hashed, regenerable, rate limited) listing note reviews and due flashcards; Settings → Calendar to turn it on; "Add to calendar" menu on the note page with Google, Outlook and .ics download. Migration `20261005150000_calendar_feed`.
- Social sign-in (step 4) deferred until Google Cloud and Apple Developer accounts are available.
- **Security step 3 (accounts):** password change/reset signs out other sessions; Settings gains **Delete account** (files, rows and auth user removed; confirmation phrase required); landing page confirms a deletion.
- **Security step 2 (browser hardening):** static security headers in `next.config.ts`; nonce-based Content Security Policy generated per request in the proxy, report-only until `CSP_ENFORCE=true`, with `/api/csp-report` logging violations; all pages now render dynamically; Markdown links open in a new tab with `noopener noreferrer nofollow`.
- Fixed flashcard sessions restarting after each rating (the session is now a snapshot; the summary offers to study newly due cards).
- **Security step 1 (cost and abuse):** confirmed email required for uploads and AI generation; Cloudflare Turnstile on sign-up, sign-in and password reset; `ai_usage` ledger with a global daily request budget and concurrency limits (`AI_DAILY_REQUEST_BUDGET`, `AI_MAX_CONCURRENT`); storage writes moved to the service role with user upload/delete policies removed; per-user storage quota (`STORAGE_QUOTA_MB`); `pnpm storage:cleanup` for orphaned files; 120 s Gemini timeout; `shadcn` CLI moved to devDependencies. Migration `20261005120000_ai_usage`. New env: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- Added `docs/security.md`: threat model, current controls, hardening plan (cost and abuse, auth, headers, secrets, operations) and the security requirements for social sign-in and calendar integration. Planning only; nothing implemented yet.
- **Review loop:** per-note mastery, a Leitner review schedule (1/3/7/14/30 days) driven by quiz scores, a "Due for review" row on the notes list, a study streak, and explanations that unlock per question after two consecutive correct answers. Migration `20261005000000_review_schedule_and_flashcards` (run `pnpm db:migrate`).
- **Flashcards:** AI-generated or hand-written cards per note, a one-card-at-a-time study session with Not yet / Got it ratings and keyboard shortcuts, per-card spacing, second looks within a session, practice rounds, and a session summary. New page `/notes/[id]/flashcards`, panel on the note page, `GEMINI_FLASHCARD_MODELS`, daily limit of 20 generations.
- Quiz and flashcard sizes are chosen with quick-pick presets or a typed number (quizzes 1–30, cards 1–50).
- Quiz results: the result card now persists across tab changes and reloads (latest saved attempt shown as "Previous result"), per-question feedback (wrong picks, correct answers, explanations) is no longer revealed after submitting, and each round shuffles the questions and multiple-choice options.
- Added project documentation (`docs/`) and `CLAUDE.md` with the rule that every change must be documented.

## 2026-10-02

- **Design pass:** landing page (hero glow, gradient headline, preview mock, steps, features, call-to-action, footer), split sign-in layout, tinted app backdrop, page headers with icons, stat tiles and subject-coloured note cards on the notes list, styled empty states, accent headings and richer Markdown on the note page, quiz progress bar and results banner, subject cards, raised New button on the phone tab bar.
- Page icon (`src/app/icon.svg`) using the brand mark; default `favicon.ico` removed.
- Notes search became a controlled client component: clearing the box or changing the subject applies immediately. Fixed a Base UI warning caused by a changing `defaultValue`; the note details dialog and profile form were guarded the same way, and saving the profile now refreshes the header.
- **AI cost controls:** per-task model lists with quota/overload/retirement fallback and cooldowns, low thinking level, capped output, one-sentence quiz explanations, truncated quiz input, duplicate-generation guard, per-call usage logging. Models configured with `GEMINI_NOTES_MODELS` / `GEMINI_QUIZ_MODELS` (replacing `GEMINI_MODEL`).
- **Architecture refactor:** introduced services, repositories and gateways under `src/server`; Server Actions became thin entry points; uploads moved to server-issued signed upload targets with verification before the note is saved; new-note flow split into a hook, a form and pure helpers.
- Top-of-page navigation progress bar.
- Note page shows the note as one continuous document with a Contents list and an explicit edit mode (replacing per-section cards).
- Gemini: retry and model fallback when a model is overloaded (503).
- Initial application: Supabase email/password auth with confirmation and password reset, profile and password settings, note creation from JPG/PNG/WebP/PDF uploads, AI-generated sections with editing and reordering, subjects with colours, search and filtering, AI-generated quizzes with scoring and history, light/dark theme, responsive layout, Prisma schema with RLS enabled, storage bucket policies, daily generation limits.
