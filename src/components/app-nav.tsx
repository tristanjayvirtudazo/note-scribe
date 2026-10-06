"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderIcon, LogOutIcon, NotebookTextIcon, PlusIcon, SettingsIcon } from "lucide-react";
import { cn } from "cn";
import { signOut } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { href: "/notes", label: "Notes", icon: NotebookTextIcon },
  { href: "/subjects", label: "Subjects", icon: FolderIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/notes" ? pathname === "/notes" || (pathname.startsWith("/notes/") && pathname !== "/notes/new") : pathname.startsWith(href);
}

export function AppHeader({ name, email }: { name: string; email: string }) {
  const isActive = useIsActive();
  const initial = (name || email).charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Logo href="/notes" />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "text-muted-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground")}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/notes/new" className={cn(buttonVariants({ size: "lg" }), "hidden shadow-md shadow-primary/25 md:inline-flex")}>
            <PlusIcon /> New note
          </Link>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="secondary" size="icon-lg" className="rounded-full font-semibold" aria-label="Account menu" />}
            >
              {initial}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="truncate">{name ? `${name} · ${email}` : email}</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/settings" />}>
                <SettingsIcon /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                <LogOutIcon /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

/** Thumb-reachable navigation for phones; the header links take over from the md breakpoint. */
export function MobileTabBar() {
  const isActive = useIsActive();
  const pathname = usePathname();
  const tabs = [links[0], { href: "/notes/new", label: "New", icon: PlusIcon }, links[1], links[2]];

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => {
          const active = tab.href === "/notes/new" ? pathname === "/notes/new" : isActive(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="flex h-14 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground aria-[current=page]:font-medium aria-[current=page]:text-primary"
              >
                {tab.href === "/notes/new" ? (
                  <span className="-mt-5 flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-background">
                    <tab.icon className="size-5" />
                  </span>
                ) : (
                  <tab.icon className="size-5" />
                )}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
