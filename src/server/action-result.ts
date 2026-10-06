import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { firstIssue, type ActionResult, type FormState } from "@/lib/validation";
import { AppError } from "@/server/errors";

const UNEXPECTED = "Something went wrong. Please try again.";

/** Validates untrusted action input; the first problem becomes a user-facing error. */
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new AppError(firstIssue(parsed.error));
  return parsed.data;
}

function messageFor(error: unknown): string {
  // redirect() and notFound() work by throwing; they must keep propagating.
  unstable_rethrow(error);
  if (error instanceof AppError) return error.message;
  console.error(error);
  return UNEXPECTED;
}

/** Runs a use case for a Server Action and turns its outcome into a serialisable result. */
export async function toActionResult<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return { ok: false, error: messageFor(error) };
  }
}

/** Same as `toActionResult`, for forms driven by `useActionState`. */
export async function toFormState(run: () => Promise<string | void>): Promise<FormState> {
  try {
    const message = await run();
    return message ? { message } : undefined;
  } catch (error) {
    return { error: messageFor(error) };
  }
}
