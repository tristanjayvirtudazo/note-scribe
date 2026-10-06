import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { FlashcardPanel } from "@/components/notes/flashcard-panel";
import { GenerationPanel } from "@/components/notes/generation-panel";
import { NoteContents, NoteDocument } from "@/components/notes/note-document";
import { NoteFiles } from "@/components/notes/note-files";
import { NoteHeader } from "@/components/notes/note-header";
import { QuizPanel } from "@/components/notes/quiz-panel";
import { isUuid } from "@/lib/constants";
import { requireUser } from "@/server/auth/session";
import { getRequestOrigin } from "@/server/request-origin";
import { calendarService } from "@/server/services/calendar.service";
import { noteService } from "@/server/services/note.service";
import { subjectService } from "@/server/services/subject.service";

export const metadata: Metadata = { title: "Note" };
// Reading files with AI can take a while; applies to the Server Actions called from this page.
export const maxDuration = 300;

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [note, subjects] = await Promise.all([noteService.getDetail(user.id, id), subjectService.list(user.id)]);
  if (!note) notFound();
  const calendarLinks = calendarService.linksFor(note, await getRequestOrigin());
  const sections = note.sections.map(({ id, heading, content }) => ({ id, heading, content }));


  return (
    <div className="grid gap-6">
      <Link href="/notes" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> All notes
      </Link>

      <NoteHeader
        note={{ id: note.id, title: note.title, description: note.description, subjectId: note.subjectId }}
        subject={note.subject && { name: note.subject.name, color: note.subject.color }}
        subjects={subjects.map(({ id, name }) => ({ id, name }))}
        canRegenerate={note.sections.length > 0 && note.files.length > 0}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4">
          {note.sections.length === 0 && <GenerationPanel noteId={note.id} failed={note.status === "FAILED"} error={note.error} />}
          <NoteDocument noteId={note.id} sections={sections} />
        </div>
        <aside className="grid grid-cols-1 gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-x-hidden lg:overflow-y-auto">
          <NoteContents sections={sections} className="hidden rounded-2xl border bg-card p-4 shadow-sm lg:block" />
          <QuizPanel noteId={note.id} quizzes={note.quizzes} hasContent={note.sections.length > 0} mastery={note.mastery} reviewDueAt={note.reviewDueAt} calendarLinks={calendarLinks} />
          <FlashcardPanel noteId={note.id} total={note.flashcards.total} due={note.flashcards.due} hasContent={note.sections.length > 0} />
          <NoteFiles files={note.files.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size }))} />
        </aside>
      </div>
    </div>
  );
}
