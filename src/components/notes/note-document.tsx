"use client";

import { useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { addSection, deleteSection, moveSection, updateSection } from "@/app/actions/notes";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorMessage, Field } from "@/components/form-parts";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/validation";

type Section = { id: string; heading: string; content: string };

export function sectionAnchor(id: string) {
  return `section-${id}`;
}

/** Jump links to each part of the note. */
export function NoteContents({ sections, className }: { sections: Pick<Section, "id" | "heading">[]; className?: string }) {
  if (sections.length < 2) return null;
  return (
    <nav aria-label="Contents" className={className}>
      <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Contents</h2>
      <ol className="mt-2 grid gap-0.5">
        {sections.map((section, index) => (
          <li key={section.id}>
            <a
              href={`#${sectionAnchor(section.id)}`}
              className="-mx-2 flex gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground outline-none hover:bg-primary/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="w-4 shrink-0 text-right font-medium text-primary tabular-nums">{index + 1}</span>
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The note as one continuous document. It is stored as sections, but those only show as
 * separately editable blocks once the reader switches to edit mode.
 */
export function NoteDocument({ noteId, sections }: { noteId: string; sections: Section[] }) {
  const [editMode, setEditMode] = useState(false);
  // The id of the section being edited, "new" while adding one, or null.
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);
  const [pending, startTransition] = useTransition();
  const isEmpty = sections.length === 0;
  // An empty note has nothing to read, so it only offers writing.
  const showControls = editMode || isEmpty;

  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else toast.error(result.error);
    });
  }

  function leaveEditMode() {
    setEditing(null);
    setEditMode(false);
  }

  return (
    <article className="rounded-2xl border bg-card shadow-sm">
      {!isEmpty && (
        <div className="sticky top-14 z-10 flex items-center justify-between gap-3 rounded-t-2xl border-b bg-card/95 px-4 py-2 backdrop-blur sm:px-8">
          <p className="text-sm text-muted-foreground">{editMode ? "Editing: change, reorder, add or remove parts." : "Study notes"}</p>
          {editMode ? (
            <Button size="lg" onClick={leaveEditMode}>
              <CheckIcon /> Done
            </Button>
          ) : (
            <Button variant="outline" size="lg" onClick={() => setEditMode(true)}>
              <PencilIcon /> Edit
            </Button>
          )}
        </div>
      )}

      <div className="px-4 py-6 sm:px-8 sm:py-8">
        {!editMode && <NoteContents sections={sections} className="mb-8 rounded-lg bg-muted/50 p-4 lg:hidden" />}

        <div className={showControls ? "grid gap-4" : "grid gap-10"}>
          {sections.map((section, index) =>
            editing === section.id ? (
              <SectionForm
                key={section.id}
                title="Edit this part"
                initial={section}
                onCancel={() => setEditing(null)}
                onSave={(values) => updateSection(section.id, values)}
                onSaved={() => setEditing(null)}
              />
            ) : (
              <section
                key={section.id}
                id={sectionAnchor(section.id)}
                className={showControls ? "scroll-mt-32 rounded-lg border border-dashed p-4" : "scroll-mt-32"}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <h2 className="min-w-0 border-l-4 border-primary pl-3 font-heading text-xl font-semibold tracking-tight break-words">{section.heading}</h2>
                  {showControls && (
                    <div className="-mr-1 flex">
                      <Button variant="ghost" size="icon-lg" disabled={pending || index === 0} aria-label={`Move "${section.heading}" up`} onClick={() => run(() => moveSection(section.id, "up"))}>
                        <ArrowUpIcon />
                      </Button>
                      <Button variant="ghost" size="icon-lg" disabled={pending || index === sections.length - 1} aria-label={`Move "${section.heading}" down`} onClick={() => run(() => moveSection(section.id, "down"))}>
                        <ArrowDownIcon />
                      </Button>
                      <Button variant="ghost" size="icon-lg" disabled={pending} aria-label={`Edit "${section.heading}"`} onClick={() => setEditing(section.id)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-lg" disabled={pending} aria-label={`Delete "${section.heading}"`} onClick={() => setDeleting(section)}>
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
                <Markdown>{section.content}</Markdown>
              </section>
            ),
          )}

          {showControls &&
            (editing === "new" ? (
              <SectionForm title="New part" onCancel={() => setEditing(null)} onSave={(values) => addSection(noteId, values)} onSaved={() => setEditing(null)} />
            ) : (
              <Button variant="outline" size="lg" className="h-11 border-dashed" onClick={() => setEditing("new")}>
                <PlusIcon /> {isEmpty ? "Write your own notes" : "Add a new part"}
              </Button>
            ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && !pending && setDeleting(null)}
        title="Delete this part?"
        description={`"${deleting?.heading ?? ""}" will be permanently removed from this note.`}
        confirmLabel="Delete"
        pending={pending}
        onConfirm={() => deleting && run(() => deleteSection(deleting.id), () => setDeleting(null))}
      />
    </article>
  );
}

function SectionForm({
  title,
  initial,
  onSave,
  onSaved,
  onCancel,
}: {
  title: string;
  initial?: Section;
  onSave: (values: { heading: FormDataEntryValue | null; content: FormDataEntryValue | null }) => Promise<ActionResult>;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const prefix = initial?.id ?? "new";

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await onSave({ heading: formData.get("heading"), content: formData.get("content") });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  }

  return (
    <form action={submit} className="grid gap-4 rounded-lg border-2 border-primary/40 p-4">
      <h2 className="font-heading font-semibold">{title}</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      <Field label="Heading" htmlFor={`${prefix}-heading`}>
        <Input id={`${prefix}-heading`} name="heading" defaultValue={initial?.heading} required maxLength={120} autoFocus className="h-10" />
      </Field>
      <Field label="Content" htmlFor={`${prefix}-content`} hint="Tip: start a line with - for a bullet point, and wrap words in **two asterisks** to make them bold.">
        <Textarea id={`${prefix}-content`} name="content" defaultValue={initial?.content} required maxLength={20000} rows={10} className="font-mono text-sm" />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="lg" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
