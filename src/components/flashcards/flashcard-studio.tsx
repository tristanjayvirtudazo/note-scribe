"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, FlameIcon, Loader2Icon, PartyPopperIcon, PencilIcon, PlusIcon, RotateCcwIcon, SparklesIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addFlashcard, deleteFlashcard, generateFlashcards, reviewFlashcard, updateFlashcard } from "@/app/actions/flashcards";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CountPicker } from "@/components/count-picker";
import { ErrorMessage, Field } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FLASHCARD_SIZES, MAX_FLASHCARD_COUNT } from "@/lib/constants";
import { REVIEW_INTERVAL_DAYS } from "@/lib/review";
import type { ActionResult } from "@/lib/validation";

type SessionCard = { id: string; front: string; back: string; box: number };
type Card = SessionCard & { due: string | null; reviewedCount: number };
type Tab = "study" | "manage";

const tabs: { id: Tab; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "manage", label: "Manage cards" },
];

export function FlashcardStudio({
  noteId,
  hasContent,
  session,
  cards,
  nextDue,
  streak,
}: {
  noteId: string;
  hasContent: boolean;
  session: SessionCard[];
  cards: Card[];
  nextDue: string | null;
  streak: number;
}) {
  const [tab, setTab] = useState<Tab>("study");
  // The session is a snapshot taken when it starts. Each rating refreshes the page data in the
  // background (the rated card is no longer due), and the running session must not restart.
  const [round, setRound] = useState(0);
  const [sessionCards, setSessionCards] = useState(session);

  function startNewSession() {
    setSessionCards(session);
    setRound((value) => value + 1);
  }

  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="Flashcard views" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
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
      {tab === "study" && (
        <StudySession key={round} noteId={noteId} session={sessionCards} allCards={cards} nextDue={nextDue} streak={streak} dueNow={session.length} onStartNewSession={startNewSession} />
      )}
      {tab === "manage" && <ManageCards noteId={noteId} cards={cards} hasContent={hasContent} />}
    </div>
  );
}

type Rating = "got-it" | "not-yet";

/**
 * One card at a time: read the front, recall, flip, rate yourself. Cards rated "Not yet" come
 * back at the end of the session for another go (practice only; the schedule records the
 * first rating). Keyboard: Space flips, 1 = Not yet, 2 = Got it.
 */
function StudySession({
  noteId,
  session,
  allCards,
  nextDue,
  streak: initialStreak,
  dueNow,
  onStartNewSession,
}: {
  noteId: string;
  session: SessionCard[];
  allCards: Card[];
  nextDue: string | null;
  streak: number;
  /** Cards due according to the latest page data, for offering another session at the end. */
  dueNow: number;
  onStartNewSession: () => void;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(session.map((card) => ({ ...card, retry: false })));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ gotIt: 0, notYet: 0 });
  const [streak, setStreak] = useState(initialStreak);
  const [practising, setPractising] = useState(false);

  const current = queue[index];
  const finished = queue.length > 0 && index >= queue.length;
  const firstPassTotal = session.length;

  function rate(rating: Rating) {
    if (!current || !flipped) return;
    const card = current;
    setFlipped(false);
    if (!card.retry) {
      setTally((count) => (rating === "got-it" ? { ...count, gotIt: count.gotIt + 1 } : { ...count, notYet: count.notYet + 1 }));
      if (!practising) {
        void reviewFlashcard(card.id, rating).then((result) => {
          if (!result.ok) toast.error(result.error);
          else setStreak(result.data.streak);
        });
      }
    }
    // "Not yet" cards return at the end of the session until they are known.
    if (rating === "not-yet") setQueue((items) => [...items, { ...card, retry: true }]);
    setIndex((value) => value + 1);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (event.key === " ") {
        event.preventDefault();
        setFlipped((value) => !value);
      } else if (event.key === "1") rate("not-yet");
      else if (event.key === "2") rate("got-it");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function startPractice() {
    const shuffled = [...allCards].sort(() => Math.random() - 0.5).map((card) => ({ ...card, retry: false }));
    setPractising(true);
    setQueue(shuffled);
    setIndex(0);
    setFlipped(false);
    setTally({ gotIt: 0, notYet: 0 });
  }

  if (allCards.length === 0) {
    return <p className="rounded-2xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">No flashcards yet. Generate some under “Manage cards”.</p>;
  }

  if (queue.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
          <CheckIcon className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-xl font-semibold">All caught up</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {nextDue ? `Nothing is due right now. Your next cards come back ${nextDue}.` : "Nothing is due right now."} Waiting until a card is almost forgotten is what makes the next review count.
        </p>
        {dueNow > 0 ? (
          <Button size="lg" className="mt-5" onClick={onStartNewSession}>
            Study {dueNow} due {dueNow === 1 ? "card" : "cards"}
          </Button>
        ) : (
          <Button variant="outline" size="lg" className="mt-5" onClick={startPractice}>
            <RotateCcwIcon /> Practise all cards anyway
          </Button>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Practice rounds do not change the schedule.</p>
      </div>
    );
  }

  if (finished) {
    const percent = firstPassTotal === 0 ? 0 : Math.round((tally.gotIt / firstPassTotal) * 100);
    return (
      <div className="flex flex-col items-center rounded-2xl bg-primary p-8 text-center text-primary-foreground shadow-lg shadow-primary/25">
        <span className="flex size-14 items-center justify-center rounded-full bg-white/20">
          <PartyPopperIcon className="size-7" />
        </span>
        <h2 className="mt-4 font-heading text-2xl font-semibold">{practising ? "Practice round done" : "Session complete"}</h2>
        <p className="mt-1 text-primary-foreground/90">
          {tally.gotIt} of {firstPassTotal} known on the first try ({percent}%).{tally.notYet > 0 ? ` ${tally.notYet} came back for another go.` : ""}
        </p>
        <dl className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm">
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <FlameIcon className="size-4" />
              <dd className="font-semibold">{streak}-day streak</dd>
            </div>
          )}
          {!practising && (
            <div className="flex items-center gap-1.5">
              <dt className="text-primary-foreground/80">Known cards return in</dt>
              <dd className="font-semibold">{REVIEW_INTERVAL_DAYS[1]}–{REVIEW_INTERVAL_DAYS[REVIEW_INTERVAL_DAYS.length - 1]} days; missed ones tomorrow</dd>
            </div>
          )}
        </dl>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {!practising && dueNow > 0 && (
            <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90" onClick={onStartNewSession}>
              Study {dueNow} more due {dueNow === 1 ? "card" : "cards"}
            </Button>
          )}
          <Button variant="secondary" size="lg" className="bg-white text-primary hover:bg-white/90" onClick={() => router.push(`/notes/${noteId}`)}>
            Back to note
          </Button>
          <Button variant="ghost" size="lg" className="text-primary-foreground hover:bg-white/15 hover:text-primary-foreground" onClick={startPractice}>
            <RotateCcwIcon /> Practise again
          </Button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((index / queue.length) * 100);
  return (
    <div className="grid gap-4">
      <div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Card {index + 1} of {queue.length}
            {current.retry && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">Second look</span>}
            {practising && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">Practice</span>}
          </span>
          <span className="tabular-nums">{progressPercent}%</span>
        </div>
        <div aria-hidden="true" className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-label={flipped ? "Showing the answer. Press to see the front again." : "Press to reveal the answer"}
        className="group min-h-72 outline-none [perspective:1200px] focus-visible:[&>div]:ring-3 focus-visible:[&>div]:ring-ring/50"
      >
        <div className={`relative h-full min-h-72 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border bg-card p-6 text-center shadow-md [backface-visibility:hidden]">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Question</span>
            <p className="mt-3 font-heading text-xl font-semibold text-balance sm:text-2xl">{current.front}</p>
            <span className="mt-6 text-xs text-muted-foreground">Think of the answer, then tap to check</span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="text-xs font-medium tracking-wide text-primary uppercase">Answer</span>
            <p className="mt-3 text-base text-pretty sm:text-lg">{current.back}</p>
            <p className="mt-4 text-sm text-muted-foreground">{current.front}</p>
          </div>
        </div>
      </button>

      {flipped ? (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="lg" className="h-12 border-amber-500/50 text-base hover:bg-amber-500/10" onClick={() => rate("not-yet")}>
            <XIcon /> Not yet
          </Button>
          <Button size="lg" className="h-12 bg-emerald-600 text-base text-white hover:bg-emerald-600/90" onClick={() => rate("got-it")}>
            <CheckIcon /> Got it
          </Button>
        </div>
      ) : (
        <Button size="lg" className="h-12 text-base" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">Keyboard: Space to flip · 1 Not yet · 2 Got it</p>
    </div>
  );
}

function boxLabel(card: Card): string {
  if (card.box === 0) return "New";
  return `Box ${card.box} of ${REVIEW_INTERVAL_DAYS.length - 1}${card.due ? ` · due ${card.due}` : ""}`;
}

function ManageCards({ noteId, cards, hasContent }: { noteId: string; cards: Card[]; hasContent: boolean }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Card | null>(null);
  const [count, setCount] = useState<number>(FLASHCARD_SIZES[0]);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateFlashcards(noteId, count);
      if (result.ok) toast.success(`${result.data.added} flashcards added.`);
      else toast.error(result.error);
    });
  }

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteFlashcard(deleting.id);
      if (result.ok) setDeleting(null);
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      {hasContent && (
        <div className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex sm:items-end sm:justify-between">
          <CountPicker label={cards.length === 0 ? "How many cards to create?" : "Add more cards: how many?"} value={count} onChange={setCount} presets={FLASHCARD_SIZES} max={MAX_FLASHCARD_COUNT} disabled={pending} />
          <Button size="lg" disabled={pending} onClick={generate}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {pending ? "Writing cards…" : "Generate flashcards"}
          </Button>
        </div>
      )}

      <ol className="grid gap-3">
        {cards.map((card, index) => (
          <li key={card.id}>
            {editing === card.id ? (
              <CardForm title={`Edit card ${index + 1}`} initial={card} onSave={(values) => updateFlashcard(card.id, values)} onClose={() => setEditing(null)} />
            ) : (
              <div className="rounded-2xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{card.front}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{card.back}</p>
                  </div>
                  <div className="-mt-1 -mr-1 flex shrink-0">
                    <Button variant="ghost" size="icon-lg" aria-label={`Edit card ${index + 1}`} onClick={() => setEditing(card.id)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-lg" aria-label={`Delete card ${index + 1}`} onClick={() => setDeleting(card)}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {boxLabel(card)} · reviewed {card.reviewedCount} {card.reviewedCount === 1 ? "time" : "times"}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>

      {editing === "new" ? (
        <CardForm title="New card" onSave={(values) => addFlashcard(noteId, values)} onClose={() => setEditing(null)} />
      ) : (
        <Button variant="outline" size="lg" className="h-11 border-dashed" onClick={() => setEditing("new")}>
          <PlusIcon /> Add a card
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !pending && setDeleting(null)}
        title="Delete this card?"
        description={`"${deleting?.front ?? ""}" will be permanently removed.`}
        confirmLabel="Delete card"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function CardForm({ title, initial, onSave, onClose }: { title: string; initial?: Card; onSave: (values: { front: string; back: string }) => Promise<ActionResult>; onClose: () => void }) {
  const [front, setFront] = useState(initial?.front ?? "");
  const [back, setBack] = useState(initial?.back ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prefix = initial?.id ?? "new";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSave({ front, back });
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border-2 border-primary/40 bg-card p-4">
      <h2 className="font-heading font-semibold">{title}</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Field label="Front (question or term)" htmlFor={`${prefix}-front`}>
        <Textarea id={`${prefix}-front`} value={front} onChange={(event) => setFront(event.target.value)} required maxLength={300} rows={2} autoFocus />
      </Field>
      <Field label="Back (answer)" htmlFor={`${prefix}-back`}>
        <Textarea id={`${prefix}-back`} value={back} onChange={(event) => setBack(event.target.value)} required maxLength={1000} rows={3} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save card
        </Button>
      </div>
    </form>
  );
}
