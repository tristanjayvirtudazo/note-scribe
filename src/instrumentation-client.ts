import { NAVIGATION_START_EVENT } from "@/lib/constants";

// Tells <NavigationProgress /> that a page change has begun, for links and router.push() alike.
export function onRouterTransitionStart(url: string) {
  const target = new URL(url, window.location.href);
  // Navigating to the page already on screen never changes the URL, so nothing would end the bar.
  if (target.pathname === window.location.pathname && target.search === window.location.search) return;
  window.dispatchEvent(new Event(NAVIGATION_START_EVENT));
}
