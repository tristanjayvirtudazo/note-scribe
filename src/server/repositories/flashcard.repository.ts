import "server-only";
import { prisma } from "@/server/db";

interface CardContent {
  front: string;
  back: string;
}

/** A card is due when its review date has passed, or when it has never been reviewed. */
function dueWhere(now: Date) {
  return { OR: [{ box: 0 }, { dueAt: { lte: now } }] };
}

export const flashcardRepository = {
  listByNote(userId: string, noteId: string) {
    return prisma.flashcard.findMany({ where: { userId, noteId }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  },

  findById(userId: string, id: string) {
    return prisma.flashcard.findFirst({ where: { id, userId } });
  },

  async summaryByNote(userId: string, noteId: string, now: Date) {
    const [total, due] = await Promise.all([
      prisma.flashcard.count({ where: { userId, noteId } }),
      prisma.flashcard.count({ where: { userId, noteId, ...dueWhere(now) } }),
    ]);
    return { total, due };
  },

  /** Number of due cards per note, for every note of the user that has any. */
  async dueCountsByNote(userId: string, now: Date): Promise<Map<string, number>> {
    const groups = await prisma.flashcard.groupBy({ by: ["noteId"], where: { userId, ...dueWhere(now) }, _count: { _all: true } });
    return new Map(groups.map((group) => [group.noteId, group._count._all]));
  },

  /** Cards for a study session: overdue first, then never-reviewed ones. */
  listDue(userId: string, noteId: string, now: Date, limit: number) {
    return prisma.flashcard.findMany({
      where: { userId, noteId, ...dueWhere(now) },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { position: "asc" }],
      take: limit,
    });
  },

  /** Every scheduled card with its note, for the calendar feed. */
  listScheduled(userId: string) {
    return prisma.flashcard.findMany({
      where: { userId, dueAt: { not: null } },
      select: { noteId: true, dueAt: true, note: { select: { title: true } } },
    });
  },

  /** Generation batches today: cards made in one request share a creation timestamp. */
  async countBatchesSince(userId: string, since: Date) {
    const batches = await prisma.flashcard.groupBy({ by: ["createdAt"], where: { userId, createdAt: { gte: since } } });
    return batches.length;
  },

  async appendMany(userId: string, noteId: string, cards: CardContent[]) {
    const last = await prisma.flashcard.aggregate({ where: { noteId }, _max: { position: true } });
    const start = (last._max.position ?? -1) + 1;
    return prisma.flashcard.createMany({ data: cards.map((card, index) => ({ ...card, userId, noteId, position: start + index })) });
  },

  update(id: string, card: CardContent) {
    return prisma.flashcard.update({ where: { id }, data: card });
  },

  delete(id: string) {
    return prisma.flashcard.delete({ where: { id } });
  },

  recordReview(id: string, data: { box: number; dueAt: Date; reviewedAt: Date }) {
    return prisma.flashcard.update({
      where: { id },
      data: { box: data.box, dueAt: data.dueAt, lastReviewedAt: data.reviewedAt, reviewedCount: { increment: 1 } },
    });
  },
};
