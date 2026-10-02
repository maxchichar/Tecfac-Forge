"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import type { ProjectCourseOption } from "@/lib/projects/types";

export function CreateProjectForm({ courses, initialCourseId }: { courses: ProjectCourseOption[]; initialCourseId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(Boolean(initialCourseId));
  const [courseId, setCourseId] = useState(initialCourseId ?? courses[0]?.id ?? "");
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const course = courses.find((c) => c.id === courseId);
  if (!courses.length) return <div className="forge-empty"><h2>Start with a real source.</h2><p>Import a repository in your workspace, then choose what you want to build from it.</p><a className="forge-primary-link" href="/workspace">Open workspace <ArrowRight size={16} /></a></div>;
  return <div className="forge-create"><button className="forge-primary-link" onClick={() => setOpen(!open)} aria-expanded={open}><Plus size={16} />{open ? "Close project brief" : "Create a project"}</button>
    {open && <form className="forge-form" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setError("");
      const form = new FormData(e.currentTarget);
      try {
        const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId, sourceIds: sources, title: form.get("title"), outcome: form.get("outcome") }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.message ?? "Could not create the project.");
        router.push(`/project/${data.id}`); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Could not create the project."); } finally { setBusy(false); }
    }}>
      <div><span className="forge-eyebrow">YOUR PROJECT BRIEF</span><h2>What do you want to build?</h2><p>Choose a small, observable outcome. Forge adds five practical milestones; you decide the change.</p></div>
      <label>Source course<select value={courseId} onChange={(e) => { setCourseId(e.target.value); setSources([]); }}>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
      <label>Project name<input name="title" required minLength={5} maxLength={120} placeholder="Build a working example with this library" /></label>
      <label>Outcome and scope<textarea name="outcome" rows={3} required minLength={20} maxLength={2000} placeholder="Describe what someone should be able to do with your finished work, and one way to verify it." /></label>
      <fieldset><legend>Supporting source material · select 1–6</legend><div className="forge-source-picker">{course?.lessons.map((lesson) => <label key={lesson.id}><input type="checkbox" checked={sources.includes(lesson.id)} disabled={sources.length >= 6 && !sources.includes(lesson.id)} onChange={(e) => setSources(e.target.checked ? [...sources, lesson.id] : sources.filter((id) => id !== lesson.id))} /><span>{lesson.title}<small>{lesson.sourcePath ?? "Original path not recorded"}</small></span></label>)}</div></fieldset>
      <p className="forge-muted">This is an authored project workflow, not an automatically verified implementation plan. Choose sources that actually support your goal.</p>
      {error && <p role="alert" className="forge-error">{error}</p>}<button className="forge-primary-link" disabled={busy || !sources.length}>{busy ? "Creating…" : "Create project and milestones"}<ArrowRight size={16} /></button>
    </form>}
  </div>;
}
