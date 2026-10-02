import type { MilestoneStatus, ProjectView } from "./types";

export interface RoadmapNode {
  id: string;
  kind: "project" | "milestone" | "source" | "concept";
  label: string;
  description: string;
  x: number;
  y: number;
  href?: string;
  status?: MilestoneStatus;
  projectId: string;
}
export interface RoadmapEdge { from: string; to: string; label: string; reason: string }

/** Connections express stored associations and authored sequence, not inferred prerequisites. */
export function buildProjectGraph(projects: ProjectView[]) {
  const nodes: RoadmapNode[] = [];
  const edges: RoadmapEdge[] = [];
  const ids = new Set<string>();
  function add(node: RoadmapNode) { if (!ids.has(node.id)) { nodes.push(node); ids.add(node.id); } }
  projects.forEach((project, index) => {
    const cx = 550 + (index % 2) * 1100;
    const cy = 520 + Math.floor(index / 2) * 1050;
    const centerId = `project:${project.id}`;
    add({ id: centerId, kind: "project", label: project.title, description: project.description, x: cx, y: cy, href: `/project/${project.id}`, projectId: project.id });
    project.milestones.forEach((m, i) => {
      const angle = -Math.PI / 2 + (i / Math.max(project.milestones.length, 1)) * Math.PI * 2;
      const id = `milestone:${m.id}`;
      add({ id, kind: "milestone", label: m.title, description: m.brief, x: cx + Math.cos(angle) * 215, y: cy + Math.sin(angle) * 215,
        href: `/project/${project.id}?milestone=${encodeURIComponent(m.id)}`, status: m.status, projectId: project.id });
      edges.push({ from: centerId, to: id, label: "contains", reason: "This milestone is part of the project's authored workflow." });
      if (i > 0) edges.push({ from: `milestone:${project.milestones[i - 1].id}`, to: id, label: "precedes", reason: "The earlier milestone must be self-checked or peer reviewed before you submit the next one." });
      m.sources.forEach((source) => edges.push({ from: `source:${source.id}`, to: id, label: "supports", reason: "You selected this source material for the project. Relevance should be checked as you work." }));
    });
    const sources = [...new Map(project.milestones.flatMap((m) => m.sources).map((s) => [s.id, s])).values()];
    sources.forEach((s, i) => {
      const angle = -Math.PI / 3 + i / Math.max(sources.length, 1) * Math.PI * 2;
      add({ id: `source:${s.id}`, kind: "source", label: s.title, description: s.path ?? "Imported source; original path was not recorded.",
        x: cx + Math.cos(angle) * 355, y: cy + Math.sin(angle) * 355, projectId: project.id,
        href: `/project/${project.id}` });
    });
    const concepts = [...new Map(sources.flatMap((s) => s.concepts).map((c) => [c.id, c])).values()].slice(0, 16);
    concepts.forEach((c, i) => {
      const angle = -Math.PI / 2 + i / Math.max(concepts.length, 1) * Math.PI * 2;
      add({ id: `concept:${c.id}`, kind: "concept", label: c.name, description: c.description,
        x: cx + Math.cos(angle) * 460, y: cy + Math.sin(angle) * 460, projectId: project.id });
      sources.filter((s) => s.concepts.some((concept) => concept.id === c.id)).forEach((s) => {
        edges.push({ from: `concept:${c.id}`, to: `source:${s.id}`, label: "extracted from", reason: "Concept extraction linked this concept to this source. This is an analysis result, not a verified prerequisite." });
      });
    });
  });
  const uniqueEdges = [...new Map(edges.map((e) => [`${e.from}:${e.to}:${e.label}`, e])).values()];
  return { nodes, edges: uniqueEdges.filter((e) => ids.has(e.from) && ids.has(e.to)) };
}
