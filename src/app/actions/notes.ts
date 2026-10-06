"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createNoteSchema, noteDetailsSchema, sectionSchema, uploadRequestSchema, type ActionResult } from "@/lib/validation";
import { parseInput, toActionResult } from "@/server/action-result";
import { requireUser, requireVerifiedUser } from "@/server/auth/session";
import { noteService } from "@/server/services/note.service";
import type { UploadTarget } from "@/server/storage/note-files.storage";

// Server Actions are the entry points the browser can call. Each one authenticates,
// validates its input, delegates to a service, and refreshes the pages it affected.

const idSchema = z.uuid("That item could not be found.");
const directionSchema = z.enum(["up", "down"]);

function revalidateNote(noteId: string): void {
  revalidatePath(`/notes/${noteId}`);
}

export async function prepareNoteUploads(files: unknown): Promise<ActionResult<{ uploadId: string; targets: UploadTarget[] }>> {
  return toActionResult(async () => {
    const user = await requireVerifiedUser();
    return noteService.prepareUploads(user.id, parseInput(uploadRequestSchema, files));
  });
}

export async function discardNoteUploads(uploadId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(() => noteService.discardUploads(user.id, parseInput(idSchema, uploadId)));
}

export async function createNote(input: unknown): Promise<ActionResult<{ id: string }>> {
  return toActionResult(async () => {
    const user = await requireVerifiedUser();
    const note = await noteService.create(user.id, parseInput(createNoteSchema, input));
    revalidatePath("/notes");
    return note;
  });
}

export async function generateNoteContent(noteId: unknown): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const user = await requireVerifiedUser();
    const id = parseInput(idSchema, noteId);
    try {
      await noteService.generateContent(user.id, id);
    } finally {
      // A failure changes what the page shows too (the error and a retry button).
      revalidateNote(id);
    }
  });
}

export async function updateNote(noteId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const id = parseInput(idSchema, noteId);
    await noteService.updateDetails(user.id, id, parseInput(noteDetailsSchema, input));
    revalidateNote(id);
  });
}

export async function deleteNote(noteId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    await noteService.delete(user.id, parseInput(idSchema, noteId));
    revalidatePath("/notes");
  });
}

export async function getFileUrl(fileId: unknown): Promise<ActionResult<{ url: string }>> {
  const user = await requireUser();
  return toActionResult(() => noteService.getFileUrl(user.id, parseInput(idSchema, fileId)));
}

export async function addSection(noteId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const id = parseInput(idSchema, noteId);
    await noteService.addSection(user.id, id, parseInput(sectionSchema, input));
    revalidateNote(id);
  });
}

export async function updateSection(sectionId: unknown, input: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await noteService.updateSection(user.id, parseInput(idSchema, sectionId), parseInput(sectionSchema, input));
    revalidateNote(noteId);
  });
}

export async function deleteSection(sectionId: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await noteService.deleteSection(user.id, parseInput(idSchema, sectionId));
    revalidateNote(noteId);
  });
}

export async function moveSection(sectionId: unknown, direction: unknown): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { noteId } = await noteService.moveSection(user.id, parseInput(idSchema, sectionId), parseInput(directionSchema, direction));
    revalidateNote(noteId);
  });
}
