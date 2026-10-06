"use client";

import { useId } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";

/** Quick-pick buttons for common amounts, plus a box for any other number. */
export function CountPicker({
  label,
  value,
  onChange,
  presets,
  max,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  presets: readonly number[];
  max: number;
  disabled?: boolean;
}) {
  const inputId = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={inputId} className="text-sm text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className={cn(
              "h-9 min-w-11 rounded-lg border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
              value === preset ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
            )}
          >
            {preset}
          </button>
        ))}
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.valueAsNumber)}
          aria-label={`${label} (1 to ${max})`}
          className="h-9 w-20 bg-card"
        />
      </div>
    </div>
  );
}
