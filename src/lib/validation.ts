import { z } from "zod";
import { ACCEPTED_FILE_TYPES, MAX_FILES, MAX_FILE_SIZE, MAX_FLASHCARD_COUNT, MAX_QUIZ_SIZE, SUBJECT_COLORS } from "@/lib/constants";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; error: string };

/** State shape for forms driven by `useActionState`. */
export type FormState = { error?: string; message?: string } | undefined;

export function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .transform((value) => value || null)
    .nullish()
    .transform((value) => value ?? null);

const email = z.email("Enter a valid email address.").trim().toLowerCase();
const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be 72 characters or fewer.");

/** Cloudflare Turnstile token from the auth forms; Supabase verifies it. Empty when Turnstile is not configured. */
const captchaToken = z.string().max(4096).optional().transform((value) => value || undefined);

export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password."), captchaToken });
export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(80, "Name must be 80 characters or fewer."),
  email,
  password,
  captchaToken,
});
export const emailSchema = z.object({ email, captchaToken });
export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, "Passwords do not match.");
export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password."), password, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, "New passwords do not match.")
  .refine((value) => value.password !== value.currentPassword, "New password must differ from the current one.");
export const DELETE_CONFIRMATION = "DELETE";
export const deleteAccountSchema = z.object({
  confirmation: z.string().refine((value) => value.trim() === DELETE_CONFIRMATION, `Type ${DELETE_CONFIRMATION} to confirm.`),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(80, "Name must be 80 characters or fewer."),
});

export const subjectSchema = z.object({
  name: z.string().trim().min(1, "Enter a subject name.").max(50, "Subject name must be 50 characters or fewer."),
  color: z.enum(Object.keys(SUBJECT_COLORS) as [string, ...string[]]).default("indigo"),
});

const noteDetails = {
  title: z.string().trim().min(1, "Enter a title.").max(120, "Title must be 120 characters or fewer."),
  description: optionalText(500),
  subjectId: z.uuid().nullish().transform((value) => value ?? null),
};

export const noteDetailsSchema = z.object(noteDetails);

const fileDetails = {
  name: z.string().min(1).max(255),
  mimeType: z.string().refine((type) => type in ACCEPTED_FILE_TYPES, "Unsupported file type."),
  size: z.number().int().positive("A file is empty.").max(MAX_FILE_SIZE, "Each file must be 10 MB or smaller."),
};
const fileList = <T extends z.ZodType>(file: T) =>
  z.array(file).min(1, "Add at least one file.").max(MAX_FILES, `You can upload up to ${MAX_FILES} files.`);

/** What the browser declares about the files it wants to upload, before any bytes are sent. */
export const uploadRequestSchema = fileList(z.object(fileDetails));

export const createNoteSchema = z.object({
  ...noteDetails,
  newSubjectName: optionalText(50),
  /** The upload batch issued by the server; every file path must sit inside it. */
  uploadId: z.uuid(),
  files: fileList(z.object({ ...fileDetails, path: z.string().min(1).max(500) })),
});

export const sectionSchema = z.object({
  heading: z.string().trim().min(1, "Enter a heading.").max(120, "Heading must be 120 characters or fewer."),
  content: z.string().trim().min(1, "Enter some content.").max(20000, "Content is too long."),
});

const countSchema = (max: number, what: string) =>
  z.number({ error: `Enter how many ${what} to generate.` }).int(`Enter a whole number of ${what}.`).min(1, `Generate at least 1 ${what.replace(/s$/, "")}.`).max(max, `You can generate up to ${max} ${what} at a time.`);

export const quizSizeSchema = countSchema(MAX_QUIZ_SIZE, "questions");
export const flashcardCountSchema = countSchema(MAX_FLASHCARD_COUNT, "cards");

export const flashcardSchema = z.object({
  front: z.string().trim().min(1, "Enter the front of the card.").max(300, "The front must be 300 characters or fewer."),
  back: z.string().trim().min(1, "Enter the back of the card.").max(1000, "The back must be 1,000 characters or fewer."),
});

export const reviewOutcomeSchema = z.enum(["got-it", "not-yet"]);

export const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, "Enter the question.").max(500, "Question must be 500 characters or fewer."),
    options: z
      .array(z.string().trim().min(1, "Answer choices cannot be empty.").max(300, "Answer choices must be 300 characters or fewer."))
      .min(2, "Add at least two answer choices.")
      .max(6, "Use at most six answer choices."),
    correctIndex: z.number().int().min(0),
    explanation: optionalText(1000),
  })
  .refine((value) => value.correctIndex < value.options.length, "Pick which answer is correct.");

export const attemptSchema = z.record(z.uuid(), z.number().int().min(0).max(5));

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type NoteDetailsInput = z.infer<typeof noteDetailsSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type QuizSize = z.infer<typeof quizSizeSchema>;
export type FlashcardInput = z.infer<typeof flashcardSchema>;
export type ReviewOutcomeInput = z.infer<typeof reviewOutcomeSchema>;
export type QuestionInput = z.infer<typeof questionSchema>;
export type AttemptAnswers = z.infer<typeof attemptSchema>;
