import { CheckIcon, FileUpIcon, ListChecksIcon, SparklesIcon } from "lucide-react";
import { Logo } from "@/components/logo";

const benefits = [
  { icon: FileUpIcon, title: "Upload anything", text: "Photos of handwritten notes, slides or PDFs." },
  { icon: SparklesIcon, title: "Get clear study notes", text: "Organised parts you can edit and build on." },
  { icon: ListChecksIcon, title: "Remember it", text: "Quizzes, flashcards and spaced reviews." },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel, shown beside the form on large screens. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,var(--primary),oklch(0.5_0.22_300))] p-10 text-white lg:flex xl:p-14">
        <div className="dot-grid absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-fuchsia-400/20 blur-3xl" aria-hidden="true" />

        <div className="relative">
          <Logo inverted />
        </div>

        <div className="relative grid max-w-lg gap-10">
          <div>
            <p className="font-heading text-4xl font-semibold tracking-tight text-balance">Study smarter, one note at a time.</p>
            <p className="mt-3 text-white/80">Turn what you already have into material that actually sticks.</p>
          </div>

          {/* Decorative preview of a note and its quiz; not real data. */}
          <div aria-hidden="true" className="relative h-48">
            <div className="absolute top-0 left-0 w-72 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl backdrop-blur">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <span className="size-2 rounded-full bg-emerald-300" /> Biology
              </p>
              <p className="mt-1 font-heading font-semibold">Cellular respiration</p>
              <div className="mt-3 grid gap-1.5">
                <span className="block h-2 w-full rounded bg-white/40" />
                <span className="block h-2 w-5/6 rounded bg-white/30" />
                <span className="block h-2 w-2/3 rounded bg-white/30" />
              </div>
            </div>
            <div className="absolute top-16 left-52 w-64 rotate-3 rounded-2xl border border-white/20 bg-white p-4 text-neutral-900 shadow-2xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Quiz 1</p>
                <p className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Mastery 90%</p>
              </div>
              <p className="mt-2 text-xs font-medium">Where does glycolysis take place?</p>
              <div className="mt-2 grid gap-1.5 text-[11px]">
                <span className="rounded-md border border-neutral-200 px-2 py-1 text-neutral-500">Mitochondrial matrix</span>
                <span className="flex items-center justify-between rounded-md border border-emerald-500 bg-emerald-500/10 px-2 py-1 font-medium">
                  Cytoplasm <CheckIcon className="size-3 text-emerald-600" />
                </span>
              </div>
            </div>
          </div>

          <ul className="grid gap-4">
            {benefits.map((benefit) => (
              <li key={benefit.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <benefit.icon className="size-4" />
                </span>
                <div>
                  <p className="font-medium">{benefit.title}</p>
                  <p className="text-sm text-white/75">{benefit.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">Your files and notes are visible only to you.</p>
      </aside>

      <main className="page-glow flex flex-col px-4 py-8 sm:py-12 lg:justify-center">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
