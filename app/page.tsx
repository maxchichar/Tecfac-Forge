import Link from "next/link";
import {
  Sparkles,
  FolderGit2,
  FileText,
  BookOpenCheck,
  ArrowRight,
  Target,
  FlaskConical,
  TrendingUp,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgressRing } from "@/components/course/ProgressRing";

const SOURCES = [
  { name: "GitHub repositories", icon: FolderGit2 },
  { name: "Markdown folders", icon: FileText },
  { name: "GitBook & Docusaurus", icon: BookOpenCheck },
];

const PILLARS = [
  {
    icon: BookOpenCheck,
    title: "Learning",
    body: "Documentation restructured into lessons with a table of contents, reading time, and clean typography — not a wall of README.",
  },
  {
    icon: FlaskConical,
    title: "Practice",
    body: "Every concept leads somewhere: a project, an exercise, a checklist you actually complete.",
  },
  {
    icon: Sparkles,
    title: "AI Tutor",
    body: "Context-aware on your current lesson, your prior progress, and your notes — not a generic chatbot in a sidebar.",
  },
  {
    icon: TrendingUp,
    title: "Progress",
    body: "Mastery estimates, not vibes. See exactly what you've completed and what's next.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Tecfac Forge</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            Log in
          </Link>
          <Link href="/login">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-10 sm:pb-24 sm:pt-16">
        <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px]" />
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-tertiary)]">
              <FolderGit2 className="h-3 w-3" /> Import any repo in under a minute
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
              Turn documentation into <span className="text-gradient">a place to actually learn.</span>
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              Point Tecfac Forge at a GitHub repository, a docs site, or a course. It comes back structured
              into lessons and projects, with an AI tutor that knows exactly where you are.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button size="lg">
                  Import your first course <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="secondary">
                  See a live example
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5">
              {SOURCES.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                  <s.icon className="h-3.5 w-3.5" /> {s.name}
                </span>
              ))}
            </div>
          </div>

          {/* Signature element: a framed product preview */}
          <div className="relative">
            <div className="surface-glass rounded-[var(--radius-xl)] border border-[var(--color-border-strong)] p-1.5 shadow-2xl">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-danger)]/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-warning)]/70" />
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-success)]/70" />
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--color-bg-elevated)] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[var(--color-text-tertiary)]">rust-lang/book</p>
                    <p className="text-[15px] font-semibold">Understanding Ownership</p>
                  </div>
                  <ProgressRing value={62} size={52} strokeWidth={5} />
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-2.5 w-full rounded bg-[var(--color-surface-hover)]" />
                  <div className="h-2.5 w-5/6 rounded bg-[var(--color-surface-hover)]" />
                  <div className="h-2.5 w-4/6 rounded bg-[var(--color-surface-hover)]" />
                </div>
                <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[#0d0d12] p-3 font-mono text-[11px] text-[var(--color-text-secondary)]">
                  <span className="text-[var(--color-accent-solid)]">let</span> s = String::from(<span className="text-[var(--color-success)]">"hello"</span>);
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] px-3 py-2">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-solid)]" />
                  <p className="text-[11px] text-[var(--color-accent-solid)]">
                    AI Tutor: "Copy types never move — want a quiz on this?"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)]">
                <p.icon className="h-4.5 w-4.5 text-[var(--color-accent-solid)]" />
              </div>
              <h3 className="mt-4 text-[15px] font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials placeholder */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-sm font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          What early users say
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
              <Quote className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <p className="mt-3 text-[13.5px] text-[var(--color-text-secondary)]">
                Placeholder testimonial — swap in real quotes from your beta users before launch.
              </p>
              <p className="mt-4 text-xs text-[var(--color-text-tertiary)]">— Beta user #{i}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing placeholder */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight">Simple pricing</h2>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
            <p className="text-sm font-medium">Individual</p>
            <p className="mt-2 text-3xl font-semibold">Free</p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">3 imported courses, limited AI tutor queries</p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-accent-solid)] bg-[var(--color-accent-soft)] p-6">
            <p className="text-sm font-medium">Pro — placeholder</p>
            <p className="mt-2 text-3xl font-semibold">$—/mo</p>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">Unlimited courses, full AI tutor, teams</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col items-center rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-14 text-center">
          <Target className="h-6 w-6 text-[var(--color-accent-solid)]" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">Import your first course today</h2>
          <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
            The Odin Project, the Rust Book, or your own company's internal docs — start with what you're already reading.
          </p>
          <Link href="/login">
            <Button size="lg" className="mt-6">
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--color-border)] px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-xs text-[var(--color-text-tertiary)]">© 2026 Tecfac Forge</span>
          <div className="flex gap-5 text-xs text-[var(--color-text-tertiary)]">
            <Link href="#">Privacy</Link>
            <Link href="#">Terms</Link>
            <Link href="#">GitHub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
