"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LayersIcon, Loader2Icon, PlayIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { generateFlashcards } from "@/app/actions/flashcards";
import { CountPicker } from "@/components/count-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { FLASHCARD_SIZES, MAX_FLASHCARD_COUNT } from "@/lib/constants";

export function FlashcardPanel({ noteId, total, due, hasContent }: { noteId: string; total: number; due: number; hasContent: boolean }) {
  const [count, setCount] = useState<number>(FLASHCARD_SIZES[0]);
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateFlashcards(noteId, count);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${result.data.added} flashcards added.`);
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-heading font-semibold">
        <LayersIcon className="size-4 text-primary" /> Flashcards
      </h2>

      {total > 0 ? (
        <div className="mt-3 grid gap-3">
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "card" : "cards"} · {due === 0 ? "nothing due right now" : `${due} due now`}
          </p>
          <Link href={`/notes/${noteId}/flashcards`} className={buttonVariants({ size: "lg", variant: due > 0 ? "default" : "outline" })}>
            <PlayIcon /> {due > 0 ? "Study now" : "Open flashcards"}
          </Link>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Short prompts to test your recall, spaced out over the coming days.</p>
      )}

      {hasContent ? (
        <div className="mt-3 grid gap-3 border-t pt-3">
          <CountPicker label={total === 0 ? "How many cards to create?" : "Add more cards: how many?"} value={count} onChange={setCount} presets={FLASHCARD_SIZES} max={MAX_FLASHCARD_COUNT} disabled={pending} />
          <Button size="lg" variant={total === 0 ? "default" : "outline"} disabled={pending} onClick={generate}>
            {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
            {pending ? "Writing cards…" : "Generate flashcards"}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Add content to this note to generate flashcards from it.</p>
      )}
    </section>
  );
}
