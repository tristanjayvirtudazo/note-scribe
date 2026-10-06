/**
 * Content Security Policy for one request. Scripts may only run when they carry this request's
 * nonce (Next.js adds it to its own scripts, and 'strict-dynamic' trusts what those load, such as
 * the Turnstile widget). Everything else is restricted to this origin plus Supabase.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const supabase = supabaseOrigin();
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    // 'unsafe-eval' only in development: React rebuilds error stacks with eval there.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes come from React props (progress bars, flip animation).
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace(/^https?/, "wss")}` : ""}`,
    "frame-src https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "report-uri /api/csp-report",
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

/** Report-only until CSP_ENFORCE=true, so a mistake in the policy cannot break the app. */
export const cspHeaderName = process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

function supabaseOrigin(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return null;
  }
}
