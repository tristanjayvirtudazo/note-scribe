import "server-only";
import type { QuestionType } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";

interface QuestionData {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

export const quizRepository = {
  findById(userId: string, id: string) {
    return prisma.quiz.findFirst({ where: { id, userId } });
  },

  findWithQuestions(userId: string, id: string) {
    return prisma.quiz.findFirst({ where: { id, userId }, include: { questions: true } });
  },

  findDetail(userId: string, noteId: string, id: string, attemptLimit: number) {
    return prisma.quiz.findFirst({
      where: { id, noteId, userId },
      include: {
        note: { select: { title: true, mastery: true, reviewDueAt: true } },
        questions: { orderBy: [{ position: "asc" }, { id: "asc" }] },
        attempts: { orderBy: { createdAt: "desc" }, take: attemptLimit },
      },
    });
  },

  /** Every question and every attempt across a note's quizzes, newest attempts first. */
  findReviewData(userId: string, noteId: string) {
    return prisma.quiz.findMany({
      where: { userId, noteId },
      select: {
        questions: { select: { id: true, prompt: true, options: true, correctIndex: true, explanation: true } },
        attempts: { select: { answers: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      },
    });
  },

  countCreatedSince(userId: string, since: Date) {
    return prisma.quiz.count({ where: { userId, createdAt: { gte: since } } });
  },

  create(userId: string, data: { noteId: string; title: string; questions: QuestionData[] }) {
    const { questions, ...quiz } = data;
    return prisma.quiz.create({
      data: { ...quiz, userId, questions: { create: questions.map((question, position) => ({ ...question, position })) } },
    });
  },

  delete(id: string) {
    return prisma.quiz.delete({ where: { id } });
  },

  createAttempt(userId: string, data: { quizId: string; score: number; total: number; answers: Record<string, number> }) {
    return prisma.quizAttempt.create({ data: { ...data, userId } });
  },

  // Questions

  findQuestion(userId: string, questionId: string) {
    return prisma.quizQuestion.findFirst({ where: { id: questionId, quiz: { userId } }, include: { quiz: true } });
  },

  async appendQuestion(quizId: string, question: QuestionData) {
    const last = await prisma.quizQuestion.aggregate({ where: { quizId }, _max: { position: true } });
    return prisma.quizQuestion.create({ data: { ...question, quizId, position: (last._max.position ?? -1) + 1 } });
  },

  updateQuestion(questionId: string, question: QuestionData) {
    return prisma.quizQuestion.update({ where: { id: questionId }, data: question });
  },

  deleteQuestion(questionId: string) {
    return prisma.quizQuestion.delete({ where: { id: questionId } });
  },
};
