"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FolderIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { createSubject, deleteSubject, updateSubject } from "@/app/actions/subjects";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorMessage, Field } from "@/components/form-parts";
import { EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SUBJECT_COLORS, subjectColorClass, type SubjectColor } from "@/lib/constants";

type Subject = { id: string; name: string; color: string; noteCount: number };

export function SubjectsManager({ subjects }: { subjects: Subject[] }) {
  // The subject being edited, "new" while adding one, or null.
  const [editing, setEditing] = useState<Subject | "new" | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [pending, startTransition] = useTransition();

  function remove() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteSubject(deleting.id);
      if (result.ok) setDeleting(null);
      else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      {subjects.length === 0 ? (
        <EmptyState icon={FolderIcon} title="You have no subjects yet">
          <p className="max-w-sm text-sm text-muted-foreground">Create one, for example “Biology” or “World History”, then file your notes under it.</p>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {subjects.map((subject) => (
            <li key={subject.id} className="card-lift flex items-center gap-3 rounded-2xl border bg-card p-3">
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${subjectColorClass(subject.color)}`}>
                <FolderIcon className="size-5" />
              </span>
              <Link href={`/notes?subject=${subject.id}`} className="min-w-0 flex-1 rounded-md outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                <span className="block truncate font-medium">{subject.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {subject.noteCount} {subject.noteCount === 1 ? "note" : "notes"}
                </span>
              </Link>
              <Button variant="ghost" size="icon-lg" aria-label={`Edit ${subject.name}`} onClick={() => setEditing(subject)}>
                <PencilIcon />
              </Button>
              <Button variant="ghost" size="icon-lg" aria-label={`Delete ${subject.name}`} onClick={() => setDeleting(subject)}>
                <Trash2Icon className="text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Button size="lg" className="w-fit shadow-md shadow-primary/25" onClick={() => setEditing("new")}>
        <PlusIcon /> New subject
      </Button>

      {editing && <SubjectDialog key={editing === "new" ? "new" : editing.id} subject={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !pending && setDeleting(null)}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="Notes in this subject are kept and will show as “No subject”."
        confirmLabel="Delete subject"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}

function SubjectDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const [color, setColor] = useState<string>(subject?.color ?? "indigo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const values = { name: formData.get("name"), color };
      const result = subject ? await updateSubject(subject.id, values) : await createSubject(values);
      if (result.ok) onClose();
      else setError(result.error);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent>
        <form action={save} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{subject ? "Edit subject" : "New subject"}</DialogTitle>
            <DialogDescription>Give the subject a name and pick a colour to recognise it by.</DialogDescription>
          </DialogHeader>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          <Field label="Name" htmlFor="subject-name">
            <Input id="subject-name" name="name" defaultValue={subject?.name} required maxLength={50} autoFocus className="h-10" />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(SUBJECT_COLORS) as SubjectColor[]).map((option) => (
                <label key={option} className="cursor-pointer">
                  <input type="radio" name="color-choice" checked={color === option} onChange={() => setColor(option)} className="peer sr-only" />
                  <span className={`block size-8 rounded-full ring-offset-2 ring-offset-popover peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${SUBJECT_COLORS[option]}`}>
                    <span className="sr-only">{option}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onClose}>
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
  );
}
