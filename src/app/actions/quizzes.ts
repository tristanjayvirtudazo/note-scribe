"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { attemptSchema, questionSchema, quizSizeSchema, type ActionResult } from "@/lib/validation";
import { parseInput, toActionResult } from "@/server/action-result";
import { requireUser, requireVerifiedUser } from "@/server/auth/session";
import { quizService } from "@/server/services/quiz.service";
import type { UnlockedExplanation } from "@/server/services/progress.service";

export interface AttemptResult {
  score: number;
  total: number;
  mastery: number | null;
  /** ISO date of the next scheduled review of the note. */
  reviewDueAt: string | null;
  streak: number;
  unlocked: UnlockedExplanation[];
  questionCount: number;
}

// Server Actions are the entry points the browser can call. Each one authenticates,
// validates its input, delegates to a service, and refreshes the pages it affected.

const idSchema = z.uuid("That item could not be found.");

function revalidateQuiz(location: { quizId: string; noteId: string }): void {
  revalidatePath(`/notes/${location.noteId}`);
  revalidatePath(`/notes/${location.noteId}/quizzes/${location.quizId}`);
}

export async function generateQuiz(noteId: unknown, size: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const user = await requireVerifiedUser();
    const id = parseInput(idSchema, noteId);
    const quiz = await quizService.generate(user.id, id, parseInput(quizSizeSchema, size));
    revalidatePath(`/notes/${id}`);
    return quiz;
  });
}

export async function deleteQuiz(quizId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await quizService.delete(user.id, parseInput(idSchema, quizId));
    revalidatePath(`/notes/${noteId}`);
  });
}

export async function submitAttempt(quizId: unknown, answers: unknown): Promise<ActionResult<AttemptResult>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const id = parseInput(idSchema, quizId);
    const outcome = await quizService.submitAttempt(user.id, user, id, parseInput(attemptSchema, answers));
    revalidateQuiz({ quizId: id, noteId: outcome.noteId });
    revalidatePath("/notes");
    return {
      score: outcome.score,
      total: outcome.total,
      mastery: outcome.mastery,
      reviewDueAt: outcome.reviewDueAt?.toISOString() ?? null,
      streak: outcome.streak,
      unlocked: outcome.unlocked,
      questionCount: outcome.questionCount,
    };
  });
}

export async function addQuestion(quizId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    revalidateQuiz(await quizService.addQuestion(user.id, parseInput(idSchema, quizId), parseInput(questionSchema, input)));
  });
}

export async function updateQuestion(questionId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    revalidateQuiz(await quizService.updateQuestion(user.id, parseInput(idSchema, questionId), parseInput(questionSchema, input)));
  });
}

export async function deleteQuestion(questionId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    revalidateQuiz(await quizService.deleteQuestion(user.id, parseInput(idSchema, questionId)));
  });
}
