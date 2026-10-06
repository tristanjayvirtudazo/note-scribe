import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { FlashcardStudio } from "@/components/flashcards/flashcard-studio";
import { isUuid } from "@/lib/constants";
import { currentStreak, describeDue } from "@/lib/review";
import { requireUser } from "@/server/auth/session";
import { flashcardService } from "@/server/services/flashcard.service";
import { noteService } from "@/server/services/note.service";

export const metadata: Metadata = { title: "Flashcards" };

export default async function FlashcardsPage({ params }: PageProps<"/notes/[id]/flashcards">) {
  const user = await requireUser();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const note = await noteService.getSummary(user.id, id);
  if (!note) notFound();
  const [cards, session] = await Promise.all([flashcardService.list(user.id, id), flashcardService.startSession(user.id, id)]);

  const now = new Date();
  const upcoming = cards.map((card) => card.dueAt).filter((dueAt): dueAt is Date => dueAt !== null && dueAt > now).sort((a, b) => a.getTime() - b.getTime())[0];

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link href={`/notes/${id}`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Back to note
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">{note.title}</p>
        <h1 className="font-heading text-2xl font-semibold">Flashcards</h1>
      </div>
      <FlashcardStudio
        noteId={id}
        hasContent={note.status === "READY"}
        session={session}
        cards={cards.map(({ id, front, back, box, dueAt, reviewedCount }) => ({ id, front, back, box, due: dueAt ? describeDue(dueAt, now) : null, reviewedCount }))}
        nextDue={upcoming ? describeDue(upcoming, now) : null}
        streak={currentStreak(user)}
      />
    </div>
  );
}
