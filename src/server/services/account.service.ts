import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChangePasswordInput, SignInInput, SignUpInput } from "@/lib/validation";
import { AppError } from "@/server/errors";
import { profileRepository } from "@/server/repositories/profile.repository";
import { noteFileStorage } from "@/server/storage/note-files.storage";
import { createAdminClient } from "@/server/supabase-admin";

// Account use cases. Credentials and sessions are owned by Supabase Auth.

const TOO_MANY_ATTEMPTS = "Too many attempts. Please wait a minute and try again.";
const CAPTCHA_FAILED = "Please complete the verification check and try again.";

function passwordUpdateError(code: string | undefined): AppError {
  if (code === "same_password") return new AppError("New password must differ from the current one.");
  if (code === "weak_password") return new AppError("Please choose a stronger password.");
  return new AppError("We could not update your password. Please try again.");
}

export const accountService = {
  async signIn(credentials: SignInInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
      options: { captchaToken: credentials.captchaToken },
    });
    if (!error) return;
    if (error.code === "captcha_failed") throw new AppError(CAPTCHA_FAILED);
    if (error.code === "email_not_confirmed") throw new AppError("Please confirm your email first. Check your inbox for the link.");
    throw new AppError("Incorrect email or password.");
  },

  /** Returns whether the new user is signed in already, or still has to confirm their email. */
  async signUp(input: SignUpInput, confirmUrl: string): Promise<"signed-in" | "confirmation-sent"> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { full_name: input.fullName }, emailRedirectTo: confirmUrl, captchaToken: input.captchaToken },
    });
    if (error) {
      if (error.code === "captcha_failed") throw new AppError(CAPTCHA_FAILED);
      if (error.code === "weak_password") throw new AppError("Please choose a stronger password.");
      if (error.code === "user_already_exists") throw new AppError("An account with this email already exists. Try signing in.");
      if (error.status === 429) throw new AppError(TOO_MANY_ATTEMPTS);
      throw new AppError("We could not create your account. Please try again.");
    }
    return data.session ? "signed-in" : "confirmation-sent";
  },

  async signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
  },

  async requestPasswordReset(email: string, resetUrl: string, captchaToken?: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl, captchaToken });
    if (error?.code === "captcha_failed") throw new AppError(CAPTCHA_FAILED);
    // Any other failure is deliberately silent, so the form cannot be used to probe for accounts.
    if (error?.status === 429) throw new AppError(TOO_MANY_ATTEMPTS);
  },

  /**
   * Sets the password of whoever holds the current session (used after a reset link), then
   * ends every other session: a changed password should lock out anyone else who had access.
   */
  async setPassword(password: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw passwordUpdateError(error.code);
    const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
    if (signOutError) console.error("Could not end other sessions after a password change", signOutError);
  },

  /**
   * Permanently removes the account: stored files, every database row (by cascade from the
   * profile), then the Supabase Auth user. Order matters: if a later step fails, the user can
   * still sign in and retry.
   */
  async deleteAccount(userId: string): Promise<void> {
    await noteFileStorage.removeUserFolder(userId);
    await profileRepository.delete(userId);
    const { error } = await createAdminClient().auth.admin.deleteUser(userId);
    if (error) {
      console.error("Could not delete auth user", error);
      throw new AppError("Your notes were removed, but the account itself could not be deleted. Please try again.");
    }
    const supabase = await createClient();
    await supabase.auth.signOut();
  },

  async changePassword(email: string, input: ChangePasswordInput): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: input.currentPassword });
    if (error) throw new AppError("Your current password is incorrect.");
    await this.setPassword(input.password);
  },

  async updateProfile(userId: string, fullName: string): Promise<void> {
    await profileRepository.updateName(userId, fullName);
    // Kept in the auth metadata too, so the name survives if the profile row is ever recreated.
    const supabase = await createClient();
    await supabase.auth.updateUser({ data: { full_name: fullName } });
  },
};
