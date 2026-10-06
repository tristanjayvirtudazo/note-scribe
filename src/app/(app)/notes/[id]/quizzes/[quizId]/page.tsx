import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { QuizView } from "@/components/quiz/quiz-view";
import { isUuid } from "@/lib/constants";
import { currentStreak } from "@/lib/review";
import { requireUser } from "@/server/auth/session";
import { quizService } from "@/server/services/quiz.service";

export const metadata: Metadata = { title: "Quiz" };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export default async function QuizPage({ params }: PageProps<"/notes/[id]/quizzes/[quizId]">) {
  const user = await requireUser();
  const { id, quizId } = await params;
  if (!isUuid(id) || !isUuid(quizId)) notFound();

  const quiz = await quizService.getDetail(user.id, id, quizId);
  if (!quiz) notFound();
  const unlocked = await quizService.unlockedExplanations(user.id, id, quizId);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link href={`/notes/${id}`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" /> Back to note
      </Link>
      <div>
        <p className="text-sm text-muted-foreground">{quiz.note.title}</p>
        <h1 className="font-heading text-2xl font-semibold">{quiz.title}</h1>
      </div>
      <QuizView
        noteId={id}
        quizId={quiz.id}
        questions={quiz.questions.map(({ id, prompt, options, correctIndex, explanation }) => ({ id, prompt, options, correctIndex, explanation }))}
        attempts={quiz.attempts.map((attempt) => ({ id: attempt.id, score: attempt.score, total: attempt.total, date: dateFormat.format(attempt.createdAt) }))}
        progress={{ mastery: quiz.note.mastery, reviewDueAt: quiz.note.reviewDueAt?.toISOString() ?? null, unlocked, streak: currentStreak(user) }}
      />
    </div>
  );
}
