import "server-only";
import { prisma } from "@/server/db";

export const aiUsageRepository = {
  record(data: { userId: string; task: string; model: string | null; promptTokens: number; outputTokens: number; thinkingTokens: number; ok: boolean }) {
    return prisma.aiUsage.create({ data });
  },

  countSince(since: Date, userId?: string) {
    return prisma.aiUsage.count({ where: { createdAt: { gte: since }, userId } });
  },
};
