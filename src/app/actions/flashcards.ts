"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { flashcardCountSchema, flashcardSchema, reviewOutcomeSchema, type ActionResult } from "@/lib/validation";
import { parseInput, toActionResult } from "@/server/action-result";
import { requireUser, requireVerifiedUser } from "@/server/auth/session";
import { flashcardService } from "@/server/services/flashcard.service";

// Server Actions are the entry points the browser can call. Each one authenticates,
// validates its input, delegates to a service, and refreshes the pages it affected.

const idSchema = z.uuid("That item could not be found.");

function revalidateNote(noteId: string): void {
  revalidatePath(`/notes/${noteId}`);
  revalidatePath(`/notes/${noteId}/flashcards`);
}

export async function generateFlashcards(noteId: unknown, count: unknown): Promise<ActionResult<{ added: number }>> {
  return toActionResult(async () => {
    const user = await requireVerifiedUser();
    const id = parseInput(idSchema, noteId);
    const result = await flashcardService.generate(user.id, id, parseInput(flashcardCountSchema, count));
    revalidateNote(id);
    return result;
  });
}

export async function addFlashcard(noteId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const id = parseInput(idSchema, noteId);
    await flashcardService.add(user.id, id, parseInput(flashcardSchema, input));
    revalidateNote(id);
  });
}

export async function updateFlashcard(cardId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await flashcardService.update(user.id, parseInput(idSchema, cardId), parseInput(flashcardSchema, input));
    revalidateNote(noteId);
  });
}

export async function deleteFlashcard(cardId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await flashcardService.delete(user.id, parseInput(idSchema, cardId));
    revalidateNote(noteId);
  });
}

/** Records a self-rating for one card during a study session. */
export async function reviewFlashcard(cardId: unknown, outcome: unknown): Promise<ActionResult<{ box: number; dueAt: string; streak: number }>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const result = await flashcardService.review(user.id, user, parseInput(idSchema, cardId), parseInput(reviewOutcomeSchema, outcome));
    revalidateNote(result.noteId);
    revalidatePath("/notes");
    return { box: result.box, dueAt: result.dueAt.toISOString(), streak: result.streak };
  });
}
