import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, Network } from "lucide-react";
import { getSessionState } from "@/lib/server/session";
import { getLearningProjects, getProjectCourseOptions, getProjectReviewQueue } from "@/lib/server/projects/service";
import { CreateProjectForm } from "@/components/projects/CreateProjectForm";
import { ReviewQueue } from "@/components/projects/ReviewQueue";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") redirect("/login");
  const [projects, courses, reviews, query] = await Promise.all([
    getLearningProjects(session.userId), getProjectCourseOptions(session.userId), getProjectReviewQueue(session.userId), searchParams,
  ]);
  return <div className="forge-project-page"><header className="forge-project-header"><div><span className="forge-eyebrow">LEARN BY BUILDING</span><h1>Your projects<span className="forge-heading-dot">.</span></h1><p>Turn source material into practical work. Investigate, build, verify, and explain.</p></div><Link className="forge-secondary-link" href="/roadmap"><Network size={16} /> Learning web</Link></header>
    <CreateProjectForm courses={courses} initialCourseId={courses.some((c) => c.id === query.course) ? query.course : undefined} />
    <div className="forge-project-cards">{projects.map((p) => { const recorded = p.milestones.filter((m) => ["self_checked", "accepted"].includes(m.status)).length; return <Link className="forge-project-card" href={`/project/${p.id}`} key={p.id}><span className="forge-eyebrow">{p.course.title}</span><h2>{p.title}<ArrowUpRight size={18} /></h2><p>{p.description}</p><div className="forge-project-progress"><span>{recorded}/{p.milestones.length} milestones recorded</span><div><i style={{ width: `${p.milestones.length ? recorded / p.milestones.length * 100 : 0}%` }} /></div></div></Link>; })}</div>
    {!projects.length && courses.length > 0 && <p className="forge-muted mt-8">No projects yet. Choose a source and define your first outcome above.</p>}
    <ReviewQueue items={reviews} />
    {projects.length >= 50 && <p className="forge-footnote">Showing your 50 most recent projects.</p>}
  </div>;
}
