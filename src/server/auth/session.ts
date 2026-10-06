import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/server/errors";
import { profileRepository } from "@/server/repositories/profile.repository";

/** The Supabase Auth user for this request, verified with the Auth server, or null. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/**
 * The signed-in user's profile. Redirects to /login when there is no session.
 * Every page and Server Action starts here and passes the returned `id` down to the services;
 * the database connection bypasses row level security, so this is the authorization boundary.
 */
export const requireUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  const metadataName: unknown = authUser.user_metadata?.full_name;
  const profile = await profileRepository.syncFromAuth({
    id: authUser.id,
    email: authUser.email ?? "",
    fullName: typeof metadataName === "string" && metadataName.trim() ? metadataName.trim().slice(0, 80) : null,
  });
  return { ...profile, emailConfirmed: Boolean(authUser.email_confirmed_at) };
});

/**
 * For anything that spends money (uploads, AI generation): the account must have a confirmed
 * email, so throwaway accounts cannot be scripted to burn through the budget.
 */
export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.emailConfirmed) throw new AppError("Please confirm your email address first. Check your inbox for the link we sent when you signed up.");
  return user;
}
