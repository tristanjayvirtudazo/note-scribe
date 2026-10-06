"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="font-heading text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">We could not load this page. Please try again in a moment.</p>
      <Button size="lg" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
