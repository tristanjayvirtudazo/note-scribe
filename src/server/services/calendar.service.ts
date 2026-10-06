import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { buildIcsCalendar, calendarLinks, formatIcsDate, type CalendarEvent } from "@/lib/ics";
import { NotFoundError } from "@/server/errors";
import { flashcardRepository } from "@/server/repositories/flashcard.repository";
import { noteRepository } from "@/server/repositories/note.repository";
import { profileRepository } from "@/server/repositories/profile.repository";

// A read-only calendar of review dates. The feed URL carries a secret token; only its hash is
// stored, so a database read cannot reproduce anyone's feed URL.

const TOKEN_BYTES = 32;
/** Overdue reviews stay in the feed this long so they are not silently forgotten. */
const PAST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Feed tokens are 43 URL-safe characters; anything else is rejected before touching the database. */
export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

function reviewEvent(note: { id: string; title: string }, date: Date, origin: string): CalendarEvent {
  return {
    uid: `review-${note.id}@note-scribe`,
    date,
    summary: `Review: ${note.title}`,
    description: "Take a quick quiz on this note to keep it fresh.",
    url: `${origin}/notes/${note.id}`,
  };
}

export const calendarService = {
  /** Turns the feed on (or replaces its secret) and returns the new token, shown to the user once. */
  async enableFeed(userId: string): Promise<{ token: string }> {
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    await profileRepository.setCalendarTokenHash(userId, hashToken(token));
    return { token };
  },

  async disableFeed(userId: string): Promise<void> {
    await profileRepository.setCalendarTokenHash(userId, null);
  },

  /** The user's feed as iCalendar text, or null when the token matches no one. */
  async buildFeed(token: string, origin: string): Promise<string | null> {
    if (!isWellFormedToken(token)) return null;
    const profile = await profileRepository.findByCalendarTokenHash(hashToken(token));
    if (!profile) return null;

    const now = new Date();
    const oldest = new Date(now.getTime() - PAST_WINDOW_MS);
    const [notes, cards] = await Promise.all([noteRepository.listScheduled(profile.id), flashcardRepository.listScheduled(profile.id)]);

    const events: CalendarEvent[] = [];
    for (const note of notes) {
      if (note.reviewDueAt && note.reviewDueAt >= oldest) events.push(reviewEvent(note, note.reviewDueAt, origin));
    }

    // One event per note per day listing how many cards come due, rather than one per card.
    const cardsByDay = new Map<string, { noteId: string; title: string; date: Date; count: number }>();
    for (const card of cards) {
      if (!card.dueAt || card.dueAt < oldest) continue;
      const key = `${card.noteId}:${formatIcsDate(card.dueAt)}`;
      const entry = cardsByDay.get(key);
      if (entry) entry.count++;
      else cardsByDay.set(key, { noteId: card.noteId, title: card.note.title, date: card.dueAt, count: 1 });
    }
    for (const [key, entry] of cardsByDay) {
      events.push({
        uid: `cards-${key}@note-scribe`,
        date: entry.date,
        summary: `Flashcards: ${entry.title} (${entry.count} ${entry.count === 1 ? "card" : "cards"})`,
        description: "Cards are due for a quick review.",
        url: `${origin}/notes/${entry.noteId}/flashcards`,
      });
    }

    events.sort((a, b) => a.date.getTime() - b.date.getTime());
    return buildIcsCalendar("Note Scribe reviews", events, now);
  },

  /** "Add to calendar" links for a note's next review; null when none is scheduled. */
  linksFor(note: { id: string; title: string; reviewDueAt: Date | null }, origin: string) {
    if (!note.reviewDueAt) return null;
    return { ...calendarLinks(reviewEvent(note, note.reviewDueAt, origin)), ics: `${origin}/notes/${note.id}/review.ics` };
  },

  /** A single note's next review as a downloadable event plus web-calendar links. */
  async noteReview(userId: string, noteId: string, origin: string) {
    const note = await noteRepository.findWithSections(userId, noteId);
    if (!note) throw new NotFoundError("Note");
    if (!note.reviewDueAt) return null;
    const event = reviewEvent(note, note.reviewDueAt, origin);
    return { event, ics: buildIcsCalendar("Note Scribe", [event]), links: calendarLinks(event) };
  },
};
