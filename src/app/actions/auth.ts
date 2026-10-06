"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changePasswordSchema,
  deleteAccountSchema,
  emailSchema,
  newPasswordSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
  type FormState,
} from "@/lib/validation";
import { parseInput, toFormState } from "@/server/action-result";
import { getAuthUser, requireUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { getRequestOrigin as getOrigin } from "@/server/request-origin";
import { accountService } from "@/server/services/account.service";

export async function signIn(_state: FormState, formData: FormData): Promise<FormState> {
  const state = await toFormState(async () => {
    await accountService.signIn(parseInput(signInSchema, Object.fromEntries(formData)));
  });
  if (state?.error) return state;
  redirect("/notes");
}

export async function signUp(_state: FormState, formData: FormData): Promise<FormState> {
  let signedIn = false;
  const state = await toFormState(async () => {
    const input = parseInput(signUpSchema, Object.fromEntries(formData));
    const outcome = await accountService.signUp(input, `${await getOrigin()}/auth/callback?next=/notes`);
    signedIn = outcome === "signed-in";
    return "Almost there! If this email is not registered yet, we sent it a confirmation link. Open it to finish signing up.";
  });
  if (signedIn) redirect("/notes");
  return state;
}

export async function signOut(): Promise<void> {
  await accountService.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_state: FormState, formData: FormData): Promise<FormState> {
  return toFormState(async () => {
    const { email, captchaToken } = parseInput(emailSchema, Object.fromEntries(formData));
    await accountService.requestPasswordReset(email, `${await getOrigin()}/auth/callback?next=/reset-password`, captchaToken);
    // Same answer whether or not the account exists, so emails cannot be probed.
    return "If an account exists for that email, a password reset link is on its way.";
  });
}

/** Sets a new password for the session created by a password reset link. */
export async function resetPassword(_state: FormState, formData: FormData): Promise<FormState> {
  const state = await toFormState(async () => {
    const { password } = parseInput(newPasswordSchema, Object.fromEntries(formData));
    if (!(await getAuthUser())) throw new AppError("This reset link has expired. Please request a new one.");
    await accountService.setPassword(password);
  });
  if (state?.error) return state;
  redirect("/notes");
}

export async function changePassword(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  return toFormState(async () => {
    await accountService.changePassword(user.email, parseInput(changePasswordSchema, Object.fromEntries(formData)));
    return "Your password has been changed.";
  });
}

export async function deleteAccount(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const state = await toFormState(async () => {
    parseInput(deleteAccountSchema, Object.fromEntries(formData));
    await accountService.deleteAccount(user.id);
  });
  if (state?.error) return state;
  redirect("/?deleted=1");
}

export async function updateProfile(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  return toFormState(async () => {
    const { fullName } = parseInput(profileSchema, Object.fromEntries(formData));
    await accountService.updateProfile(user.id, fullName);
    // The name also appears in the header, which lives in the shared layout.
    revalidatePath("/", "layout");
    return "Profile saved.";
  });
}
