/**
 * Minimal iCalendar (RFC 5545) writer for all-day review events. Pure functions, so the feed
 * can be unit-tested without a server.
 */

export interface CalendarEvent {
  /** Stable id so calendar apps update an event instead of duplicating it. */
  uid: string;
  /** All-day event on this date (the calendar user's local day). */
  date: Date;
  summary: string;
  description?: string;
  url?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** YYYYMMDD in UTC, for all-day DTSTART/DTEND values. */
export function formatIcsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

/** YYYYMMDDTHHMMSSZ, for DTSTAMP. */
function formatIcsDateTime(date: Date): string {
  return `${formatIcsDate(date)}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function nextDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

/** Text values must escape backslashes, semicolons, commas and newlines. */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are continued on the next line with a leading space. */
export function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = new TextEncoder().encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcsCalendar(name: string, events: CalendarEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Note Scribe//Review schedule//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${formatIcsDateTime(now)}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(nextDay(event.date))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    lines.push("TRANSP:TRANSPARENT", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

/** Links that create a single event in web calendars, for an "Add to calendar" menu. */
export function calendarLinks(event: CalendarEvent): { google: string; outlook: string } {
  const start = formatIcsDate(event.date);
  const end = formatIcsDate(nextDay(event.date));
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", event.summary);
  google.searchParams.set("dates", `${start}/${end}`);
  if (event.description) google.searchParams.set("details", event.description);
  const outlook = new URL("https://outlook.live.com/calendar/0/action/compose");
  outlook.searchParams.set("rru", "addevent");
  outlook.searchParams.set("subject", event.summary);
  outlook.searchParams.set("startdt", event.date.toISOString().slice(0, 10));
  outlook.searchParams.set("enddt", nextDay(event.date).toISOString().slice(0, 10));
  outlook.searchParams.set("allday", "true");
  if (event.description) outlook.searchParams.set("body", event.description);
  return { google: google.toString(), outlook: outlook.toString() };
}
