"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, PencilIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteNote, generateNoteContent, updateNote } from "@/app/actions/notes";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorMessage, Field, nativeSelectClass } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { subjectColorClass } from "@/lib/constants";

type Props = {
  note: { id: string; title: string; description: string | null; subjectId: string | null };
  subject: { name: string; color: string } | null;
  subjects: { id: string; name: string }[];
  canRegenerate: boolean;
};

export function NoteHeader({ note, subject, subjects, canRegenerate }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"edit" | "delete" | "regenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateNote(note.id, {
        title: formData.get("title"),
        description: formData.get("description"),
        subjectId: formData.get("subjectId") || null,
      });
      if (!result.ok) return setError(result.error);
      setDialog(null);
      toast.success("Note details saved.");
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteNote(note.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Note deleted.");
      router.push("/notes");
    });
  }

  function regenerate() {
    startTransition(async () => {
      const result = await generateNoteContent(note.id);
      setDialog(null);
      if (result.ok) toast.success("Your study notes were regenerated.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {subject && (
            <p className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <span className={`size-2 rounded-full ${subjectColorClass(subject.color)}`} />
              {subject.name}
            </p>
          )}
          <h1 className="font-heading text-2xl font-semibold break-words">{note.title}</h1>
          {note.description && <p className="mt-1 text-sm text-muted-foreground">{note.description}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="lg" onClick={() => setDialog("edit")}>
            <PencilIcon /> Edit details
          </Button>
          {canRegenerate && (
            <Button variant="outline" size="lg" onClick={() => setDialog("regenerate")}>
              <SparklesIcon /> Regenerate
            </Button>
          )}
          <Button variant="destructive" size="lg" onClick={() => setDialog("delete")}>
            <Trash2Icon /> Delete
          </Button>
        </div>
      </div>

      <Dialog open={dialog === "edit"} onOpenChange={(open) => !pending && setDialog(open ? "edit" : null)}>
        <DialogContent className="sm:max-w-md">
          {/* Keyed so saved details remount the fields; Base UI inputs reject a changing defaultValue. */}
          <form key={`${note.title}|${note.description}|${note.subjectId}`} action={save} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Edit note details</DialogTitle>
              <DialogDescription>Change the title, description or subject of this note.</DialogDescription>
            </DialogHeader>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <Field label="Title" htmlFor="edit-title">
              <Input id="edit-title" name="title" defaultValue={note.title} required maxLength={120} className="h-10" />
            </Field>
            <Field label="Description (optional)" htmlFor="edit-description">
              <Textarea id="edit-description" name="description" defaultValue={note.description ?? ""} maxLength={500} rows={3} />
            </Field>
            <Field label="Subject" htmlFor="edit-subject">
              <select id="edit-subject" name="subjectId" defaultValue={note.subjectId ?? ""} className={`${nativeSelectClass} h-10`}>
                <option value="">No subject</option>
                {subjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" size="lg" disabled={pending} onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={pending}>
                {pending && <Loader2Icon className="animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !pending && setDialog(open ? "delete" : null)}
        title="Delete this note?"
        description="The note, its uploaded files and its quizzes will be permanently deleted. This cannot be undone."
        confirmLabel="Delete note"
        pending={pending}
        onConfirm={remove}
      />
      <ConfirmDialog
        open={dialog === "regenerate"}
        onOpenChange={(open) => !pending && setDialog(open ? "regenerate" : null)}
        title="Regenerate the study notes?"
        description="The whole note, including your own edits and additions, will be replaced with a fresh version written from the uploaded files. This can take a minute."
        confirmLabel={pending ? "Regenerating…" : "Regenerate"}
        destructive={false}
        pending={pending}
        onConfirm={regenerate}
      />
    </div>
  );
}
