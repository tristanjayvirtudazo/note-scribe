export const STORAGE_BUCKET = "note-files";

export const MAX_FILES = 5;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
/** Total stored source files per user. Set from STORAGE_QUOTA_MB; the default suits Supabase's free plan (1 GB project-wide). */
export const STORAGE_QUOTA_BYTES = (Number(process.env.STORAGE_QUOTA_MB) > 0 ? Number(process.env.STORAGE_QUOTA_MB) : 100) * 1024 * 1024;
export const ACCEPTED_FILE_TYPES: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
  "application/pdf": "PDF",
};
export const ACCEPTED_FILE_LABEL = "JPG, PNG, WebP or PDF";

// Per-user caps on AI generations in any 24-hour window, to keep API costs bounded.
export const DAILY_NOTE_LIMIT = 20;
export const DAILY_QUIZ_LIMIT = 40;
export const DAILY_FLASHCARD_LIMIT = 20;

// Generation sizes: quick-pick presets plus the largest number a user may type.
export const QUIZ_SIZES = [5, 10, 15] as const;
export const MAX_QUIZ_SIZE = 30;
export const FLASHCARD_SIZES = [10, 20, 30] as const;
export const MAX_FLASHCARD_COUNT = 50;
/** Cards per study session: short enough to finish, long enough to feel like progress. */
export const FLASHCARD_SESSION_SIZE = 20;

export const SUBJECT_COLORS = {
  indigo: "bg-indigo-500",
  sky: "bg-sky-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-500",
} as const;
export type SubjectColor = keyof typeof SUBJECT_COLORS;

export function subjectColorClass(color: string) {
  return SUBJECT_COLORS[color as SubjectColor] ?? SUBJECT_COLORS.indigo;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids arrive in URLs; Postgres rejects a malformed uuid with an error rather than "no rows". */
export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

/** Fired on `window` by src/instrumentation-client.ts whenever the router starts a navigation. */
export const NAVIGATION_START_EVENT = "app:navigation-start";
