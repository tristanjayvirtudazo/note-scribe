/**
 * Spaced review (a Leitner system). Notes and flashcards each sit in a "box"; every box has
 * a longer wait before the next review. Succeeding moves an item up a box, struggling sends
 * it back to the start. Spacing reviews this way is one of the best-supported findings in
 * learning research: the same study time spread over days beats cramming.
 */

export const REVIEW_BOXES = 5;

/** Days until the next review, by box (box 0 means never reviewed). */
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReviewOutcome = "up" | "same" | "reset";

/** How a quiz score moves a note between boxes. */
export function outcomeForScore(percent: number): ReviewOutcome {
  if (percent >= 80) return "up";
  if (percent >= 50) return "same";
  return "reset";
}

export function nextBox(box: number, outcome: ReviewOutcome): number {
  if (outcome === "reset") return 1;
  if (outcome === "same") return Math.max(1, box);
  return Math.min(REVIEW_BOXES, Math.max(0, box) + 1);
}

export function dueDateFor(box: number, from = new Date()): Date {
  const days = REVIEW_INTERVAL_DAYS[Math.min(Math.max(box, 1), REVIEW_BOXES)];
  return new Date(from.getTime() + days * DAY_MS);
}

/** Human wording for a due date: "today", "tomorrow", "in 3 days", "2 days overdue". */
export function describeDue(dueAt: Date, now = new Date()): string {
  const days = Math.round((startOfDay(dueAt).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (days <= -1) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export function isDue(dueAt: Date | null, now = new Date()): boolean {
  return dueAt !== null && dueAt.getTime() <= now.getTime();
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Mastery: the share of questions answered correctly on their last two appearances.
 * A question seen only once counts half, so one lucky round cannot claim full mastery.
 * `history` holds each question's outcomes, most recent first.
 */
export function masteryPercent(history: Map<string, boolean[]>): number | null {
  if (history.size === 0) return null;
  let points = 0;
  for (const outcomes of history.values()) {
    const recent = outcomes.slice(0, 2);
    if (recent.length === 0) continue;
    points += recent.filter(Boolean).length / 2;
  }
  return Math.round((points / history.size) * 100);
}

/** A question's explanation unlocks once it has been answered correctly twice in a row. */
export function isUnlocked(outcomes: boolean[]): boolean {
  return outcomes.length >= 2 && outcomes[0] && outcomes[1];
}

/**
 * Study streak: consecutive calendar days with at least one quiz attempt or card review.
 * Dates are compared as UTC calendar days, matching the `last_studied_on` DATE column.
 */
export function advanceStreak(current: { studyStreak: number; lastStudiedOn: Date | null }, today = new Date()): { studyStreak: number; lastStudiedOn: Date } {
  const todayDay = utcDay(today);
  if (current.lastStudiedOn) {
    const lastDay = utcDay(current.lastStudiedOn);
    if (lastDay === todayDay) return { studyStreak: Math.max(1, current.studyStreak), lastStudiedOn: current.lastStudiedOn };
    if (lastDay === todayDay - 1) return { studyStreak: current.studyStreak + 1, lastStudiedOn: today };
  }
  return { studyStreak: 1, lastStudiedOn: today };
}

/** A streak only counts if the user studied today or yesterday; otherwise it has lapsed. */
export function currentStreak(profile: { studyStreak: number; lastStudiedOn: Date | null }, today = new Date()): number {
  if (!profile.lastStudiedOn) return 0;
  const gap = utcDay(today) - utcDay(profile.lastStudiedOn);
  return gap <= 1 ? profile.studyStreak : 0;
}

function utcDay(date: Date): number {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / DAY_MS);
}
