"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.append(script);
  });
}

/**
 * Cloudflare Turnstile challenge for auth forms. Adds a hidden `captchaToken` field that
 * Supabase verifies server-side. Renders nothing when no site key is configured (local dev).
 * `resetKey` changes after each submission so a used token is replaced.
 */
export function Turnstile({ resetKey }: { resetKey: unknown }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!SITE_KEY || !container.current) return;
    let cancelled = false;
    const element = container.current;
    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(element, {
          sitekey: SITE_KEY,
          theme: resolvedTheme === "dark" ? "dark" : "light",
          size: "flexible",
          callback: (value: string) => setToken(value),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // The theme is read once at render; Turnstile cannot re-theme an existing widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A token is single-use; after the form comes back with a result, ask for a fresh one.
  const lastReset = useRef(resetKey);
  useEffect(() => {
    if (lastReset.current === resetKey) return;
    lastReset.current = resetKey;
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      setToken("");
    }
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={container} />
      <input type="hidden" name="captchaToken" value={token} readOnly />
    </div>
  );
}
