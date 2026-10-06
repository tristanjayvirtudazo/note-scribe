"use client";

import { useRef, useState } from "react";
import { FileTextIcon, ImageIcon, Loader2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { ErrorMessage, Field, nativeSelectClass } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCreateNote, type CreateNoteStep } from "@/hooks/use-create-note";
import { ACCEPTED_FILE_LABEL, ACCEPTED_FILE_TYPES, MAX_FILES, MAX_FILE_SIZE, formatFileSize } from "@/lib/constants";
import { addToSelection } from "@/lib/note-files";

const NEW_SUBJECT = "__new__";
const stepLabels: Record<Exclude<CreateNoteStep, "idle">, string> = {
  uploading: "Uploading your files…",
  saving: "Saving your note…",
  generating: "Reading your files and writing study notes. This can take up to a minute…",
};

export function NewNoteForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState("");
  const [dragging, setDragging] = useState(false);
  const { step, busy, error, setError, submit } = useCreateNote();

  function addFiles(incoming: FileList) {
    const selection = addToSelection(files, incoming);
    setFiles(selection.files);
    setError(selection.problems.length > 0 ? selection.problems.join(" ") : null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Add at least one file to create a note from.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "");
    void submit(
      {
        title: text("title"),
        description: text("description"),
        subjectId: subject && subject !== NEW_SUBJECT ? subject : null,
        newSubjectName: subject === NEW_SUBJECT ? text("newSubjectName") : null,
      },
      files,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} disabled={busy} placeholder="e.g. Cell structure and function" className="h-10" />
      </Field>

      <Field label="Description (optional)" htmlFor="description" hint="Tell the AI what to focus on, or leave a reminder for yourself.">
        <Textarea id="description" name="description" maxLength={500} rows={3} disabled={busy} />
      </Field>

      <Field label="Subject (optional)" htmlFor="subject">
        <select id="subject" value={subject} onChange={(event) => setSubject(event.target.value)} disabled={busy} className={`${nativeSelectClass} h-10`}>
          <option value="">No subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          <option value={NEW_SUBJECT}>+ Create a new subject…</option>
        </select>
        {subject === NEW_SUBJECT && (
          <Input name="newSubjectName" required maxLength={50} disabled={busy} aria-label="New subject name" placeholder="New subject name, e.g. Biology" className="h-10" />
        )}
      </Field>

      <div className="grid gap-1.5">
        <span id="files-label" className="text-sm font-medium">
          Files
        </span>
        <button
          type="button"
          aria-describedby="files-label"
          disabled={busy || files.length >= MAX_FILES}
          onClick={() => fileInput.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!busy) addFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors outline-none hover:border-primary/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 ${dragging ? "border-primary bg-primary/5" : ""}`}
        >
          <UploadCloudIcon className="size-7 text-primary" />
          <span className="text-sm font-medium">Tap to choose files, or drop them here</span>
          <span className="text-xs text-muted-foreground">
            {ACCEPTED_FILE_LABEL} · up to {MAX_FILES} files · {formatFileSize(MAX_FILE_SIZE)} each
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={Object.keys(ACCEPTED_FILE_TYPES).join(",")}
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {files.length > 0 && (
          <ul className="grid gap-2">
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                {file.type === "application/pdf" ? <FileTextIcon className="size-5 shrink-0 text-muted-foreground" /> : <ImageIcon className="size-5 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{file.name}</span>
                  <span className="block text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                </span>
                <Button type="button" variant="ghost" size="icon-lg" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((item) => item !== file))}>
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {step !== "idle" ? (
        <div role="status" className="flex items-center gap-3 rounded-lg bg-primary/10 p-4 text-sm font-medium">
          <Loader2Icon className="size-5 shrink-0 animate-spin text-primary" />
          {stepLabels[step]}
        </div>
      ) : (
        <Button type="submit" size="lg" className="h-11 text-base">
          Create study notes
        </Button>
      )}
    </form>
  );
}
