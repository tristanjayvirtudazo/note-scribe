import Link from "next/link";
import {
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  FileUpIcon,
  FolderIcon,
  ListChecksIcon,
  LockIcon,
  PencilLineIcon,
  SmartphoneIcon,
  SparklesIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "cn";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme";
import { buttonVariants } from "@/components/ui/button";

const steps = [
  { icon: FileUpIcon, title: "Upload your material", text: "Add photos of handwritten notes, slides, textbook pages or PDF documents." },
  { icon: SparklesIcon, title: "Get a clear study guide", text: "AI reads your files and writes organised notes with key terms and a quick review." },
  { icon: ListChecksIcon, title: "Test yourself", text: "Generate a quiz from any note, see why each answer is right, and try again." },
];

const features = [
  { icon: PencilLineIcon, title: "Yours to edit", text: "Rewrite, reorder, remove or add parts. The notes are a starting point, not the final word." },
  { icon: FolderIcon, title: "Organised by subject", text: "File notes under subjects and find anything with search." },
  { icon: TrendingUpIcon, title: "Scores over time", text: "Every quiz attempt is saved, so you can see yourself improve." },
  { icon: SmartphoneIcon, title: "Works on your phone", text: "Snap a page in class and review it on the way home." },
  { icon: LockIcon, title: "Private by default", text: "Your files and notes are visible only to your account." },
  { icon: SparklesIcon, title: "Regenerate any time", text: "Not happy with a result? Generate a fresh version in one tap." },
];

export default async function Page({ searchParams }: PageProps<"/">) {
  const { deleted } = await searchParams;
  return (
    <div className="page-glow flex flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ variant: "ghost", size: "lg" })}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "lg", className: "hidden sm:inline-flex" })}>
            Get started
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4">
        {deleted === "1" && (
          <p role="status" className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
            <CircleCheckIcon className="size-4" /> Your account and all of its data have been deleted.
          </p>
        )}
        <section className="flex flex-col items-center pt-14 text-center sm:pt-20">
          <p className="hero-pill flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <SparklesIcon className="size-3.5 text-primary" /> Your AI study companion
          </p>
          <h1 className="hero-rise mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Turn your files into <span className="bg-linear-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">study notes and quizzes</span>
          </h1>
          <p className="hero-rise mt-5 max-w-xl text-base text-muted-foreground text-pretty [animation-delay:150ms] sm:text-lg">
            Upload a photo or a document. Note Scribe reads it and gives you simple, well organised material to learn and review.
          </p>
          <div className="hero-rise mt-8 flex flex-col gap-3 [animation-delay:300ms] sm:flex-row">
            <Link href="/signup" className={buttonVariants({ size: "lg", className: "h-11 px-6 text-base shadow-lg shadow-primary/25" })}>
              Get started free <ArrowRightIcon />
            </Link>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "h-11 px-6 text-base" })}>
              I already have an account
            </Link>
          </div>
        </section>

        {/* Decorative preview of a note and a quiz; not real data. */}
        <section aria-hidden="true" className="relative mx-auto mt-14 w-full max-w-4xl sm:mt-16">
          <div className="dot-grid absolute -inset-x-6 -inset-y-4 rounded-3xl" />
          <div className="relative grid gap-4 sm:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border bg-card p-5 text-left shadow-xl shadow-primary/5 sm:p-6">
              <p className="flex items-center gap-1.5 text-xs font-medium">
                <span className="size-2 rounded-full bg-emerald-500" /> Biology
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">Cellular respiration</p>
              <p className="mt-4 border-l-2 border-primary pl-3 font-heading text-sm font-semibold">Overview</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cells break down <strong className="text-foreground">glucose</strong> to release energy stored as{" "}
                <strong className="text-foreground">ATP</strong>, in four stages.
              </p>
              <p className="mt-4 border-l-2 border-primary pl-3 font-heading text-sm font-semibold">Key terms</p>
              <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
                <li>
                  <strong className="text-foreground">Glycolysis</strong> · glucose is split into two pyruvate
                </li>
                <li>
                  <strong className="text-foreground">Krebs cycle</strong> · happens in the mitochondrial matrix
                </li>
                <li>
                  <strong className="text-foreground">Chemiosmosis</strong> · a proton gradient drives ATP synthase
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-5 text-left shadow-xl shadow-primary/5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="font-heading text-sm font-semibold">Quiz 1</p>
                <p className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">Best 90%</p>
              </div>
              <p className="mt-3 text-sm font-medium">Where does glycolysis take place?</p>
              <ul className="mt-3 grid gap-2 text-sm">
                <li className="rounded-lg border px-3 py-2 text-muted-foreground">Mitochondrial matrix</li>
                <li className="flex items-center justify-between rounded-lg border border-emerald-600 bg-emerald-500/10 px-3 py-2 font-medium">
                  Cytoplasm <CheckIcon className="size-4 text-emerald-600" />
                </li>
                <li className="rounded-lg border px-3 py-2 text-muted-foreground">Nucleus</li>
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="pt-20 sm:pt-28">
          <h2 id="how-it-works" className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            From page to practice in three steps
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border bg-card p-6">
                <span className="absolute top-5 right-5 font-heading text-4xl font-semibold text-primary/15">{index + 1}</span>
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  <step.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-heading font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="features" className="pt-20 sm:pt-28">
          <h2 id="features" className="text-center font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for the way you study
          </h2>
          <ul className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="my-20 rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:my-28">
          <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Ready for your next exam?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-primary-foreground/80">Create your first note in under a minute. All you need is a photo or a PDF.</p>
          <Link href="/signup" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-6 h-11 bg-white px-6 text-base text-indigo-700 shadow-lg hover:bg-white/90 hover:text-indigo-800")}>
            Create a free account <ArrowRightIcon />
          </Link>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Logo />
          <p>Study smarter, one note at a time.</p>
        </div>
      </footer>
    </div>
  );
}
