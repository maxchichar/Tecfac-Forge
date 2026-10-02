import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Network } from "lucide-react";
import type { ProjectView } from "@/lib/projects/types";
import { STATUS_LABELS } from "@/lib/projects/types";
import type { CourseCardData } from "@/components/course/CourseCard";

export function LearningOverview({ name, courses, projects, completedLessons }: { name: string; courses: CourseCardData[]; projects: ProjectView[]; completedLessons: number }) {
  const active = projects.find((p) => p.milestones.some((m) => m.status === "needs_revision" || m.status === "available")) ?? projects[0];
  const next = active?.milestones.find((m) => m.status === "needs_revision") ?? active?.milestones.find((m) => m.status === "available") ?? active?.milestones.find((m) => m.status === "submitted");
  const reviewed = projects.flatMap((p) => p.milestones).filter((m) => m.status === "accepted").length;
  return <div className="forge-overview">
    <header className="forge-project-header"><div><span className="forge-eyebrow">Your learning workspace</span><h1>{name ? `Welcome back, ${name}.` : "Make something you understand."}</h1><p>A little source reading. A meaningful change. Evidence that it works.</p></div><Link href="/roadmap" className="forge-secondary-link"><Network size={16} /> Learning web</Link></header>
    <div className="forge-overview-stats"><div><strong>{courses.length}</strong><span>courses in your library</span></div><div><strong>{completedLessons}</strong><span>lessons marked read</span></div><div><strong>{reviewed}</strong><span>milestones peer reviewed</span></div></div>
    <div className="forge-overview-grid"><section className="forge-continue-panel"><span className="forge-eyebrow">{active ? "Continue building" : "Your first step"}</span><h2>{active?.title ?? "Start with something you want to understand."}</h2><p>{active?.description ?? "Import a repository’s Markdown, explore its lessons, then choose a practical outcome to work toward."}</p>
      {next && <div className="forge-next-milestone"><span className="forge-step-index">{String(next.order + 1).padStart(2, "0")}</span><div><small>{STATUS_LABELS[next.status]}</small><h3>{next.title}</h3></div></div>}
      <Link className="forge-primary-link" href={active ? `/project/${active.id}${next ? `?milestone=${next.id}` : ""}` : courses.length ? "/projects" : "/workspace"}>{active ? next ? "Open milestone" : "Review your project" : courses.length ? "Create a learning project" : "Import your first source"}<ArrowRight size={17} /></Link>
      {active && <Link href="/projects" className="forge-all-projects">All projects <ArrowUpRight size={14} /></Link>}
    </section><aside className="forge-loop-panel"><span className="forge-eyebrow">Learn through the work</span><ol><li><span>01</span><div><h3>Find the reference</h3><p>Connect your idea to a specific source.</p></div></li><li><span>02</span><div><h3>Make it work</h3><p>Build, change, or investigate something real.</p></div></li><li><span>03</span><div><h3>Show the evidence</h3><p>Explain your decisions and what you checked.</p></div></li></ol><p className="forge-footnote">Reading progress and project evidence are recorded separately. Reading alone does not demonstrate mastery.</p></aside></div>
    <section className="forge-source-section"><div className="forge-section-row"><h2>Your source library</h2><Link href="/workspace">View library <ArrowUpRight size={15} /></Link></div>{courses.length ? courses.slice(0, 5).map((c) => <Link className="forge-source-row" key={c.id} href={`/course/${c.slug}`}><BookOpen size={19} /><div><h3>{c.title}</h3><p>{c.repository || c.description}</p></div><span>{c.completion}% read</span><ArrowUpRight size={16} /></Link>) : <div className="forge-source-empty"><BookOpen size={23} /><div><h3>No sources yet</h3><p>Your imported courses will appear here. Start with a public GitHub repository.</p></div></div>}</section>
  </div>;
}
