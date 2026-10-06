import "server-only";
import type { SubjectInput } from "@/lib/validation";
import { AppError, NotFoundError } from "@/server/errors";
import { subjectRepository } from "@/server/repositories/subject.repository";

const NAME_TAKEN = "You already have a subject with that name.";

export const subjectService = {
  list(userId: string) {
    return subjectRepository.listByUser(userId);
  },

  async listWithNoteCounts(userId: string) {
    const subjects = await subjectRepository.listWithNoteCounts(userId);
    return subjects.map(({ id, name, color, _count }) => ({ id, name, color, noteCount: _count.notes }));
  },

  async create(userId: string, input: SubjectInput): Promise<{ id: string }> {
    if (await subjectRepository.findByName(userId, input.name)) throw new AppError(NAME_TAKEN);
    const subject = await subjectRepository.create(userId, input);
    return { id: subject.id };
  },

  async update(userId: string, id: string, input: SubjectInput): Promise<void> {
    const sameName = await subjectRepository.findByName(userId, input.name);
    if (sameName && sameName.id !== id) throw new AppError(NAME_TAKEN);
    if (!(await subjectRepository.update(userId, id, input))) throw new NotFoundError("Subject");
  },

  /** Notes in the subject are kept and become uncategorized. */
  async delete(userId: string, id: string): Promise<void> {
    if (!(await subjectRepository.delete(userId, id))) throw new NotFoundError("Subject");
  },

  /** The subject a note should be filed under: an existing one, a newly named one, or none. */
  async resolveForNote(userId: string, choice: { subjectId: string | null; newSubjectName?: string | null }): Promise<string | null> {
    if (choice.newSubjectName) {
      const existing = await subjectRepository.findByName(userId, choice.newSubjectName);
      return (existing ?? (await subjectRepository.create(userId, { name: choice.newSubjectName }))).id;
    }
    if (!choice.subjectId) return null;
    if (!(await subjectRepository.findById(userId, choice.subjectId))) throw new AppError("That subject no longer exists.");
    return choice.subjectId;
  },
};
