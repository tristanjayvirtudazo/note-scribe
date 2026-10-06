"use server";

import { revalidatePath } from "next/cache";
import { subjectSchema, type ActionResult } from "@/lib/validation";
import { parseInput, toActionResult } from "@/server/action-result";
import { requireUser } from "@/server/auth/session";
import { subjectService } from "@/server/services/subject.service";

// Server Actions are the entry points the browser can call. Each one authenticates,
// validates its input, delegates to a service, and refreshes the pages it affected.

export async function createSubject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const subject = await subjectService.create(user.id, parseInput(subjectSchema, input));
    revalidatePath("/subjects");
    return subject;
  });
}

export async function updateSubject(id: string, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    await subjectService.update(user.id, id, parseInput(subjectSchema, input));
    revalidatePath("/subjects");
  });
}

export async function deleteSubject(id: string): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    await subjectService.delete(user.id, id);
    revalidatePath("/subjects");
  });
}
