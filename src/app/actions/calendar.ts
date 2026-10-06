"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/validation";
import { toActionResult } from "@/server/action-result";
import { requireUser } from "@/server/auth/session";
import { getRequestOrigin } from "@/server/request-origin";
import { calendarService } from "@/server/services/calendar.service";

export interface CalendarFeedUrls {
  https: string;
  webcal: string;
}

/** Turns the calendar feed on, or replaces its secret link. The link is only ever shown once. */
export async function enableCalendarFeed(): Promise<ActionResult<CalendarFeedUrls>> {
  const user = await requireUser();
  return toActionResult(async () => {
    const { token } = await calendarService.enableFeed(user.id);
    const https = `${await getRequestOrigin()}/calendar/${token}/feed.ics`;
    revalidatePath("/settings");
    return { https, webcal: https.replace(/^https?:/, "webcal:") };
  });
}

export async function disableCalendarFeed(): Promise<ActionResult<void>> {
  const user = await requireUser();
  return toActionResult(async () => {
    await calendarService.disableFeed(user.id);
    revalidatePath("/settings");
  });
}
