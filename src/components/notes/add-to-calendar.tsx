"use client";

import { CalendarPlusIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Puts the note's next review into the user's calendar app of choice. */
export function AddToCalendar({ links }: { links: { google: string; outlook: string; ics: string } }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="-ml-2 text-primary" />}>
        <CalendarPlusIcon /> Add to calendar
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem render={<a href={links.google} target="_blank" rel="noopener noreferrer" />}>
          <ExternalLinkIcon /> Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={links.outlook} target="_blank" rel="noopener noreferrer" />}>
          <ExternalLinkIcon /> Outlook
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={links.ics} />}>
          <DownloadIcon /> Apple Calendar / download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
