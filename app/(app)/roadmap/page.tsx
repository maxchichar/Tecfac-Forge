import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowUpRight, Network } from "lucide-react";
import { getSessionState } from "@/lib/server/session";
import { getLearningProjects } from "@/lib/server/projects/service";
import { ProjectNetwork } from "@/components/roadmap/ProjectNetwork";

export default async function RoadmapPage() {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") redirect("/login");
  const projects = await getLearningProjects(session.userId);
  return <div className="forge-roadmap-page">
    <header className="forge-project-header"><div><span className="forge-eyebrow">FROM KNOWLEDGE TO SOMETHING YOU BUILT</span><h1>Your learning web<span className="forge-heading-dot">.</span></h1><p>Projects, milestones, and the ideas that connect them. Pick a thread and build.</p></div><Link className="forge-secondary-link" href="/projects">Your projects <ArrowUpRight size={16} /></Link></header>
    {projects.length ? <ProjectNetwork projects={projects} /> : <div className="forge-empty"><Network size={40} /><h2>Your web starts with a project.</h2><p>Create a project from an imported course. Its milestones and selected sources will become the first connections in your roadmap.</p><Link className="forge-primary-link" href="/projects">Create your first project <ArrowUpRight size={16} /></Link></div>}
    <p className="forge-footnote">Solid connections show project and source associations. Dashed connections show milestone order. Concept links come from source extraction and are not verified prerequisites. Showing your 50 most recent projects.</p>
  </div>;
}
