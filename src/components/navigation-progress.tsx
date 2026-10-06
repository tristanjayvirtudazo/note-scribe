"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { NAVIGATION_START_EVENT } from "@/lib/constants";

// Hides the bar if a navigation is cancelled or fails and the URL never changes.
const GIVE_UP_AFTER_MS = 20000;

/** A thin bar across the top of the screen while the next page is loading. */
export function NavigationProgress() {
  return (
    // useSearchParams needs a Suspense boundary on statically rendered pages.
    <Suspense>
      <ProgressBar />
    </Suspense>
  );
}

function ProgressBar() {
  const bar = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    function start() {
      const element = bar.current;
      if (!element) return;
      clearTimeout(timeout);
      element.dataset.state = "loading";
      timeout = setTimeout(() => {
        element.dataset.state = "idle";
      }, GIVE_UP_AFTER_MS);
    }
    window.addEventListener(NAVIGATION_START_EVENT, start);
    return () => {
      window.removeEventListener(NAVIGATION_START_EVENT, start);
      clearTimeout(timeout);
    };
  }, []);

  // The URL changing means the new page has been shown.
  useEffect(() => {
    const element = bar.current;
    if (element?.dataset.state === "loading") element.dataset.state = "done";
  }, [pathname, searchParams]);

  return <div ref={bar} data-state="idle" role="presentation" className="navigation-progress" />;
}
