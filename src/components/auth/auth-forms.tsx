"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, resetPassword, signIn, signUp } from "@/app/actions/auth";
import { Turnstile } from "@/components/auth/turnstile";
import { LockIcon, MailIcon, UserIcon } from "lucide-react";
import { ErrorMessage, Field, FormMessage, IconInput, PasswordInput, SubmitButton } from "@/components/form-parts";

function Heading({ title, text }: { title: string; text: string }) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
const linkClass = "font-medium text-primary underline-offset-4 hover:underline";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <>
      <Heading title="Welcome back" text="Sign in to your notes and quizzes." />
      <form action={action} className="grid gap-4">
        {linkError && !state && <ErrorMessage>That link is invalid or has expired. Please try again.</ErrorMessage>}
        <FormMessage state={state} />
        <Field label="Email" htmlFor="email">
          <IconInput icon={MailIcon} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput icon={LockIcon} id="password" name="password" autoComplete="current-password" required placeholder="Your password" />
        </Field>
        <Link href="/forgot-password" className={`${linkClass} -mt-1 justify-self-end text-sm`}>
          Forgot your password?
        </Link>
        <Turnstile resetKey={state} />
        <SubmitButton className="h-11 text-base shadow-md shadow-primary/25">Sign in</SubmitButton>
      </form>
      <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/signup" className={linkClass}>
          Create an account
        </Link>
      </p>
    </>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <>
      <Heading title="Create your account" text="Start turning your files into study material." />
      <form action={action} className="grid gap-4">
        <FormMessage state={state} />
        <Field label="Name" htmlFor="fullName">
          <IconInput icon={UserIcon} id="fullName" name="fullName" autoComplete="name" required maxLength={80} placeholder="Your name" />
        </Field>
        <Field label="Email" htmlFor="email">
          <IconInput icon={MailIcon} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput icon={LockIcon} id="password" name="password" autoComplete="new-password" required minLength={8} placeholder="Create a password" />
        </Field>
        <Turnstile resetKey={state} />
        <SubmitButton className="h-11 text-base shadow-md shadow-primary/25">Create account</SubmitButton>
      </form>
      <p className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className={linkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <>
      <Heading title="Reset your password" text="Enter your email and we will send you a link to choose a new password." />
      <form action={action} className="grid gap-4">
        <FormMessage state={state} />
        <Field label="Email" htmlFor="email">
          <IconInput icon={MailIcon} id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <Turnstile resetKey={state} />
        <SubmitButton className="h-11 text-base shadow-md shadow-primary/25">Send reset link</SubmitButton>
      </form>
      <p className="mt-6 border-t pt-5 text-center text-sm">
        <Link href="/login" className={linkClass}>
          Back to sign in
        </Link>
      </p>
    </>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <>
      <Heading title="Choose a new password" text="You will be signed in once it is saved." />
      <form action={action} className="grid gap-4">
        <FormMessage state={state} />
        <Field label="New password" htmlFor="password" hint="At least 8 characters.">
          <PasswordInput icon={LockIcon} id="password" name="password" autoComplete="new-password" required minLength={8} placeholder="Create a password" />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword">
          <PasswordInput icon={LockIcon} id="confirmPassword" name="confirmPassword" autoComplete="new-password" required placeholder="Repeat the password" />
        </Field>
        <SubmitButton className="h-11 text-base shadow-md shadow-primary/25">Save password</SubmitButton>
      </form>
    </>
  );
}
