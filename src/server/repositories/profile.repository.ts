import "server-only";
import { prisma } from "@/server/db";

export const profileRepository = {
  /** Returns the profile for an auth user, creating it on first sight and keeping its email current. */
  async syncFromAuth(authUser: { id: string; email: string; fullName: string | null }) {
    const existing = await prisma.profile.findUnique({ where: { id: authUser.id } });
    if (existing) {
      if (existing.email === authUser.email) return existing;
      return prisma.profile.update({ where: { id: authUser.id }, data: { email: authUser.email } });
    }
    return prisma.profile.upsert({ where: { id: authUser.id }, update: {}, create: authUser });
  },

  updateStreak(id: string, data: { studyStreak: number; lastStudiedOn: Date }) {
    return prisma.profile.update({ where: { id }, data });
  },

  /** Removes the profile and, through cascades, everything the user created. */
  delete(id: string) {
    return prisma.profile.delete({ where: { id } });
  },

  findByCalendarTokenHash(hash: string) {
    return prisma.profile.findUnique({ where: { calendarTokenHash: hash }, select: { id: true, fullName: true } });
  },

  setCalendarTokenHash(id: string, hash: string | null) {
    return prisma.profile.update({ where: { id }, data: { calendarTokenHash: hash } });
  },

  updateName(id: string, fullName: string) {
    return prisma.profile.update({ where: { id }, data: { fullName } });
  },
};
