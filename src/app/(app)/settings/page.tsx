import type { Metadata } from "next";
import { SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CalendarFeedCard } from "@/components/settings/calendar-feed";
import { DeleteAccountForm, PasswordForm, ProfileForm, SignOutButton } from "@/components/settings/settings-forms";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto grid max-w-xl gap-6">
      <PageHeader icon={SettingsIcon} title="Settings" description="Manage your profile and keep your account secure." />

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading font-semibold">Profile</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Your basic account details.</p>
        <ProfileForm fullName={user.fullName ?? ""} email={user.email} />
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading font-semibold">Password</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Enter your current password to choose a new one.</p>
        <PasswordForm email={user.email} />
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading font-semibold">Calendar</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">See your review dates in Apple Calendar, Google Calendar or Outlook.</p>
        <CalendarFeedCard enabled={user.calendarTokenHash !== null} />
      </section>

      <section className="flex items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="font-heading font-semibold">Sign out</h2>
          <p className="mt-1 text-sm text-muted-foreground">End your session on this device.</p>
        </div>
        <SignOutButton />
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-card p-5 shadow-sm sm:p-6">
        <h2 className="font-heading font-semibold">Delete account</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">Remove your account and everything in it.</p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
