# Features

All features require a signed-in user unless stated otherwise. Data is private to the account that created it.

## Accounts

Authentication is handled by Supabase Auth (email and password). The app keeps a `profiles` row per auth user, created on first sign-in.

| Feature | Behaviour |
| --- | --- |
| Sign up (`/signup`) | Name, email and password (8–72 characters), plus a Cloudflare Turnstile check when configured. If email confirmation is enabled in Supabase, a confirmation link is sent and the user signs in after opening it; otherwise they are signed in immediately. The message is the same whether or not the email is already registered. |
| Sign in (`/login`) | Email and password. Wrong credentials give one generic message. An unconfirmed email gives a reminder to confirm. |
| Forgot password (`/forgot-password`) | Sends a reset link. The response is identical whether or not the account exists. |
| Reset password (`/reset-password`) | Reached from the email link via `/auth/callback`. Requires the session the link creates; an expired link shows a prompt to request a new one. |
| Email links (`/auth/callback`) | Exchanges the code or token from Supabase emails for a session and redirects to `next` (relative paths only). Invalid links go to `/login?error=link`. |
| Sign out | From the account menu, the Settings page, or the phone tab bar's Settings page. |
| Route protection | `/notes`, `/subjects` and `/settings` redirect signed-out visitors to `/login`; `/login`, `/signup` and `/forgot-password` redirect signed-in users to `/notes`. |

## Settings (`/settings`)

- **Profile:** edit the display name (max 80 characters). Email is shown read-only. The name is also stored in Supabase user metadata.
- **Password:** requires the current password, a new password (8–72 characters) and a confirmation. The new password must differ from the current one.
- **Sign out.**
- **Delete account:** type `DELETE` to confirm. Removes uploaded files, all notes, quizzes, flashcards and scores, and the sign-in itself; cannot be undone.
- Changing or resetting the password signs out every other device.

## Notes

### Creating a note (`/notes/new`)

A form with:

- **Title** (required, max 120 characters)
- **Description** (optional, max 500). Also passed to the AI as guidance on what to focus on.
- **Subject** (optional): pick an existing subject or create a new one inline.
- **Files** (required): 1–5 files, each up to 10 MB, of type JPG, PNG, WebP or PDF. Chosen with a file picker or drag and drop; duplicates are skipped and invalid files are reported before upload.

Submission runs four steps with a visible status: uploading files → saving the note → generating study notes → opening the note. If generation fails, the note still opens and shows the reason with a **Try again** button.

### Study notes (`/notes/[id]`)

- The AI writes 3–8 **parts** (stored as sections): an Overview first, topic sections, and where supported "Key terms" and "Quick review". Content is Markdown (paragraphs, lists, bold terms, tables, numbered steps).
- The note reads as one continuous document. A **Contents** list (sidebar on desktop, top of the note on phones) jumps to each part when there are two or more.
- **Edit mode** (Edit button) reveals per-part controls: edit heading and Markdown content, delete (with confirmation), move up or down, and **Add a new part**. Headings are limited to 120 characters and content to 20,000.
- **Edit details:** title, description and subject.
- **Regenerate:** replaces every part with a fresh AI version from the original files (confirmation required; manual edits are lost). If regeneration fails, the existing parts are kept.
- **Delete:** removes the note, its uploaded files, and its quizzes.
- **Source files:** the original uploads can be opened in a new tab through a link that expires after 5 minutes.
- **Statuses:** `PENDING` (never generated), `READY`, `FAILED` (generation failed and the note has no content). Adding a part by hand marks the note `READY`.

### Notes list (`/notes`)

- Welcome line, stat tiles (notes, subjects, quizzes, day streak), and a card per note showing subject colour, title, description, mastery bar, cards due, number of parts and quizzes, the next review date or last update, and badges for `PENDING`, `FAILED` or `Due` notes.
- **Due for review** row (shown when no search or filter is active): notes whose scheduled review date has passed or that have flashcards due, most overdue first.
- **Search** matches title, description and part content (case-insensitive). Clearing the box removes the search immediately.
- **Subject filter** applies as soon as it is changed, including "No subject".
- Results are ordered by last update.

## Subjects (`/subjects`)

- Create, rename, recolour and delete subjects. Names are unique per user (case-insensitive) and up to 50 characters. Seven colours are available.
- Deleting a subject keeps its notes, which become "No subject".
- Each subject card links to the notes list filtered by that subject.

## Quizzes (`/notes/[id]/quizzes/[quizId]`)

- **Generate** from the note page: any number of questions from 1 to 30 (quick picks 5, 10, 15 or a typed number), written by the AI from the note's parts (not the original files). Mixed multiple-choice (four options) and true/false, each with a one-sentence explanation. Quizzes are titled "Quiz 1", "Quiz 2", … per note.
- **Take quiz:** all questions on one page with radio options; the sticky bar shows progress and enables Submit once at least one answer is chosen. Submission is scored on the server and saved as an attempt.
- **Results:** a result card shows the score and percentage, the note's mastery, when the note is next due for review, and the study streak. Which questions were wrong, the correct answers and the explanations are deliberately **not** shown, so a retake measures understanding rather than recall of the previous round. The card stays in place when switching tabs, and after a reload it shows the latest saved attempt as "Previous result" with its date.
- **Rounds:** after every submission (and on every visit) the questions and the multiple-choice options are shown in a different order; true/false keeps its order. Answers are always stored and scored by the original option, so reordering never affects the score.
- **Edit questions:** edit prompt (max 500), 2–6 options (max 300 each), which option is correct, and the explanation (max 1,000); add new questions; delete questions; delete the whole quiz (with its history). Options exactly `True`/`False` are stored as true/false questions.
- **Unlocked explanations:** below the result, a collapsible list shows the correct answer and explanation only for questions answered correctly in their last two rounds, with a count ("3 of 10"). The rest stay hidden until earned.
- **History:** the last 20 attempts with date, score and percentage, plus the best score. Editing questions does not change past scores.
- The note page lists each quiz with its question count and attempt count, and shows the note's mastery and next review date.

## Review loop (spaced repetition)

Based on well-replicated findings: retrieval practice beats re-reading, spacing reviews over days beats cramming, and feedback helps most when it is delayed rather than withheld.

- **Mastery** (per note, 0–100): the share of quiz questions answered correctly on their last two appearances. A question seen once counts half. Recomputed after every attempt and when a quiz is deleted.
- **Schedule** (Leitner boxes 1–5 with intervals of 1, 3, 7, 14 and 30 days): a quiz score of 80% or more moves the note up a box, 50–79% repeats the current interval, below 50% sends it back to box 1 (due tomorrow). The next review date appears on the note card, the quiz result and the note page.
- **Streak:** consecutive calendar days (UTC) with at least one quiz attempt or flashcard review. Shown on the notes list, quiz results and flashcard sessions; it lapses after a missed day.
- **Explanations unlock** per question after two consecutive correct answers.

## Flashcards (`/notes/[id]/flashcards`)

- **Generate** from the note page or the Manage tab: 1–50 cards (quick picks 10, 20, 30 or a typed number) written by the AI from the note's parts: term → definition, question → answer, next-step and fill-in-the-blank prompts. Generating again appends cards. Cards can be added, edited and deleted by hand (front up to 300 characters, back up to 1,000).
- **Study session:** up to 20 cards that are due (never reviewed, or past their review date), overdue first, in random order. One card at a time: read the front, recall, **Show answer**, then rate **Not yet** or **Got it** (keyboard: Space, 1, 2). Progress bar and card count throughout.
- **Schedule per card:** Got it moves the card up a box (same 1/3/7/14/30-day intervals); Not yet sends it to box 1, due tomorrow. Cards rated Not yet come back at the end of the session for a second look, which does not change the schedule.
- **Session end:** cards known on the first try, how many came back, the streak, and when cards return. "Practise again" runs all cards without changing the schedule.
- **All caught up:** when nothing is due, the page says when the next cards return and offers a practice round.
- The note page's Flashcards panel shows the card count, how many are due, and a Study button.

## Calendar

- **Calendar feed** (Settings → Calendar): a read-only subscription of review dates. Turning it on shows two links once — https for Google Calendar and Outlook, webcal for Apple Calendar — with an "Open in Apple Calendar" button and instructions per app. "Make a new link" revokes the old one; "Turn off" stops the feed.
- The feed holds one all-day event per note review ("Review: <title>") and one per note per day for flashcards due ("Flashcards: <title> (N cards)"), each linking back to the note. Overdue items stay for 7 days. Calendar apps refresh it on their own schedule (hint: hourly).
- **Add to calendar** on the note page (Quizzes panel, when a review is scheduled): Google Calendar, Outlook, or an .ics download for Apple Calendar and others.

## Navigation and appearance

- Desktop: header with Notes, Subjects, Settings, a New note button, theme toggle and account menu.
- Phones: a bottom tab bar (Notes, New, Subjects, Settings) with a raised New button.
- A progress bar across the top of the screen shows while a page change is loading.
- Light and dark themes, following the system by default, switchable from the header.
- Fully responsive; all pages work at phone width.

## Limits and safeguards

| Limit | Value | Where |
| --- | --- | --- |
| Files per note | 5 | `src/lib/constants.ts`, `prisma/storage.sql` |
| Stored files per user | 100 MB (env `STORAGE_QUOTA_MB`) | `src/lib/constants.ts` |
| AI requests across all users per 24 h | 300 (env `AI_DAILY_REQUEST_BUDGET`) | `src/server/services/ai-budget.service.ts` |
| Generations running at once | 1 per user, 5 server-wide (env `AI_MAX_CONCURRENT`) | same |
| File size | 10 MB | same |
| File types | JPG, PNG, WebP, PDF | same |
| New notes per user per 24 h | 20 | `src/lib/constants.ts` |
| New quizzes per user per 24 h | 40 | same |
| Flashcard generations per user per 24 h | 20 | same |
| Questions per quiz | 1–30 | same |
| Cards per generation | 1–50 | same |
| Cards per study session | 20 | same |
| Quiz source text | first 24,000 characters of the note | `src/server/ai/gemini.ts` |
| Search text | 100 characters | notes page |

Uploads and AI generation require a confirmed email address. Regenerating an existing note does not count toward the daily note limit. The same note cannot be generated twice at the same time.
