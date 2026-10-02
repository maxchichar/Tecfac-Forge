"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Focus, List, Minus, Network, Plus, Search } from "lucide-react";
import { buildProjectGraph } from "@/lib/projects/graph";
import { STATUS_LABELS, type ProjectView } from "@/lib/projects/types";

const COLORS = { project: "#E2E8F0", milestone: "#B5C2D3", source: "#94A3B8", concept: "#94A3B8" };
function labelLines(label: string): string[] {
  const lines: string[] = [""];
  for (const word of label.split(" ")) {
    const last = lines.length - 1;
    if (lines[last] && lines[last].length + word.length > 20) lines.push(word);
    else lines[last] += `${lines[last] ? " " : ""}${word}`;
  }
  if (lines.length > 2) return [lines[0], `${lines[1].slice(0, 18)}…`];
  return lines.map((line) => line.length > 22 ? `${line.slice(0, 20)}…` : line);
}
const SYMBOLS = { available: "○", locked: "◇", needs_revision: "!", submitted: "◷", self_checked: "✓", accepted: "✓✓" };

export function ProjectNetwork({ projects }: { projects: ProjectView[] }) {
  const [filter, setFilter] = useState(projects[0]?.id ?? "all");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [list, setList] = useState(false);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = useMemo(() => filter === "all" ? projects.slice(0, 6) : projects.filter((p) => p.id === filter), [projects, filter]);
  const graph = useMemo(() => buildProjectGraph(visible), [visible]);
  const width = visible.length > 1 ? 2200 : 1100;
  const height = Math.max(1, Math.ceil(visible.length / 2)) * 1050;
  const active = graph.nodes.find((n) => n.id === selected);
  const connections = graph.edges.filter((e) => e.from === selected || e.to === selected);
  const neighbors = new Set(connections.flatMap((e) => [e.from, e.to]));
  const matches = search ? graph.nodes.filter((n) => n.label.toLowerCase().includes(search.toLowerCase())) : [];
  function reset() { setCamera({ x: 0, y: 0, zoom: 1 }); }
  function focus(id: string) {
    setSelected(id);
    const node = graph.nodes.find((n) => n.id === id);
    if (node) setCamera({ x: node.x - width / 2, y: node.y - height / 2, zoom: Math.max(1, visible.length > 1 ? 1.8 : 1) });
  }
  function nextStep() {
    setSearch("");
    const next = graph.nodes.find((n) => n.status === "needs_revision") ?? graph.nodes.find((n) => n.status === "available") ?? graph.nodes.find((n) => n.status === "submitted");
    if (next) focus(next.id);
  }
  return (
    <section className="forge-network" aria-label="Project learning network">
      <div className="network-toolbar">
        <label className="network-search"><Search size={15} /><span className="sr-only">Find a node</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a milestone or concept…" /></label>
        <label><span className="sr-only">Project filter</span><select value={filter} onChange={(e) => { setFilter(e.target.value); setSelected(null); reset(); }}>
          <option value="all">Connected projects (up to 6)</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select></label>
        <button className="network-next-step" onClick={nextStep}><Focus size={15} /> My next step</button>
        <button onClick={() => setList(!list)} aria-pressed={list}>{list ? <Network size={15} /> : <List size={15} />}{list ? "Web view" : "List view"}</button>
      </div>
      {search && <div className="network-results" aria-live="polite">{matches.length ? matches.slice(0, 12).map((n) => <button key={n.id} onClick={() => focus(n.id)}>{n.label} <span>{n.kind}</span></button>) : <p>No matching nodes.</p>}</div>}
      <div className="network-body">
        <div className="network-stage">
          <div className="network-caption"><span className="network-live-dot" /> YOUR LEARNING WEB <span>{graph.nodes.length} nodes · {graph.edges.length} connections</span></div>
          {list ? <div className="network-list">{graph.nodes.map((node) => <button key={node.id} onClick={() => setSelected(node.id)} aria-pressed={selected === node.id}>
            <span style={{ color: COLORS[node.kind] }}>{node.kind}</span><strong>{node.label}</strong>{node.status && <small>{SYMBOLS[node.status]} {STATUS_LABELS[node.status]}</small>}
          </button>)}</div> : <svg ref={svgRef} className="network-svg" viewBox={`${width / 2 + camera.x - width / camera.zoom / 2} ${height / 2 + camera.y - height / camera.zoom / 2} ${width / camera.zoom} ${height / camera.zoom}`} aria-label="Connected projects, milestones, sources and concepts"
            onPointerDown={(e) => { if ((e.target as Element).closest("[data-node]")) return; drag.current = { x: e.clientX, y: e.clientY, cx: camera.x, cy: camera.y }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { const d = drag.current; if (!d) return; const box = e.currentTarget.getBoundingClientRect(); const scale = Math.max(width / camera.zoom / box.width, height / camera.zoom / box.height); setCamera((c) => ({ ...c, x: d.cx - (e.clientX - d.x) * scale, y: d.cy - (e.clientY - d.y) * scale })); }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {graph.nodes.filter((n) => n.kind === "project").map((n) => <g key={n.id} aria-hidden="true">{[215, 355, 460].map((r) => <circle key={r} cx={n.x} cy={n.y} r={r} fill="none" stroke="var(--color-border)" strokeDasharray="3 9" opacity=".6" />)}</g>)}
            {graph.edges.map((edge, i) => {
              const from = graph.nodes.find((n) => n.id === edge.from)!; const to = graph.nodes.find((n) => n.id === edge.to)!;
              const highlighted = edge.from === selected || edge.to === selected;
              return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={highlighted ? "var(--color-accent-solid)" : "var(--color-border-strong)"} strokeWidth={highlighted ? 2.5 : 1.2} opacity={active && !highlighted ? .12 : .65} strokeDasharray={edge.label === "precedes" ? "6 5" : undefined}><title>{from.label} → {to.label}: {edge.label}. {edge.reason}</title></line>;
            })}
            {graph.nodes.map((node) => {
              const radius = node.kind === "project" ? 44 : node.kind === "milestone" ? 23 : node.kind === "source" ? 12 : 8;
              const muted = (active && !neighbors.has(node.id) && selected !== node.id) || (search && !node.label.toLowerCase().includes(search.toLowerCase()));
              return <g key={node.id} data-node="true" role="button" tabIndex={0} aria-label={`${node.kind}: ${node.label}${node.status ? `, ${STATUS_LABELS[node.status]}` : ""}`} aria-pressed={selected === node.id}
                onClick={() => setSelected(node.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(node.id); } }} className="network-node" opacity={muted ? .22 : 1}>
                <title>{node.label}</title><circle cx={node.x} cy={node.y} r={Math.max(36, radius + 10)} fill="transparent" />
                {selected === node.id && <circle cx={node.x} cy={node.y} r={radius + 9} fill="none" stroke="var(--color-accent-solid)" opacity=".8" />}
                <circle cx={node.x} cy={node.y} r={radius} fill={"var(--color-surface)"} stroke={selected === node.id ? "var(--color-accent-solid)" : COLORS[node.kind]} strokeWidth={node.kind === "project" ? 2 : 1.5} />
                <text x={node.x} y={node.y + 5} textAnchor="middle" fill={COLORS[node.kind]} fontSize={node.kind === "project" ? 21 : 14}>{node.kind === "project" ? "⌘" : node.status ? SYMBOLS[node.status] : ""}</text>
                <text className="network-node-label" x={node.x} y={node.y + radius + 28} textAnchor="middle" fill="var(--color-text-primary)" fontSize={node.kind === "project" ? 24 : 20} fontWeight={node.kind === "project" ? 600 : 400}>{labelLines(node.label).map((line, i) => <tspan key={i} x={node.x} dy={i ? "1.15em" : 0}>{line}</tspan>)}</text>
                {node.status && <text className="network-node-status" x={node.x} y={node.y + radius + 78} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="16">{STATUS_LABELS[node.status]}</text>}
              </g>;
            })}
          </svg>}
          <div className="network-footer"><div className="network-legend">{Object.entries(COLORS).map(([kind, color]) => <span key={kind}><i style={{ background: color }} />{kind}</span>)}</div>
            <div className="network-zoom"><button aria-label="Zoom out" onClick={() => setCamera((c) => ({ ...c, zoom: Math.max(.5, c.zoom / 1.25) }))}><Minus size={16} /></button><button onClick={reset} aria-label="Reset network view">{Math.round(camera.zoom * 100)}%</button><button aria-label="Zoom in" onClick={() => setCamera((c) => ({ ...c, zoom: Math.min(4, c.zoom * 1.25) }))}><Plus size={16} /></button></div>
          </div>
        </div>
        <aside className="network-inspector" aria-live="polite">
          {active ? <><span className="forge-eyebrow" style={{ color: COLORS[active.kind] }}>{active.kind}</span><h2>{active.label}</h2>{active.status && <p className="forge-status">{SYMBOLS[active.status]} {STATUS_LABELS[active.status]}</p>}<p className="network-description">{active.description}</p>
            {active.href && <Link className="forge-primary-link" href={active.href}>Open {active.kind === "milestone" ? "milestone" : "project"}<ArrowUpRight size={16} /></Link>}
            <h3>How it connects</h3>{connections.map((edge, i) => { const other = graph.nodes.find((n) => n.id === (edge.from === selected ? edge.to : edge.from))!; return <button className="network-connection" key={i} onClick={() => focus(other.id)}><span>{edge.from === selected ? `→ ${edge.label}` : `← ${edge.label}`}</span><strong>{other.label}</strong><small>{edge.reason}</small></button>; })}
          </> : <><span className="forge-eyebrow">BUILD YOUR UNDERSTANDING</span><h2>Follow the connections.</h2><p className="network-description">Your project sits at the center. Milestones form the inner web; source material and concepts connect around it.</p><p className="network-description">Select any node to see what it means and why it connects. Drag the canvas to explore, or use the list view.</p><div className="network-note">Self-checked work unlocks the next step. Peer review is recorded separately. Neither automatically awards concept mastery.</div></>}
        </aside>
      </div>
    </section>
  );
}
