"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClockIcon, CheckIcon, FlameIcon, Loader2Icon, LockIcon, LockOpenIcon, PencilIcon, PlusIcon, RotateCcwIcon, Trash2Icon, TrophyIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addQuestion, deleteQuestion, deleteQuiz, submitAttempt, updateQuestion, type AttemptResult } from "@/app/actions/quizzes";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorMessage, Field } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { describeDue } from "@/lib/review";
import type { ActionResult } from "@/lib/validation";

type Question = { id: string; prompt: string; options: string[]; correctIndex: number; explanation: string | null };
type Attempt = { id: string; score: number; total: number; date: string };
type Tab = "take" | "edit" | "history";

const tabs: { id: Tab; label: string }[] = [
  { id: "take", label: "Take quiz" },
  { id: "edit", label: "Edit questions" },
  { id: "history", label: "History" },
];

function encouragement(score: number): string {
  if (score === 100) return "Perfect score!";
  if (score >= 80) return "Great work! One more round will make it stick.";
  if (score >= 50) return "Good effort. Read the note again, then try once more.";
  return "Keep going. Review the note and come back for another try.";
}

function percent(score: number, total: number) {
  return total === 0 ? 0 : Math.round((score / total) * 100);
}

/** Small deterministic PRNG, so the server and the browser shuffle identically. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

type Unlocked = AttemptResult["unlocked"][number];
type Progress = { mastery: number | null; reviewDueAt: string | null; unlocked: Unlocked[]; streak: number };
type Result = { score: number; total: number; when: string };

export function QuizView({
  noteId,
  quizId,
  questions,
  attempts,
  progress: initialProgress,
}: {
  noteId: string;
  quizId: string;
  questions: Question[];
  attempts: Attempt[];
  progress: Progress;
}) {
  const [tab, setTab] = useState<Tab>("take");
  const [progress, setProgress] = useState(initialProgress);
  // The result card survives tab changes and reloads: it starts from the latest saved attempt.
  const latest = attempts[0];
  const [result, setResult] = useState<Result | null>(latest ? { score: latest.score, total: latest.total, when: latest.date } : null);
  // Each round gets a different question and option order.
  const [round, setRound] = useState(attempts.length);

  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="Quiz views" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className="h-9 rounded-md text-sm font-medium text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Remounts when questions change so a stale answer sheet is never scored. */}
      {tab === "take" && (
        <TakeQuiz
          key={`${round}:${questions.map((question) => question.id).join()}`}
          quizId={quizId}
          questions={questions}
          seed={hash(quizId) + round}
          result={result}
          progress={progress}
          onSubmitted={(submitted) => {
            setResult({ score: submitted.score, total: submitted.total, when: "Just now" });
            setProgress({ mastery: submitted.mastery, reviewDueAt: submitted.reviewDueAt, unlocked: submitted.unlocked, streak: submitted.streak });
            setRound((current) => current + 1);
          }}
        />
      )}
      {tab === "edit" && <EditQuestions noteId={noteId} quizId={quizId} questions={questions} />}
      {tab === "history" && <History attempts={attempts} />}
    </div>
  );
}

function TakeQuiz({
  quizId,
  questions,
  seed,
  result,
  progress,
  onSubmitted,
}: {
  quizId: string;
  questions: Question[];
  seed: number;
  result: Result | null;
  progress: Progress;
  onSubmitted: (result: AttemptResult) => void;
}) {
  // Answers are keyed by question id and hold the ORIGINAL option index, so the server scores
  // them regardless of the order shown here.
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [pending, startTransition] = useTransition();
  const answered = Object.keys(answers).length;

  // Questions and answer choices are reordered every round, so a score reflects knowing the
  // material rather than remembering where the right answer sat. True/false keeps its order.
  const random = seededRandom(seed);
  const ordered = shuffle(questions, random).map((question) => ({
    ...question,
    choices: question.options.map((label, originalIndex) => ({ label, originalIndex })),
  }));
  for (const question of ordered) {
    if (question.options.length !== 2 || question.options[0] !== "True") question.choices = shuffle(question.choices, random);
  }

  if (questions.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">This quiz has no questions yet. Add some under “Edit questions”.</p>;
  }

  function submit() {
    startTransition(async () => {
      const response = await submitAttempt(quizId, answers);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      onSubmitted(response.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  return (
    <div className="grid gap-4">
      {result && (
        <div role="status" className="flex flex-col items-center rounded-2xl bg-primary p-6 text-center text-primary-foreground shadow-lg shadow-primary/25">
          <span className="flex size-12 items-center justify-center rounded-full bg-white/20">
            <TrophyIcon className="size-6" />
          </span>
          <p className="mt-3 text-xs font-medium tracking-wide text-primary-foreground/80 uppercase">{result.when === "Just now" ? "Your result" : `Previous result · ${result.when}`}</p>
          <p className="mt-1 font-heading text-4xl font-semibold tabular-nums">{percent(result.score, result.total)}%</p>
          <p className="mt-1 font-medium">{encouragement(percent(result.score, result.total))}</p>
          <p className="text-sm text-primary-foreground/80">
            {result.score} of {result.total} correct. Which ones were missed stays hidden, so the next round tests what you know rather than what you remember seeing.
          </p>
          <dl className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
            {progress.mastery !== null && (
              <div className="flex items-center gap-1.5">
                <dt className="text-primary-foreground/80">Mastery</dt>
                <dd className="font-semibold tabular-nums">{progress.mastery}%</dd>
              </div>
            )}
            {progress.reviewDueAt && (
              <div className="flex items-center gap-1.5">
                <CalendarClockIcon className="size-4" />
                <dt className="text-primary-foreground/80">Next review</dt>
                <dd className="font-semibold">{describeDue(new Date(progress.reviewDueAt))}</dd>
              </div>
            )}
            {progress.streak > 0 && (
              <div className="flex items-center gap-1.5">
                <FlameIcon className="size-4" />
                <dd className="font-semibold tabular-nums">{progress.streak}-day streak</dd>
              </div>
            )}
          </dl>
          <Button variant="secondary" size="lg" className="mt-4 bg-white text-primary hover:bg-white/90" onClick={() => document.getElementById("quiz-questions")?.scrollIntoView({ behavior: "smooth" })}>
            <RotateCcwIcon /> {result.when === "Just now" ? "Take it again" : "Take the quiz"}
          </Button>
        </div>
      )}

      {result && questions.length > 0 && (
        <details className="group rounded-2xl border bg-card shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-medium outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50">
            {progress.unlocked.length > 0 ? <LockOpenIcon className="size-4 text-primary" /> : <LockIcon className="size-4 text-muted-foreground" />}
            Explanations unlocked: {progress.unlocked.length} of {questions.length}
            <span className="ml-auto text-xs font-normal text-muted-foreground">Answer a question correctly twice in a row to unlock its explanation</span>
          </summary>
          {progress.unlocked.length > 0 && (
            <ul className="grid gap-3 border-t p-4">
              {progress.unlocked.map((item) => (
                <li key={item.id} className="text-sm">
                  <p className="font-medium">{item.prompt}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckIcon className="size-4" /> {item.answer}
                  </p>
                  {item.explanation && <p className="mt-1 text-muted-foreground">{item.explanation}</p>}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}

      <ol id="quiz-questions" className="grid scroll-mt-20 gap-4">
        {ordered.map((question, index) => (
          <li key={question.id}>
            <fieldset disabled={pending} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
              <legend className="float-left mb-3 w-full font-medium">
                <span className="mr-1.5 inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums">{index + 1}</span>
                {question.prompt}
              </legend>
              <div className="clear-both grid gap-2">
                {question.choices.map((choice) => {
                  const selected = answers[question.id] === choice.originalIndex;
                  return (
                    <label
                      key={choice.originalIndex}
                      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50 ${selected ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() => setAnswers({ ...answers, [question.id]: choice.originalIndex })}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="flex-1">{choice.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-20 flex items-center justify-between gap-4 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {answered} of {questions.length} answered
          </p>
          <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent(answered, questions.length)}%` }} />
          </div>
        </div>
        <Button size="lg" disabled={pending || answered === 0} onClick={submit}>
          {pending && <Loader2Icon className="animate-spin" />}
          Submit answers
        </Button>
      </div>
    </div>
  );
}

function EditQuestions({ noteId, quizId, questions }: { noteId: string; quizId: string; questions: Question[] }) {
  const router = useRouter();
  // The id of the question being edited, "new" while adding one, or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Question | "quiz" | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = deleting === "quiz" ? await deleteQuiz(quizId) : await deleteQuestion(deleting.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (deleting === "quiz") {
        toast.success("Quiz deleted.");
        router.push(`/notes/${noteId}`);
      } else setDeleting(null);
    });
  }

  return (
    <div className="grid gap-4">
      <ol className="grid gap-4">
        {questions.map((question, index) => (
          <li key={question.id}>
            {editing === question.id ? (
              <QuestionForm title={`Edit question ${index + 1}`} initial={question} onSave={(values) => updateQuestion(question.id, values)} onClose={() => setEditing(null)} />
            ) : (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    <span className="text-muted-foreground">{index + 1}.</span> {question.prompt}
                  </p>
                  <div className="-mt-1 -mr-1 flex shrink-0">
                    <Button variant="ghost" size="icon-lg" aria-label={`Edit question ${index + 1}`} onClick={() => setEditing(question.id)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`Delete question ${index + 1}`} onClick={() => setDeleting(question)}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <ul className="mt-2 grid gap-1 text-sm">
                  {question.options.map((option, optionIndex) => (
                    <li key={optionIndex} className={optionIndex === question.correctIndex ? "flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400" : "pl-5.5 text-muted-foreground"}>
                      {optionIndex === question.correctIndex && <CheckIcon className="size-4 shrink-0" />}
                      {option}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ol>

      {editing === "new" ? (
        <QuestionForm title="New question" onSave={(values) => addQuestion(quizId, values)} onClose={() => setEditing(null)} />
      ) : (
        <Button variant="outline" size="lg" className="h-11 border-dashed" onClick={() => setEditing("new")}>
          <PlusIcon /> Add a question
        </Button>
      )}

      <Button variant="destructive" size="lg" className="w-fit justify-self-center" onClick={() => setDeleting("quiz")}>
        <Trash2Icon /> Delete this quiz
      </Button>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !pending && setDeleting(null)}
        title={deleting === "quiz" ? "Delete this quiz?" : "Delete this question?"}
        description={deleting === "quiz" ? "The quiz, its questions and your score history will be permanently deleted." : "The question will be permanently removed from this quiz."}
        confirmLabel={deleting === "quiz" ? "Delete quiz" : "Delete question"}
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function QuestionForm({ title, initial, onSave, onClose }: { title: string; initial?: Question; onSave: (values: Omit<Question, "id">) => Promise<ActionResult>; onClose: () => void }) {
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [options, setOptions] = useState(initial?.options ?? ["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(initial?.correctIndex ?? 0);
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prefix = initial?.id ?? "new";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSave({ prompt, options, correctIndex, explanation });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, optionIndex) => optionIndex !== index));
    setCorrectIndex(correctIndex > index ? correctIndex - 1 : correctIndex === index ? 0 : correctIndex);
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-xl border-2 border-primary/40 bg-card p-4">
      <h2 className="font-heading font-semibold">{title}</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Field label="Question" htmlFor={`${prefix}-prompt`}>
        <Textarea id={`${prefix}-prompt`} value={prompt} onChange={(event) => setPrompt(event.target.value)} required maxLength={500} rows={2} autoFocus />
      </Field>

      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium">Answer choices</legend>
        <p className="text-xs text-muted-foreground">Select the circle next to the correct answer.</p>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="radio"
              name={`${prefix}-correct`}
              checked={correctIndex === index}
              onChange={() => setCorrectIndex(index)}
              aria-label={`Mark choice ${index + 1} as correct`}
              className="size-4 shrink-0 accent-primary"
            />
            <Input
              value={option}
              onChange={(event) => setOptions(options.map((value, optionIndex) => (optionIndex === index ? event.target.value : value)))}
              required
              maxLength={300}
              aria-label={`Choice ${index + 1}`}
              placeholder={`Choice ${index + 1}`}
              className="h-10"
            />
            <Button type="button" variant="ghost" size="icon-lg" disabled={options.length <= 2} aria-label={`Remove choice ${index + 1}`} onClick={() => removeOption(index)}>
              <XIcon />
            </Button>
          </div>
        ))}
        {options.length < 6 && (
          <Button type="button" variant="ghost" size="lg" className="w-fit" onClick={() => setOptions([...options, ""])}>
            <PlusIcon /> Add a choice
          </Button>
        )}
      </fieldset>

      <Field label="Explanation (optional)" htmlFor={`${prefix}-explanation`} hint="Shown after the quiz is submitted.">
        <Textarea id={`${prefix}-explanation`} value={explanation} onChange={(event) => setExplanation(event.target.value)} maxLength={1000} rows={2} />
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save question
        </Button>
      </div>
    </form>
  );
}

function History({ attempts }: { attempts: Attempt[] }) {
  if (attempts.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No attempts yet. Take the quiz to see your scores here.</p>;
  }
  const best = Math.max(...attempts.map((attempt) => percent(attempt.score, attempt.total)));

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted-foreground">
        Best score: <span className="font-medium text-foreground">{best}%</span> · showing your {attempts.length === 1 ? "only attempt" : `last ${attempts.length} attempts`}
      </p>
      <ul className="divide-y rounded-xl border bg-card">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="text-muted-foreground">{attempt.date}</span>
            <span className="font-medium tabular-nums">
              {attempt.score}/{attempt.total} · {percent(attempt.score, attempt.total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
