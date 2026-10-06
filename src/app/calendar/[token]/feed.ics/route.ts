import { NextResponse, type NextRequest } from "next/server";
import { calendarService, isWellFormedToken } from "@/server/services/calendar.service";

// Public, read-only calendar feed. The token in the URL is the only credential, so this route
// is rate limited per token and answers identically for unknown and malformed tokens.

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(token: string, now: number): boolean {
  const entry = hits.get(token);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    hits.set(token, { count: 1, windowStart: now });
    if (hits.size > 10000) hits.clear();
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_WINDOW;
}

export async function GET(request: NextRequest, context: RouteContext<"/calendar/[token]/feed.ics">) {
  const { token } = await context.params;
  if (!isWellFormedToken(token)) return new NextResponse(null, { status: 404 });
  if (isRateLimited(token, Date.now())) return new NextResponse(null, { status: 429, headers: { "Retry-After": "3600" } });

  const feed = await calendarService.buildFeed(token, request.nextUrl.origin);
  if (feed === null) return new NextResponse(null, { status: 404 });

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="note-scribe.ics"',
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
