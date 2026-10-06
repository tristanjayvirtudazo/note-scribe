import "server-only";
import { prisma } from "@/server/db";

export const subjectRepository = {
  listByUser(userId: string) {
    return prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" } });
  },

  listWithNoteCounts(userId: string) {
    return prisma.subject.findMany({ where: { userId }, orderBy: { name: "asc" }, include: { _count: { select: { notes: true } } } });
  },

  findById(userId: string, id: string) {
    return prisma.subject.findFirst({ where: { id, userId } });
  },

  /** Case-insensitive, so "biology" and "Biology" count as the same subject. */
  findByName(userId: string, name: string) {
    return prisma.subject.findFirst({ where: { userId, name: { equals: name, mode: "insensitive" } } });
  },

  create(userId: string, data: { name: string; color?: string }) {
    return prisma.subject.create({ data: { ...data, userId } });
  },

  /** Returns false when the subject does not exist or belongs to someone else. */
  async update(userId: string, id: string, data: { name: string; color: string }) {
    const { count } = await prisma.subject.updateMany({ where: { id, userId }, data });
    return count > 0;
  },

  async delete(userId: string, id: string) {
    const { count } = await prisma.subject.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};
