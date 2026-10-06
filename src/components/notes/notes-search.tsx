"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { nativeSelectClass } from "@/components/form-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  /** The search text and subject filter currently applied, as read from the URL. */
  query: string;
  subject: string;
  subjects: { id: string; name: string }[];
}

export function NotesSearch({ query, subject, subjects }: Props) {
  const router = useRouter();
  const [text, setText] = useState(query);
  const [selected, setSelected] = useState(subject);

  // When the URL changes by other means (back button, "Clear search"), show what is applied.
  const [applied, setApplied] = useState({ query, subject });
  if (applied.query !== query || applied.subject !== subject) {
    setApplied({ query, subject });
    setText(query);
    setSelected(subject);
  }

  function apply(nextText: string, nextSubject: string) {
    const params = new URLSearchParams();
    if (nextText.trim()) params.set("q", nextText.trim());
    if (nextSubject) params.set("subject", nextSubject);
    const search = params.toString();
    router.push(search ? `/notes?${search}` : "/notes");
  }

  return (
    <form
      role="search"
      className="grid gap-2 sm:grid-cols-[1fr_14rem_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        apply(text, selected);
      }}
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={text}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            // Emptying the box (the × button, or deleting the text) removes an applied search right away.
            if (next === "" && query !== "") apply("", selected);
          }}
          placeholder="Search notes"
          aria-label="Search notes"
          className="h-10 bg-card pl-8"
        />
      </div>
      <select
        value={selected}
        onChange={(event) => {
          setSelected(event.target.value);
          apply(text, event.target.value);
        }}
        aria-label="Filter by subject"
        className={`${nativeSelectClass} h-10 bg-card`}
      >
        <option value="">All subjects</option>
        {subjects.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
        <option value="none">No subject</option>
      </select>
      <Button type="submit" variant="outline" size="lg" className="h-10 bg-card px-4">
        Search
      </Button>
    </form>
  );
}
