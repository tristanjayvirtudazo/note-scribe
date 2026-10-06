import type { Metadata } from "next";
import { FolderIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SubjectsManager } from "@/components/subjects/subjects-manager";
import { requireUser } from "@/server/auth/session";
import { subjectService } from "@/server/services/subject.service";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireUser();
  const subjects = await subjectService.listWithNoteCounts(user.id);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader icon={FolderIcon} title="Subjects" description="Group your notes by subject or topic to find them faster." />
      <SubjectsManager subjects={subjects} />
    </div>
  );
}
