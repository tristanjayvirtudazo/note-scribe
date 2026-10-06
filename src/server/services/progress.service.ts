import "server-only";
import { advanceStreak, dueDateFor, isUnlocked, masteryPercent, nextBox, outcomeForScore } from "@/lib/review";
import { noteRepository } from "@/server/repositories/note.repository";
import { profileRepository } from "@/server/repositories/profile.repository";
import { quizRepository } from "@/server/repositories/quiz.repository";

// Learning progress: mastery, the spaced-review schedule for notes, and the study streak.

export interface UnlockedExplanation {
  id: string;
  prompt: string;
  answer: string;
  explanation: string | null;
}

/** Per question, whether each past attempt got it right, most recent first. */
function questionHistory(quizzes: Awaited<ReturnType<typeof quizRepository.findReviewData>>) {
  const history = new Map<string, boolean[]>();
  for (const quiz of quizzes) {
    const correct = new Map(quiz.questions.map((question) => [question.id, question.correctIndex]));
    for (const question of quiz.questions) history.set(question.id, []);
    for (const attempt of quiz.attempts) {
      const answers = attempt.answers as Record<string, number>;
      for (const [questionId, chosen] of Object.entries(answers)) {
        const correctIndex = correct.get(questionId);
        if (correctIndex !== undefined) history.get(questionId)?.push(chosen === correctIndex);
      }
    }
  }
  return history;
}

export const progressService = {
  /** Recomputes a note's mastery from its quiz history; optionally moves its review box after a new score. */
  async refreshNote(userId: string, noteId: string, scorePercent?: number, now = new Date()) {
    const [quizzes, note] = await Promise.all([quizRepository.findReviewData(userId, noteId), noteRepository.findWithSections(userId, noteId)]);
    const history = questionHistory(quizzes);
    const mastery = masteryPercent(history);

    let reviewBox = note?.reviewBox ?? 0;
    let reviewDueAt = note?.reviewDueAt ?? null;
    if (scorePercent !== undefined) {
      reviewBox = nextBox(reviewBox, outcomeForScore(scorePercent));
      reviewDueAt = dueDateFor(reviewBox, now);
    }
    await noteRepository.updateReview(noteId, { reviewBox, reviewDueAt, mastery });

    const unlocked: UnlockedExplanation[] = [];
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        if (isUnlocked(history.get(question.id) ?? [])) {
          unlocked.push({ id: question.id, prompt: question.prompt, answer: question.options[question.correctIndex] ?? "", explanation: question.explanation });
        }
      }
    }
    return { mastery, reviewBox, reviewDueAt, unlocked, questionCount: history.size };
  },

  /** Counts today towards the user's study streak. */
  async recordStudy(userId: string, profile: { studyStreak: number; lastStudiedOn: Date | null }, now = new Date()) {
    const next = advanceStreak(profile, now);
    if (next.studyStreak !== profile.studyStreak || next.lastStudiedOn !== profile.lastStudiedOn) {
      await profileRepository.updateStreak(userId, next);
    }
    return next.studyStreak;
  },
};
