import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="font-heading text-xl font-semibold">We could not find that page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">It may have been deleted, or the link is incorrect.</p>
      <Link href="/notes" className={buttonVariants({ size: "lg" })}>
        Back to your notes
      </Link>
    </div>
  );
}
