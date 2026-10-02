import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getSessionState } from "@/lib/server/session";
import { getLearningProjects } from "@/lib/server/projects/service";
import { ProjectWorkspace } from "@/components/projects/ProjectWorkspace";

// The existing URL segment now carries a globally unique project ID.
export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ milestone?: string }>;
}) {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") redirect("/login");
  const { slug } = await params;
  const [project] = await getLearningProjects(session.userId, slug);
  if (!project) notFound();
  const { milestone } = await searchParams;
  return <ProjectWorkspace project={project} initialMilestone={milestone} />;
}
