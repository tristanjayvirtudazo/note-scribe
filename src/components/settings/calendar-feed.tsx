"use client";

import { useState, useTransition } from "react";
import { CalendarPlusIcon, CheckIcon, CopyIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { disableCalendarFeed, enableCalendarFeed, type CalendarFeedUrls } from "@/app/actions/calendar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalendarFeedCard({ enabled }: { enabled: boolean }) {
  const [urls, setUrls] = useState<CalendarFeedUrls | null>(null);
  const [confirming, setConfirming] = useState<"regenerate" | "disable" | null>(null);
  const [pending, startTransition] = useTransition();

  function enable() {
    startTransition(async () => {
      const result = await enableCalendarFeed();
      setConfirming(null);
      if (result.ok) setUrls(result.data);
      else toast.error(result.error);
    });
  }

  function disable() {
    startTransition(async () => {
      const result = await disableCalendarFeed();
      setConfirming(null);
      if (result.ok) {
        setUrls(null);
        toast.success("Calendar feed turned off.");
      } else toast.error(result.error);
    });
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        A read-only calendar of your review dates and due flashcards. Subscribe once and your calendar app keeps it up to date on every device.
      </p>

      {urls ? (
        <div className="grid gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm font-medium">Your feed is ready. Copy the link now: for your security it is shown only this once.</p>
          <CopyField label="Link for Google Calendar and Outlook (https)" value={urls.https} />
          <CopyField label="Link for Apple Calendar on iPhone and Mac (webcal)" value={urls.webcal} />
          <a href={urls.webcal} className={buttonVariants({ size: "lg", className: "w-fit" })}>
            <CalendarPlusIcon /> Open in Apple Calendar
          </a>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">How to subscribe</summary>
            <ul className="mt-2 grid gap-1.5 text-muted-foreground">
              <li>
                <strong className="text-foreground">iPhone / Mac:</strong> tap the button above, or Settings → Calendar → Accounts → Add Subscribed Calendar and paste the webcal link.
              </li>
              <li>
                <strong className="text-foreground">Google Calendar:</strong> on the web, Other calendars → + → From URL, paste the https link. It then syncs to the Google Calendar app on your phone.
              </li>
              <li>
                <strong className="text-foreground">Outlook:</strong> Add calendar → Subscribe from web, paste the https link.
              </li>
            </ul>
          </details>
        </div>
      ) : enabled ? (
        <p className="flex items-center gap-2 text-sm">
          <CheckIcon className="size-4 text-emerald-600" /> Your calendar feed is on.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {enabled || urls ? (
          <>
            <Button variant="outline" size="lg" disabled={pending} onClick={() => setConfirming("regenerate")}>
              Make a new link
            </Button>
            <Button variant="destructive" size="lg" disabled={pending} onClick={() => setConfirming("disable")}>
              Turn off
            </Button>
          </>
        ) : (
          <Button size="lg" disabled={pending} onClick={enable}>
            {pending ? <Loader2Icon className="animate-spin" /> : <CalendarPlusIcon />}
            Turn on calendar feed
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirming === "regenerate"}
        onOpenChange={(open) => !open && !pending && setConfirming(null)}
        title="Make a new link?"
        description="The current link stops working immediately. You will need to subscribe again with the new one."
        confirmLabel="Make a new link"
        destructive={false}
        pending={pending}
        onConfirm={enable}
      />
      <ConfirmDialog
        open={confirming === "disable"}
        onOpenChange={(open) => !open && !pending && setConfirming(null)}
        title="Turn off the calendar feed?"
        description="Calendars subscribed to it will stop receiving your review dates."
        confirmLabel="Turn off"
        pending={pending}
        onConfirm={disable}
      />
    </div>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <Input readOnly value={value} onFocus={(event) => event.target.select()} className="h-9 bg-card font-mono text-xs" />
        <Button
          variant="outline"
          size="icon-lg"
          aria-label="Copy link"
          onClick={() => {
            void navigator.clipboard.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
