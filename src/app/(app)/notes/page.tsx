import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClockIcon, FlameIcon, FolderIcon, ListChecksIcon, NotebookTextIcon, PlusIcon, SearchXIcon } from "lucide-react";
import { NoteCard } from "@/components/notes/note-card";
import { NotesSearch } from "@/components/notes/notes-search";
import { EmptyState, PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isUuid } from "@/lib/constants";
import { currentStreak } from "@/lib/review";
import { requireUser } from "@/server/auth/session";
import { noteService } from "@/server/services/note.service";
import { subjectService } from "@/server/services/subject.service";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({ searchParams }: PageProps<"/notes">) {
  const user = await requireUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const subjectParam = typeof params.subject === "string" ? params.subject : "";
  const subjectFilter = subjectParam === "none" ? null : isUuid(subjectParam) ? subjectParam : undefined;
  const isFiltered = Boolean(query) || subjectFilter !== undefined;

  const [subjects, { notes, due }] = await Promise.all([
    subjectService.list(user.id),
    noteService.list(user.id, { query, subjectId: subjectFilter }),
  ]);
  const streak = currentStreak(user);

  const firstName = user.fullName?.trim().split(/\s+/)[0];
  const stats = [
    { icon: NotebookTextIcon, label: isFiltered ? "Matching notes" : "Notes", value: notes.length },
    { icon: FolderIcon, label: "Subjects", value: subjects.length },
    { icon: ListChecksIcon, label: isFiltered ? "Quizzes in these notes" : "Quizzes", value: notes.reduce((total, note) => total + note._count.quizzes, 0) },
    { icon: FlameIcon, label: streak === 1 ? "Day streak" : "Day streak", value: streak },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        icon={NotebookTextIcon}
        title="Your notes"
        description={firstName ? `Welcome back, ${firstName}. Ready to study?` : "Everything you have turned into study material."}
        action={
          <Link href="/notes/new" className={buttonVariants({ size: "lg", className: "shadow-md shadow-primary/25" })}>
            <PlusIcon /> New note
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-2xl border bg-card p-3 sm:p-4">
            <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
              <stat.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <dd className="font-heading text-2xl font-semibold tabular-nums">{stat.value}</dd>
              <dt className="truncate text-xs text-muted-foreground">{stat.label}</dt>
            </div>
          </div>
        ))}
      </dl>

      {!isFiltered && due.length > 0 && (
        <section aria-labelledby="due-heading" className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClockIcon className="size-5 text-primary" />
            <h2 id="due-heading" className="font-heading font-semibold">
              Due for review
            </h2>
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">{due.length}</span>
            <p className="ml-auto hidden text-xs text-muted-foreground sm:block">A short review today beats a long one next week.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {due.map((note) => (
              <li key={note.id}>
                <NoteCard note={note} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <NotesSearch query={query} subject={subjectParam} subjects={subjects.map(({ id, name }) => ({ id, name }))} />

      {notes.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      ) : isFiltered ? (
        <EmptyState icon={SearchXIcon} title="No notes match your search">
          <Link href="/notes" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Clear search
          </Link>
        </EmptyState>
      ) : (
        <EmptyState icon={NotebookTextIcon} title="You have no notes yet">
          <p className="max-w-sm text-sm text-muted-foreground">Upload a photo or a PDF and we will turn it into study notes you can edit and quiz yourself on.</p>
          <Link href="/notes/new" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Create your first note
          </Link>
        </EmptyState>
      )}
    </div>
  );
}
