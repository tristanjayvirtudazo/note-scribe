import "server-only";
import { DAILY_FLASHCARD_LIMIT, FLASHCARD_SESSION_SIZE } from "@/lib/constants";
import { dueDateFor, nextBox } from "@/lib/review";
import type { FlashcardInput, ReviewOutcomeInput } from "@/lib/validation";
import { generateFlashcards } from "@/server/ai/gemini";
import { AppError, NotFoundError } from "@/server/errors";
import { flashcardRepository } from "@/server/repositories/flashcard.repository";
import { noteRepository } from "@/server/repositories/note.repository";
import { aiBudgetService } from "@/server/services/ai-budget.service";
import { progressService } from "@/server/services/progress.service";

const DAY_MS = 24 * 60 * 60 * 1000;

async function requireCard(userId: string, cardId: string) {
  const card = await flashcardRepository.findById(userId, cardId);
  if (!card) throw new NotFoundError("Flashcard");
  return card;
}

export const flashcardService = {
  list(userId: string, noteId: string) {
    return flashcardRepository.listByNote(userId, noteId);
  },

  summary(userId: string, noteId: string) {
    return flashcardRepository.summaryByNote(userId, noteId, new Date());
  },

  /** Cards to study now, due ones first, in a fresh order each time. */
  async startSession(userId: string, noteId: string) {
    const cards = await flashcardRepository.listDue(userId, noteId, new Date(), FLASHCARD_SESSION_SIZE);
    for (let index = cards.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [cards[index], cards[swap]] = [cards[swap], cards[index]];
    }
    return cards.map(({ id, front, back, box }) => ({ id, front, back, box }));
  },

  /** Writes new cards from the note's parts; existing cards are kept. */
  async generate(userId: string, noteId: string, count: number): Promise<{ added: number }> {
    const note = await noteRepository.findWithSections(userId, noteId);
    if (!note) throw new NotFoundError("Note");
    if (note.sections.length === 0) throw new AppError("This note has no content to make flashcards from yet.");

    const batches = await flashcardRepository.countBatchesSince(userId, new Date(Date.now() - DAY_MS));
    if (batches >= DAILY_FLASHCARD_LIMIT) {
      throw new AppError(`You have reached the limit of ${DAILY_FLASHCARD_LIMIT} flashcard generations per day. Please try again tomorrow.`);
    }

    const cards = await aiBudgetService.run(userId, "flashcards", async () => {
      const generated = await generateFlashcards({ title: note.title, sections: note.sections, count });
      return { result: generated.cards, usage: generated.usage };
    });
    const created = await flashcardRepository.appendMany(userId, noteId, cards);
    return { added: created.count };
  },

  async add(userId: string, noteId: string, input: FlashcardInput): Promise<void> {
    if (!(await noteRepository.exists(userId, noteId))) throw new NotFoundError("Note");
    await flashcardRepository.appendMany(userId, noteId, [input]);
  },

  async update(userId: string, cardId: string, input: FlashcardInput): Promise<{ noteId: string }> {
    const card = await requireCard(userId, cardId);
    await flashcardRepository.update(cardId, input);
    return { noteId: card.noteId };
  },

  async delete(userId: string, cardId: string): Promise<{ noteId: string }> {
    const card = await requireCard(userId, cardId);
    await flashcardRepository.delete(cardId);
    return { noteId: card.noteId };
  },

  /**
   * Applies a self-rating. "Got it" moves the card up a box; "Not yet" sends it back to box 1,
   * due tomorrow. Either way today counts towards the streak.
   */
  async review(userId: string, profile: { studyStreak: number; lastStudiedOn: Date | null }, cardId: string, outcome: ReviewOutcomeInput) {
    const card = await requireCard(userId, cardId);
    const now = new Date();
    const box = nextBox(card.box, outcome === "got-it" ? "up" : "reset");
    const dueAt = dueDateFor(box, now);
    const [, streak] = await Promise.all([
      flashcardRepository.recordReview(cardId, { box, dueAt, reviewedAt: now }),
      progressService.recordStudy(userId, profile, now),
    ]);
    return { noteId: card.noteId, box, dueAt, streak };
  },
};
