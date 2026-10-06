import { ACCEPTED_FILE_LABEL, ACCEPTED_FILE_TYPES, MAX_FILES, MAX_FILE_SIZE, formatFileSize } from "@/lib/constants";

/**
 * Adds newly picked files to a selection, skipping duplicates and anything not allowed.
 * This is for quick feedback in the form; the server checks the same rules again.
 */
export function addToSelection(current: readonly File[], incoming: Iterable<File>): { files: File[]; problems: string[] } {
  const files = [...current];
  const problems = new Set<string>();
  for (const file of incoming) {
    if (!(file.type in ACCEPTED_FILE_TYPES)) problems.add(`"${file.name}" is not a supported type. Use ${ACCEPTED_FILE_LABEL}.`);
    else if (file.size > MAX_FILE_SIZE) problems.add(`"${file.name}" is larger than ${formatFileSize(MAX_FILE_SIZE)}.`);
    else if (file.size === 0) problems.add(`"${file.name}" is empty.`);
    else if (files.some((existing) => existing.name === file.name && existing.size === file.size)) continue;
    else if (files.length >= MAX_FILES) problems.add(`You can add up to ${MAX_FILES} files per note.`);
    else files.push(file);
  }
  return { files, problems: [...problems] };
}
