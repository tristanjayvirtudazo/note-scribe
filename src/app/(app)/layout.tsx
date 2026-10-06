import { AppHeader, MobileTabBar } from "@/components/app-nav";
import { requireUser } from "@/server/auth/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="page-glow flex flex-1 flex-col bg-muted/40">
      <AppHeader name={user.fullName ?? ""} email={user.email} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:pb-10">{children}</main>
      <MobileTabBar />
    </div>
  );
}
