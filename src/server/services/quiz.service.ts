import "server-only";
import { DAILY_QUIZ_LIMIT } from "@/lib/constants";
import type { AttemptAnswers, QuestionInput, QuizSize } from "@/lib/validation";
import { generateQuizQuestions } from "@/server/ai/gemini";
import { AppError, NotFoundError } from "@/server/errors";
import { noteRepository } from "@/server/repositories/note.repository";
import { quizRepository } from "@/server/repositories/quiz.repository";
import { aiBudgetService } from "@/server/services/ai-budget.service";
import { progressService, type UnlockedExplanation } from "@/server/services/progress.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const ATTEMPT_HISTORY_SIZE = 20;

export interface AttemptOutcome {
  score: number;
  total: number;
  noteId: string;
  mastery: number | null;
  reviewDueAt: Date | null;
  streak: number;
  unlocked: UnlockedExplanation[];
  questionCount: number;
}

/** Identifies the pages that show a quiz, so callers can refresh them. */
interface QuizLocation {
  quizId: string;
  noteId: string;
}

function questionType(options: string[]): "TRUE_FALSE" | "MULTIPLE_CHOICE" {
  const isTrueFalse = options.length === 2 && options[0].toLowerCase() === "true" && options[1].toLowerCase() === "false";
  return isTrueFalse ? "TRUE_FALSE" : "MULTIPLE_CHOICE";
}

async function requireQuestion(userId: string, questionId: string) {
  const question = await quizRepository.findQuestion(userId, questionId);
  if (!question) throw new NotFoundError("Question");
  return question;
}

export const quizService = {
  getDetail(userId: string, noteId: string, quizId: string) {
    return quizRepository.findDetail(userId, noteId, quizId, ATTEMPT_HISTORY_SIZE);
  },

  /** Explanations already earned on this quiz, for showing alongside a previous result. */
  async unlockedExplanations(userId: string, noteId: string, quizId: string): Promise<UnlockedExplanation[]> {
    const progress = await progressService.refreshNote(userId, noteId);
    const quiz = await quizRepository.findWithQuestions(userId, quizId);
    if (!quiz) return [];
    return progress.unlocked.filter((item) => quiz.questions.some((question) => question.id === item.id));
  },

  async generate(userId: string, noteId: string, size: QuizSize): Promise<{ id: string }> {
    const note = await noteRepository.findWithSections(userId, noteId);
    if (!note) throw new NotFoundError("Note");
    if (note.sections.length === 0) throw new AppError("This note has no content to make a quiz from yet.");

    const recent = await quizRepository.countCreatedSince(userId, new Date(Date.now() - DAY_MS));
    if (recent >= DAILY_QUIZ_LIMIT) {
      throw new AppError(`You have reached the limit of ${DAILY_QUIZ_LIMIT} new quizzes per day. Please try again tomorrow.`);
    }

    const questions = await aiBudgetService.run(userId, "quiz", async () => {
      const generated = await generateQuizQuestions({ title: note.title, sections: note.sections, count: size });
      return { result: generated.questions, usage: generated.usage };
    });
    const quiz = await quizRepository.create(userId, { noteId, title: `Quiz ${note._count.quizzes + 1}`, questions });
    return { id: quiz.id };
  },

  async delete(userId: string, quizId: string): Promise<{ noteId: string }> {
    const quiz = await quizRepository.findById(userId, quizId);
    if (!quiz) throw new NotFoundError("Quiz");
    await quizRepository.delete(quizId);
    // Mastery is computed over all of the note's quizzes, so it changes when one goes.
    await progressService.refreshNote(userId, quiz.noteId);
    return { noteId: quiz.noteId };
  },

  /**
   * Scores the answers against the stored questions, records the attempt, and updates the
   * note's mastery, review schedule and the user's streak.
   */
  async submitAttempt(
    userId: string,
    profile: { studyStreak: number; lastStudiedOn: Date | null },
    quizId: string,
    submitted: AttemptAnswers,
  ): Promise<AttemptOutcome> {
    const quiz = await quizRepository.findWithQuestions(userId, quizId);
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.questions.length === 0) throw new AppError("This quiz has no questions.");

    // Only answers to this quiz's own questions are kept.
    const answers: Record<string, number> = {};
    let score = 0;
    for (const question of quiz.questions) {
      const answer = submitted[question.id];
      if (answer === undefined) continue;
      answers[question.id] = answer;
      if (answer === question.correctIndex) score++;
    }
    const total = quiz.questions.length;
    await quizRepository.createAttempt(userId, { quizId, score, total, answers });
    const percent = Math.round((score / total) * 100);
    const [progress, streak] = await Promise.all([
      progressService.refreshNote(userId, quiz.noteId, percent),
      progressService.recordStudy(userId, profile),
    ]);
    return {
      score,
      total,
      noteId: quiz.noteId,
      mastery: progress.mastery,
      reviewDueAt: progress.reviewDueAt,
      streak,
      // Only this quiz's questions; explanations stay hidden until a question is known twice over.
      unlocked: progress.unlocked.filter((item) => quiz.questions.some((question) => question.id === item.id)),
      questionCount: quiz.questions.length,
    };
  },

  async addQuestion(userId: string, quizId: string, input: QuestionInput): Promise<QuizLocation> {
    const quiz = await quizRepository.findById(userId, quizId);
    if (!quiz) throw new NotFoundError("Quiz");
    await quizRepository.appendQuestion(quizId, { ...input, type: questionType(input.options) });
    return { quizId, noteId: quiz.noteId };
  },

  async updateQuestion(userId: string, questionId: string, input: QuestionInput): Promise<QuizLocation> {
    const question = await requireQuestion(userId, questionId);
    await quizRepository.updateQuestion(questionId, { ...input, type: questionType(input.options) });
    return { quizId: question.quizId, noteId: question.quiz.noteId };
  },

  async deleteQuestion(userId: string, questionId: string): Promise<QuizLocation> {
    const question = await requireQuestion(userId, questionId);
    await quizRepository.deleteQuestion(questionId);
    return { quizId: question.quizId, noteId: question.quiz.noteId };
  },
};
