import "server-only";
import { DAILY_NOTE_LIMIT, MAX_FILE_SIZE, STORAGE_QUOTA_BYTES, formatFileSize } from "@/lib/constants";
import type { CreateNoteInput, NoteDetailsInput, SectionInput, UploadRequest } from "@/lib/validation";
import { generateStudySections } from "@/server/ai/gemini";
import { AppError, NotFoundError } from "@/server/errors";
import { isDue } from "@/lib/review";
import { flashcardRepository } from "@/server/repositories/flashcard.repository";
import { noteRepository } from "@/server/repositories/note.repository";
import { aiBudgetService } from "@/server/services/ai-budget.service";
import { subjectService } from "@/server/services/subject.service";
import { noteFileStorage, type UploadTarget } from "@/server/storage/note-files.storage";

const DAY_MS = 24 * 60 * 60 * 1000;
const FILE_VIEW_SECONDS = 300;
const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Each upload batch gets its own folder inside the owner's folder. */
function uploadFolder(userId: string, uploadId: string): string {
  return `${userId}/${uploadId}`;
}

async function assertUnderDailyLimit(userId: string): Promise<void> {
  const recent = await noteRepository.countCreatedSince(userId, new Date(Date.now() - DAY_MS));
  if (recent >= DAILY_NOTE_LIMIT) {
    throw new AppError(`You have reached the limit of ${DAILY_NOTE_LIMIT} new notes per day. Please try again tomorrow.`);
  }
}

async function requireSection(userId: string, sectionId: string) {
  const section = await noteRepository.findSection(userId, sectionId);
  if (!section) throw new NotFoundError("Section");
  return section;
}

function bestPercent(attempts: { score: number; total: number }[]): number | null {
  if (attempts.length === 0) return null;
  return Math.max(...attempts.map((attempt) => Math.round((attempt.score / attempt.total) * 100)));
}

export const noteService = {
  /**
   * The notes list, each note annotated with its review state, plus the notes due for review
   * (by schedule or because flashcards are waiting), most overdue first.
   */
  async list(userId: string, filters: { query: string; subjectId: string | null | undefined }) {
    const now = new Date();
    const dueCards = await flashcardRepository.dueCountsByNote(userId, now);
    const [notes, due] = await Promise.all([
      noteRepository.search(userId, filters),
      noteRepository.listDue(userId, now, [...dueCards.keys()]),
    ]);
    const annotate = <T extends { id: string; reviewDueAt: Date | null }>(note: T) => ({
      ...note,
      dueCards: dueCards.get(note.id) ?? 0,
      isDue: isDue(note.reviewDueAt, now) || dueCards.has(note.id),
    });
    return { notes: notes.map(annotate), due: due.map(annotate) };
  },

  getSummary(userId: string, noteId: string) {
    return noteRepository.findSummary(userId, noteId);
  },

  /** Everything the note page shows, or null when the note is not this user's. */
  async getDetail(userId: string, noteId: string) {
    const note = await noteRepository.findDetail(userId, noteId);
    if (!note) return null;
    const { quizzes, ...rest } = note;
    const flashcards = await flashcardRepository.summaryByNote(userId, noteId, new Date());
    return {
      ...rest,
      flashcards,
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        questionCount: quiz._count.questions,
        attemptCount: quiz.attempts.length,
        bestPercent: bestPercent(quiz.attempts),
      })),
    };
  },

  /**
   * Step 1 of creating a note: the server picks where each file will live and hands the
   * browser a one-time upload permission per file. The browser never chooses a storage path.
   */
  async prepareUploads(userId: string, files: UploadRequest): Promise<{ uploadId: string; targets: UploadTarget[] }> {
    await assertUnderDailyLimit(userId);
    const stored = await noteRepository.sumFileSizes(userId);
    const incoming = files.reduce((total, file) => total + file.size, 0);
    if (stored + incoming > STORAGE_QUOTA_BYTES) {
      throw new AppError(
        `These files would take you over your storage limit of ${formatFileSize(STORAGE_QUOTA_BYTES)} (${formatFileSize(stored)} used). Delete some notes or use smaller files.`,
      );
    }
    const uploadId = crypto.randomUUID();
    const folder = uploadFolder(userId, uploadId);
    const targets = await Promise.all(
      files.map((file, index) => noteFileStorage.createUploadTarget(`${folder}/${index}.${FILE_EXTENSIONS[file.mimeType]}`)),
    );
    return { uploadId, targets };
  },

  /** Removes an upload batch that will not become a note. */
  async discardUploads(userId: string, uploadId: string): Promise<void> {
    const folder = uploadFolder(userId, uploadId);
    const objects = await noteFileStorage.listFolder(folder);
    await noteFileStorage.remove(objects.map((object) => `${folder}/${object.name}`));
  },

  /** Step 2: saves the note once its files are in storage. Study content is generated separately. */
  async create(userId: string, input: CreateNoteInput): Promise<{ id: string }> {
    const folder = uploadFolder(userId, input.uploadId);
    try {
      // Trust storage, not the browser, about what was actually uploaded.
      const stored = new Map((await noteFileStorage.listFolder(folder)).map((object) => [`${folder}/${object.name}`, object]));
      const files = input.files.map((file) => {
        const object = stored.get(file.path);
        if (!object) throw new AppError(`"${file.name}" did not finish uploading. Please add it again.`);
        const size = object.size ?? file.size;
        if (size > MAX_FILE_SIZE) throw new AppError(`"${file.name}" is too large.`);
        return { name: file.name, path: file.path, mimeType: file.mimeType, size };
      });

      await assertUnderDailyLimit(userId);
      const subjectId = await subjectService.resolveForNote(userId, input);
      const note = await noteRepository.create(userId, { title: input.title, description: input.description, subjectId, files });
      return { id: note.id };
    } catch (error) {
      await noteFileStorage.remove(input.files.map((file) => file.path).filter((path) => path.startsWith(`${folder}/`)));
      throw error;
    }
  },

  /** Reads the note's files with AI and replaces its sections with the generated study guide. */
  async generateContent(userId: string, noteId: string): Promise<void> {
    const note = await noteRepository.findWithFiles(userId, noteId);
    if (!note) throw new NotFoundError("Note");
    try {
      if (note.files.length === 0) throw new AppError("This note has no files to read.");
      const files = await Promise.all(
        note.files.map(async (file) => {
          const data = await noteFileStorage.download(file.path);
          if (!data) throw new AppError(`We could not open "${file.name}". Please upload it again.`);
          return { name: file.name, mimeType: file.mimeType, data };
        }),
      );
      const sections = await aiBudgetService.run(userId, "notes", async () => {
        const generated = await generateStudySections({ title: note.title, description: note.description, files });
        return { result: generated.sections, usage: generated.usage };
      });
      await noteRepository.replaceSections(noteId, sections);
    } catch (error) {
      if (!(error instanceof AppError)) console.error("Note generation failed", error);
      const failure = error instanceof AppError ? error : new AppError("Something went wrong while generating this note. Please try again.", { cause: error });
      // A failed regeneration keeps the existing content; only a note with nothing to show is marked failed.
      if ((await noteRepository.countSections(noteId)) === 0) await noteRepository.markFailed(noteId, failure.message);
      throw failure;
    }
  },

  async updateDetails(userId: string, noteId: string, input: NoteDetailsInput): Promise<void> {
    const subjectId = await subjectService.resolveForNote(userId, input);
    if (!(await noteRepository.updateDetails(userId, noteId, { ...input, subjectId }))) throw new NotFoundError("Note");
  },

  async delete(userId: string, noteId: string): Promise<void> {
    const note = await noteRepository.findWithFiles(userId, noteId);
    if (!note) throw new NotFoundError("Note");
    await noteFileStorage.remove(note.files.map((file) => file.path));
    await noteRepository.delete(noteId);
  },

  /** A short-lived link to view one of the note's original files. */
  async getFileUrl(userId: string, fileId: string): Promise<{ url: string }> {
    const file = await noteRepository.findFile(userId, fileId);
    if (!file) throw new NotFoundError("File");
    const url = await noteFileStorage.createViewUrl(file.path, FILE_VIEW_SECONDS);
    if (!url) throw new AppError("We could not open this file.");
    return { url };
  },

  async addSection(userId: string, noteId: string, input: SectionInput): Promise<void> {
    if (!(await noteRepository.exists(userId, noteId))) throw new NotFoundError("Note");
    await noteRepository.appendSection(noteId, input);
  },

  // The section operations return the note they belong to, so callers can refresh its page.

  async updateSection(userId: string, sectionId: string, input: SectionInput): Promise<{ noteId: string }> {
    const section = await requireSection(userId, sectionId);
    await noteRepository.updateSection(sectionId, input);
    return { noteId: section.noteId };
  },

  async deleteSection(userId: string, sectionId: string): Promise<{ noteId: string }> {
    const section = await requireSection(userId, sectionId);
    await noteRepository.deleteSection(sectionId);
    return { noteId: section.noteId };
  },

  async moveSection(userId: string, sectionId: string, direction: "up" | "down"): Promise<{ noteId: string }> {
    const section = await requireSection(userId, sectionId);
    const ids = (await noteRepository.listSectionIds(section.noteId)).map((item) => item.id);
    const from = ids.indexOf(sectionId);
    const to = direction === "up" ? from - 1 : from + 1;
    if (to >= 0 && to < ids.length) {
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await noteRepository.reorderSections(ids);
    }
    return { noteId: section.noteId };
  },
};
