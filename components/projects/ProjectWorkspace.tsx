"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, Lock, Network } from "lucide-react";
import { STATUS_LABELS, type ProjectView, type MilestoneView } from "@/lib/projects/types";
import { AIChatPanel } from "@/components/lesson/AIChatPanel";

export function ProjectWorkspace({ project, initialMilestone }: { project: ProjectView; initialMilestone?: string }) {
  const [selected, setSelected] = useState(initialMilestone ?? project.milestones.find((m) => ["available", "needs_revision", "submitted"].includes(m.status))?.id ?? project.milestones[0]?.id);
  const milestone = project.milestones.find((m) => m.id === selected) ?? project.milestones[0];
  const recorded = project.milestones.filter((m) => m.status === "accepted" || m.status === "self_checked").length;
  const reviewed = project.milestones.filter((m) => m.status === "accepted").length;
  return <div className="forge-project-page"><Link href="/projects" className="forge-back"><ArrowLeft size={14} /> Projects</Link>
    <header className="forge-project-header"><div><span className="forge-eyebrow">BUILD WITH {project.course.title}</span><h1>{project.title}</h1><p>{project.description}</p></div><Link className="forge-secondary-link" href="/roadmap"><Network size={16} /> View learning web</Link></header>
    <div className="forge-project-progress"><span>{recorded}/{project.milestones.length} milestones self-checked or reviewed</span><span>{reviewed} peer reviewed</span><div><i style={{ width: `${project.milestones.length ? recorded / project.milestones.length * 100 : 0}%` }} /></div></div>
    {!milestone ? <div className="forge-empty"><h2>This project has no learning milestones yet.</h2><p>Create a new project from its course to use the practical workflow.</p><Link href={`/projects?course=${project.course.id}`} className="forge-primary-link">Create a learning project</Link></div> : <div className="forge-workspace-grid">
      <nav aria-label="Project milestones" className="forge-milestones">{project.milestones.map((m, i) => <button key={m.id} aria-current={m.id === milestone.id ? "step" : undefined} onClick={() => setSelected(m.id)}><span className="milestone-number">{m.status === "locked" ? <Lock size={13} /> : m.status === "accepted" ? <Check size={15} /> : `0${i + 1}`}</span><span><strong>{m.title}</strong><small>{STATUS_LABELS[m.status]}</small></span></button>)}<p>Milestones unlock after self-check or peer review. This records project progress, not concept mastery.</p></nav>
      <MilestoneEditor key={milestone.id} milestone={milestone} project={project} />
    </div>}
  </div>;
}

function MilestoneEditor({ milestone, project }: { milestone: MilestoneView; project: ProjectView }) {
  const router = useRouter();
  const latest = milestone.submissions[0];
  const [artifact, setArtifact] = useState(latest?.artifact ?? "");
  const [explanation, setExplanation] = useState(latest?.explanation ?? "");
  const [verification, setVerification] = useState(latest?.verification ?? "");
  const [evidence, setEvidence] = useState(milestone.criteria.map((_, i) => latest?.criterionEvidence[i] ?? ""));
  const [selfChecked, setSelfChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"work" | "sources" | "tutor">("work");
  const blocked = milestone.status === "locked";
  return <section className="forge-milestone-panel"><div className="forge-milestone-heading"><span className="forge-eyebrow">MILESTONE {milestone.order + 1} / {project.milestones.length}</span><span className="forge-status">{STATUS_LABELS[milestone.status]}</span><h2>{milestone.title}</h2><p>{milestone.brief}</p></div>
    <div className="forge-tabbar" role="tablist" aria-label="Milestone resources">{(["work", "sources", "tutor"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} aria-controls={`milestone-${t}`} id={`tab-${t}`} onClick={() => setTab(t)}>{t === "work" ? "Your work" : t === "sources" ? "Source material" : "Ask the tutor"}</button>)}</div>
    {tab === "work" && <div role="tabpanel" id="milestone-work" aria-labelledby="tab-work"><form className="forge-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError(""); setMessage("");
      try {
        const res = await fetch(`/api/projects/${project.id}/submissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ milestoneId: milestone.id, artifact, explanation, verification, criterionEvidence: evidence, selfChecked }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.message ?? "Submission failed.");
        setMessage(data.feedback); setSelfChecked(false); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Submission failed. Your work is still in the form."); } finally { setBusy(false); }
    }}>
      {blocked && <p className="network-note">Explore this brief now. Finish reviewing or self-checking the earlier milestones before submitting here.</p>}
      <label>Your artifact<textarea rows={7} maxLength={16000} value={artifact} onChange={(e) => setArtifact(e.target.value)} placeholder="Paste a relevant patch, code sample, investigation notes, or a link to your work." spellCheck={false} className="forge-code-input" /></label>
      <label>Explain your decisions<textarea rows={3} maxLength={6000} value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="Why does this approach fit? Cite a source path or section and explain a tradeoff." /></label>
      <label>Verification evidence<textarea rows={3} maxLength={6000} value={verification} onChange={(e) => setVerification(e.target.value)} placeholder="What did you check? Record the procedure, expected result, and actual result. For research milestones, describe how you checked your claims." /></label>
      <fieldset><legend>Acceptance criteria</legend><p className="forge-muted">Show the evidence for each criterion. Text is checked for completeness; correctness requires your inspection or peer review.</p>{milestone.criteria.map((criterion, i) => <label key={criterion} className="forge-criterion"><span>{i + 1}. {criterion}</span><textarea rows={2} maxLength={2000} value={evidence[i]} onChange={(e) => setEvidence(evidence.map((v, index) => index === i ? e.target.value : v))} placeholder="Point to the specific evidence in your work." /></label>)}</fieldset>
      <label className="forge-checkbox"><input type="checkbox" checked={selfChecked} onChange={(e) => setSelfChecked(e.target.checked)} /><span>I inspected my work against every criterion. Record a self-check and unlock the next milestone. This is not independent verification.</span></label>
      {error && <p role="alert" className="forge-error">{error}</p>}{message && <p role="status" className="network-note whitespace-pre-line">{message}</p>}
      <button disabled={busy || blocked} className="forge-primary-link">{busy ? "Saving…" : latest ? "Submit a revision" : "Submit evidence"}<ArrowUpRight size={16} /></button><p className="forge-muted">Work runs in your local environment. Do not include secrets or credentials. Each submission saves a new attempt.</p>
    </form>
    {milestone.submissions.length > 0 && <div className="forge-history"><h3>Recent attempts</h3>{milestone.submissions.map((s) => <details key={s.id} open={s.id === latest?.id}><summary>{STATUS_LABELS[s.status]} · {new Date(s.createdAt).toLocaleString()}</summary><p className="whitespace-pre-line">{s.feedback}</p><pre>{s.artifact}</pre><p>{s.explanation}</p><p>{s.verification}</p></details>)}</div>}
    </div>}
    {tab === "sources" && <div id="milestone-sources" role="tabpanel" aria-labelledby="tab-sources" className="forge-source-material"><p className="forge-muted">Selected references for this project. Excerpts are limited to the first 6,000 characters; follow the original source when available.</p>{milestone.sources.map((s) => <article key={s.id}><h3><BookOpen size={16} />{s.title}</h3><p>{s.path ?? "Original repository path was not recorded for this import."}</p>{s.url && /^https:\/\/github\.com\//.test(s.url) && <a href={s.url} target="_blank" rel="noreferrer" className="forge-back">View original source <ArrowUpRight size={14} /></a>}<pre>{s.excerpt}</pre>{s.concepts.length > 0 && <div className="forge-concept-tags">{s.concepts.map((c) => <span key={c.id}>{c.name}</span>)}</div>}</article>)}</div>}
    {tab === "tutor" && <div id="milestone-tutor" role="tabpanel" aria-labelledby="tab-tutor" className="h-[560px]"><AIChatPanel lessonId={milestone.sources[0]?.id ?? ""} lessonTitle={milestone.title} courseTitle={project.course.title} projectId={project.id} milestoneId={milestone.id} /></div>}
  </section>;
}
