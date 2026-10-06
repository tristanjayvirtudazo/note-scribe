import { NextResponse } from "next/server";
import { isUuid } from "@/lib/constants";
import { requireUser } from "@/server/auth/session";
import { getRequestOrigin } from "@/server/request-origin";
import { calendarService } from "@/server/services/calendar.service";

/** Downloads the note's next review as a single calendar event (for "Add to calendar"). */
export async function GET(_request: Request, context: RouteContext<"/notes/[id]/review.ics">) {
  const user = await requireUser();
  const { id } = await context.params;
  if (!isUuid(id)) return new NextResponse(null, { status: 404 });

  const review = await calendarService.noteReview(user.id, id, await getRequestOrigin()).catch(() => null);
  if (!review) return new NextResponse(null, { status: 404 });

  return new NextResponse(review.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="review.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
