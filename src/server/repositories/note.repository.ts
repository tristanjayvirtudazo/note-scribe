import "server-only";
import { prisma } from "@/server/db";

interface NewFile {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

interface SectionContent {
  heading: string;
  content: string;
}

const sectionOrder = [{ position: "asc" }, { createdAt: "asc" }] as const;

export const noteRepository = {
  search(userId: string, filters: { query: string; subjectId: string | null | undefined }) {
    const { query, subjectId } = filters;
    return prisma.note.findMany({
      where: {
        userId,
        // undefined = any subject, null = notes without a subject.
        subjectId,
        OR: query
          ? [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { sections: { some: { content: { contains: query, mode: "insensitive" } } } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
      include: { subject: true, _count: { select: { sections: true, quizzes: true } } },
    });
  },

  findDetail(userId: string, id: string) {
    return prisma.note.findFirst({
      where: { id, userId },
      include: {
        subject: true,
        files: { orderBy: { createdAt: "asc" } },
        sections: { orderBy: [...sectionOrder] },
        quizzes: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { questions: true } }, attempts: { select: { score: true, total: true } } },
        },
      },
    });
  },

  /** Notes whose scheduled review date has passed, or that are among `alsoIds`, most overdue first. */
  listDue(userId: string, now: Date, alsoIds: string[]) {
    return prisma.note.findMany({
      where: { userId, OR: [{ reviewDueAt: { lte: now } }, { id: { in: alsoIds } }] },
      orderBy: [{ reviewDueAt: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
      include: { subject: true, _count: { select: { sections: true, quizzes: true } } },
    });
  },

  updateReview(id: string, data: { reviewBox?: number; reviewDueAt?: Date | null; mastery: number | null }) {
    return prisma.note.update({ where: { id }, data });
  },

  /** Notes with a scheduled review, for the calendar feed. */
  listScheduled(userId: string) {
    return prisma.note.findMany({ where: { userId, reviewDueAt: { not: null } }, select: { id: true, title: true, reviewDueAt: true } });
  },

  findSummary(userId: string, id: string) {
    return prisma.note.findFirst({ where: { id, userId }, select: { id: true, title: true, status: true } });
  },

  findWithFiles(userId: string, id: string) {
    return prisma.note.findFirst({ where: { id, userId }, include: { files: true } });
  },

  findWithSections(userId: string, id: string) {
    return prisma.note.findFirst({
      where: { id, userId },
      include: { sections: { orderBy: [...sectionOrder] }, _count: { select: { quizzes: true } } },
    });
  },

  async exists(userId: string, id: string) {
    return (await prisma.note.count({ where: { id, userId } })) > 0;
  },

  /** Bytes of source files the user has stored, for the storage quota. */
  async sumFileSizes(userId: string) {
    const result = await prisma.noteFile.aggregate({ where: { note: { userId } }, _sum: { size: true } });
    return result._sum.size ?? 0;
  },

  countCreatedSince(userId: string, since: Date) {
    return prisma.note.count({ where: { userId, createdAt: { gte: since } } });
  },

  create(userId: string, data: { title: string; description: string | null; subjectId: string | null; files: NewFile[] }) {
    const { files, ...details } = data;
    return prisma.note.create({ data: { ...details, userId, files: { create: files } } });
  },

  async updateDetails(userId: string, id: string, data: { title: string; description: string | null; subjectId: string | null }) {
    const { count } = await prisma.note.updateMany({ where: { id, userId }, data });
    return count > 0;
  },

  delete(id: string) {
    return prisma.note.delete({ where: { id } });
  },

  markFailed(id: string, error: string) {
    return prisma.note.update({ where: { id }, data: { status: "FAILED", error } });
  },

  findFile(userId: string, fileId: string) {
    return prisma.noteFile.findFirst({ where: { id: fileId, note: { userId } } });
  },

  // Sections

  countSections(noteId: string) {
    return prisma.noteSection.count({ where: { noteId } });
  },

  findSection(userId: string, sectionId: string) {
    return prisma.noteSection.findFirst({ where: { id: sectionId, note: { userId } } });
  },

  listSectionIds(noteId: string) {
    return prisma.noteSection.findMany({ where: { noteId }, orderBy: [...sectionOrder], select: { id: true } });
  },

  /** Swaps in a freshly generated set of sections and marks the note ready, atomically. */
  replaceSections(noteId: string, sections: SectionContent[]) {
    return prisma.$transaction([
      prisma.noteSection.deleteMany({ where: { noteId } }),
      prisma.noteSection.createMany({ data: sections.map((section, position) => ({ ...section, noteId, position })) }),
      prisma.note.update({ where: { id: noteId }, data: { status: "READY", error: null } }),
    ]);
  },

  /** Appends a section. A note the user wrote content for is ready even if AI generation never succeeded. */
  async appendSection(noteId: string, section: SectionContent) {
    const last = await prisma.noteSection.aggregate({ where: { noteId }, _max: { position: true } });
    return prisma.$transaction([
      prisma.noteSection.create({ data: { ...section, noteId, position: (last._max.position ?? -1) + 1 } }),
      prisma.note.update({ where: { id: noteId }, data: { status: "READY", error: null } }),
    ]);
  },

  updateSection(sectionId: string, section: SectionContent) {
    return prisma.noteSection.update({ where: { id: sectionId }, data: section });
  },

  deleteSection(sectionId: string) {
    return prisma.noteSection.delete({ where: { id: sectionId } });
  },

  /** Rewrites positions so the sections appear in the given order. */
  reorderSections(orderedIds: string[]) {
    return prisma.$transaction(orderedIds.map((id, position) => prisma.noteSection.update({ where: { id }, data: { position } })));
  },
};
