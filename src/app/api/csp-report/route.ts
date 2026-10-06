import { NextResponse, type NextRequest } from "next/server";

// Browsers POST here when the Content Security Policy would block something. While the policy
// is report-only this is how we learn what to allow before enforcing it.

const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  try {
    const body: unknown = await request.json();
    const report = (typeof body === "object" && body !== null && "csp-report" in body ? body["csp-report"] : body) as Record<string, unknown>;
    const pick = (key: string) => (typeof report[key] === "string" ? report[key] : "");
    console.warn(`[csp] ${pick("violated-directive") || pick("effective-directive")} blocked ${pick("blocked-uri")} on ${pick("document-uri")}`);
  } catch {
    // Malformed reports are ignored; nothing to do.
  }
  return new NextResponse(null, { status: 204 });
}
