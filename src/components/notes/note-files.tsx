"use client";

import { useTransition } from "react";
import { FileTextIcon, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getFileUrl } from "@/app/actions/notes";
import { formatFileSize } from "@/lib/constants";

type NoteFile = { id: string; name: string; mimeType: string; size: number };

export function NoteFiles({ files }: { files: NoteFile[] }) {
  const [pending, startTransition] = useTransition();
  if (files.length === 0) return null;

  function open(file: NoteFile) {
    // Opened before the request so mobile browsers treat it as a user-initiated tab.
    const tab = window.open("", "_blank");
    startTransition(async () => {
      const result = await getFileUrl(file.id);
      if (result.ok && tab) tab.location.href = result.data.url;
      else {
        tab?.close();
        toast.error(result.ok ? "Please allow pop-ups to view this file." : result.error);
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="font-heading font-semibold">Source files</h2>
      <ul className="mt-3 grid gap-1">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => open(file)}
              className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {file.mimeType === "application/pdf" ? <FileTextIcon className="size-4 shrink-0 text-muted-foreground" /> : <ImageIcon className="size-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{file.name}</span>
                <span className="block text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
