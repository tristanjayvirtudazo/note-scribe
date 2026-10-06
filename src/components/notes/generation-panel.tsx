"use client";

import { useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { generateNoteContent } from "@/app/actions/notes";
import { ErrorMessage } from "@/components/form-parts";
import { Button } from "@/components/ui/button";

/** Shown while a note has no content: either generation never ran, or it failed. */
export function GenerationPanel({ noteId, failed, error }: { noteId: string; failed: boolean; error: string | null }) {
  const [pending, startTransition] = useTransition();

  function generate() {
    startTransition(async () => {
      const result = await generateNoteContent(noteId);
      if (result.ok) toast.success("Your study notes are ready.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-3 rounded-xl border border-dashed p-5">
      <h2 className="font-heading font-semibold">{failed ? "We could not create study notes from your files" : "Study notes have not been generated yet"}</h2>
      {failed && error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : (
        <p className="text-sm text-muted-foreground">Generate them from your uploaded files, or write your own notes below.</p>
      )}
      <Button size="lg" className="w-fit" disabled={pending} onClick={generate}>
        {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
        {pending ? "Reading your files… this can take a minute" : failed ? "Try again" : "Generate study notes"}
      </Button>
    </div>
  );
}
