import Link from "next/link";
import { NotebookPenIcon } from "lucide-react";

/** `inverted` is for placing the logo on a primary-coloured background. */
export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-heading text-base font-semibold">
      <span
        className={`flex size-8 items-center justify-center rounded-lg shadow-sm ${inverted ? "bg-white text-primary" : "bg-primary text-primary-foreground"}`}
      >
        <NotebookPenIcon className="size-4" />
      </span>
      Note Scribe
    </Link>
  );
}
