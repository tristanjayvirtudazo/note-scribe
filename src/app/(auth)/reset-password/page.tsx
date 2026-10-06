import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { ErrorMessage } from "@/components/form-parts";
import { getAuthUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "New password" };

export default async function ResetPasswordPage() {
  // The reset link signs the user in through /auth/callback before landing here.
  if (!(await getAuthUser())) {
    return (
      <div className="grid gap-4">
        <ErrorMessage>This reset link is invalid or has expired.</ErrorMessage>
        <Link href="/forgot-password" className="text-center text-sm font-medium text-primary underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm />;
}
