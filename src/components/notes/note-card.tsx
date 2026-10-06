import Link from "next/link";
import { CalendarClockIcon, FileTextIcon, LayersIcon, ListChecksIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { subjectColorClass } from "@/lib/constants";
import { describeDue } from "@/lib/review";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

interface NoteCardProps {
  note: {
    id: string;
    title: string;
    description: string | null;
    status: "PENDING" | "READY" | "FAILED";
    updatedAt: Date;
    subject: { name: string; color: string } | null;
    _count: { sections: number; quizzes: number };
    mastery: number | null;
    reviewDueAt: Date | null;
    dueCards: number;
    isDue: boolean;
  };
}

export function NoteCard({ note }: NoteCardProps) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="card-lift relative flex h-full flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 pt-5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {/* Colour strip matching the note's subject. */}
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${note.subject ? subjectColorClass(note.subject.color) : "bg-muted-foreground/25"}`} />
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {note.subject ? (
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className={`size-2 rounded-full ${subjectColorClass(note.subject.color)}`} />
            {note.subject.name}
          </span>
        ) : (
          <span>No subject</span>
        )}
        {note.status === "PENDING" && <Badge variant="secondary">Not generated</Badge>}
        {note.status === "FAILED" && <Badge variant="destructive">Needs attention</Badge>}
        {note.isDue && (
          <Badge className="ml-auto gap-1">
            <CalendarClockIcon className="size-3" /> Due
          </Badge>
        )}
      </div>
      <h2 className="line-clamp-2 font-heading text-base font-semibold">{note.title}</h2>
      {note.description && <p className="line-clamp-2 text-sm text-muted-foreground">{note.description}</p>}
      {(note.mastery !== null || note.dueCards > 0) && (
        <div className="flex items-center gap-3 text-xs">
          {note.mastery !== null && (
            <span className="flex flex-1 items-center gap-2" title="Share of quiz questions you got right on their last two appearances">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${note.mastery}%` }} />
              </span>
              <span className="font-medium tabular-nums">{note.mastery}% mastery</span>
            </span>
          )}
          {note.dueCards > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <LayersIcon className="size-3.5" /> {note.dueCards} {note.dueCards === 1 ? "card" : "cards"} due
            </span>
          )}
        </div>
      )}
      <div className="mt-auto flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <FileTextIcon className="size-3.5" /> {note._count.sections} {note._count.sections === 1 ? "part" : "parts"}
        </span>
        <span className="flex items-center gap-1">
          <ListChecksIcon className="size-3.5" /> {note._count.quizzes} {note._count.quizzes === 1 ? "quiz" : "quizzes"}
        </span>
        <span className="ml-auto">{note.reviewDueAt && !note.isDue ? `Review ${describeDue(note.reviewDueAt)}` : dateFormat.format(note.updatedAt)}</span>
      </div>
    </Link>
  );
}
