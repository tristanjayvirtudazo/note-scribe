"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createNote, discardNoteUploads, generateNoteContent, prepareNoteUploads } from "@/app/actions/notes";
import { uploadToTarget } from "@/lib/supabase/upload";

export type CreateNoteStep = "idle" | "uploading" | "saving" | "generating";

export interface NewNoteDetails {
  title: string;
  description: string;
  subjectId: string | null;
  newSubjectName: string | null;
}

/** Thrown inside the flow to stop it with a message for the user. */
class StepError extends Error {}

/**
 * Runs the "create a note" flow and reports its progress:
 * ask the server where to upload, upload, save the note, generate its content, open it.
 */
export function useCreateNote() {
  const router = useRouter();
  const [step, setStep] = useState<CreateNoteStep>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(details: NewNoteDetails, files: File[]): Promise<void> {
    setError(null);
    try {
      setStep("uploading");
      const prepared = await prepareNoteUploads(files.map((file) => ({ name: file.name, mimeType: file.type, size: file.size })));
      if (!prepared.ok) throw new StepError(prepared.error);
      const { uploadId, targets } = prepared.data;

      // One at a time: parallel uploads of large files stall on slow mobile connections.
      for (const [index, file] of files.entries()) {
        if (!(await uploadToTarget(targets[index], file))) {
          await discardNoteUploads(uploadId);
          throw new StepError(`We could not upload "${file.name}". Check your connection and try again.`);
        }
      }

      setStep("saving");
      const created = await createNote({
        ...details,
        uploadId,
        files: files.map((file, index) => ({ name: file.name, mimeType: file.type, size: file.size, path: targets[index].path })),
      });
      if (!created.ok) throw new StepError(created.error);

      setStep("generating");
      const generated = await generateNoteContent(created.data.id);
      if (generated.ok) toast.success("Your study notes are ready.");
      // On failure the note page explains what went wrong and offers a retry.
      router.push(`/notes/${created.data.id}`);
    } catch (caught) {
      if (!(caught instanceof StepError)) console.error(caught);
      setError(caught instanceof StepError ? caught.message : "Something went wrong. Please try again.");
      setStep("idle");
    }
  }

  return { step, busy: step !== "idle", error, setError, submit };
}
