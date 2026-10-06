"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClockIcon, ChevronRightIcon, ListChecksIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { generateQuiz } from "@/app/actions/quizzes";
import { AddToCalendar } from "@/components/notes/add-to-calendar";
import { CountPicker } from "@/components/count-picker";
import { Button } from "@/components/ui/button";
import { MAX_QUIZ_SIZE, QUIZ_SIZES } from "@/lib/constants";
import { describeDue } from "@/lib/review";

type QuizSummary = { id: string; title: string; questionCount: number; attemptCount: number; bestPercent: number | null };

export function QuizPanel({
  noteId,
  quizzes,
  hasContent,
  mastery,
  reviewDueAt,
  calendarLinks,
}: {
  noteId: string;
  quizzes: QuizSummary[];
  hasContent: boolean;
  mastery: number | null;
  reviewDueAt: Date | null;
  calendarLinks: { google: string; outlook: string; ics: string } | null;
}) {
  const router = useRouter();
  const [size, setSize] = useState<number>(QUIZ_SIZES[1]);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateQuiz(noteId, size);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Your quiz is ready.");
      router.push(`/notes/${noteId}/quizzes/${result.data.id}`);
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <ListChecksIcon className="size-4 text-primary" /> Quizzes
      </h2>

      {mastery !== null && (
        <div className="mt-3 rounded-xl bg-primary/5 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Mastery</span>
            <span className="font-heading font-semibold tabular-nums">{mastery}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${mastery}%` }} />
          </div>
          {reviewDueAt && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClockIcon className="size-3.5" /> Next review {describeDue(reviewDueAt)}
            </p>
          )}
          {calendarLinks && (
            <div className="mt-1">
              <AddToCalendar links={calendarLinks} />
            </div>
          )}
        </div>
      )}

      {quizzes.length > 0 && (
        <ul className="mt-3 grid gap-1">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <Link
                href={`/notes/${noteId}/quizzes/${quiz.id}`}
                className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{quiz.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {quiz.questionCount} questions · {quiz.attemptCount === 0 ? "Not taken yet" : `${quiz.attemptCount} ${quiz.attemptCount === 1 ? "attempt" : "attempts"}`}
                  </span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasContent ? (
        <div className="mt-3 grid gap-3">
          <CountPicker label={quizzes.length === 0 ? "Test yourself: how many questions?" : "Make another quiz: how many questions?"} value={size} onChange={setSize} presets={QUIZ_SIZES} max={MAX_QUIZ_SIZE} disabled={pending} />
          <Button size="lg" disabled={pending} onClick={generate}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {pending ? "Writing questions…" : "Generate quiz"}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Add content to this note to generate a quiz from it.</p>
      )}
    </section>
  );
}
