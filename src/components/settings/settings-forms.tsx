"use client";

import { useActionState, useEffect, useRef } from "react";
import { LogOutIcon, TriangleAlertIcon } from "lucide-react";
import { changePassword, deleteAccount, signOut, updateProfile } from "@/app/actions/auth";
import { Field, FormMessage, SubmitButton } from "@/components/form-parts";
import { Input } from "@/components/ui/input";
import { DELETE_CONFIRMATION } from "@/lib/validation";

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <Field label="Name" htmlFor="fullName">
        <Input key={fullName} id="fullName" name="fullName" defaultValue={fullName} autoComplete="name" required maxLength={80} className="h-10" />
      </Field>
      <Field label="Email" htmlFor="email" hint="Your email is used to sign in and cannot be changed here.">
        <Input id="email" value={email} readOnly disabled className="h-10" />
      </Field>
      <SubmitButton className="w-fit">Save profile</SubmitButton>
    </form>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const [state, action] = useActionState(changePassword, undefined);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.message) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="grid gap-4">
      <FormMessage state={state} />
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
      <Field label="Current password" htmlFor="currentPassword">
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="h-10" />
      </Field>
      <Field label="New password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="h-10" />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword">
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="h-10" />
      </Field>
      <SubmitButton className="w-fit">Change password</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
        This permanently deletes your account, every note, uploaded file, quiz, flashcard and score. It cannot be undone.
      </p>
      <Field label={`Type ${DELETE_CONFIRMATION} to confirm`} htmlFor="confirmation">
        <Input id="confirmation" name="confirmation" autoComplete="off" required className="h-10" />
      </Field>
      <SubmitButton variant="destructive" className="w-fit">
        Delete my account
      </SubmitButton>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form action={signOut}>
      <SubmitButton variant="outline">
        <LogOutIcon /> Sign out
      </SubmitButton>
    </form>
  );
}
