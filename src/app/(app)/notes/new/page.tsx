import type { Metadata } from "next";
import { SparklesIcon } from "lucide-react";
import { NewNoteForm } from "@/components/notes/new-note-form";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/server/auth/session";
import { subjectService } from "@/server/services/subject.service";

export const metadata: Metadata = { title: "New note" };
// Reading files with AI can take a while; applies to the Server Actions called from this page.
export const maxDuration = 300;

export default async function NewNotePage() {
  const user = await requireUser();
  const subjects = await subjectService.list(user.id);

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageHeader icon={SparklesIcon} title="New note" description="Upload your material and we will turn it into study notes." />
      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <NewNoteForm subjects={subjects.map(({ id, name }) => ({ id, name }))} />
      </div>
    </div>
  );
}
