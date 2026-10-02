"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReviewItem {
  id: string; projectId: string; projectTitle: string; milestoneTitle: string; learner: string;
  criteria: string[]; artifact: string; explanation: string; verification: string; criterionEvidence: string[];
}
export function ReviewQueue({ items }: { items: ReviewItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!items.length) return null;
  return <section className="forge-review-queue"><span className="forge-eyebrow">WORKSPACE REVIEW</span><h2>Work awaiting your review</h2><p className="forge-muted">Inspect the artifact and verification evidence before accepting. Learners cannot independently review their own work.</p>{items.map((item) => <details key={item.id}><summary>{item.projectTitle} / {item.milestoneTitle} · {item.learner}</summary><pre>{item.artifact}</pre><p>{item.explanation}</p><p>{item.verification}</p><ol>{item.criteria.map((c, i) => <li key={c}><strong>{c}</strong><p>{item.criterionEvidence[i] || "No evidence supplied."}</p></li>)}</ol><form className="forge-form" onSubmit={async (e) => {
    e.preventDefault(); setBusy(true); setError(""); const form = new FormData(e.currentTarget);
    try { const res = await fetch(`/api/projects/${item.projectId}/reviews`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: item.id, status: form.get("status"), feedback: form.get("feedback") }) }); const data = await res.json(); if (!res.ok) throw new Error(data.message); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Review could not be saved."); } finally { setBusy(false); }
  }}><label>Review decision<select name="status"><option value="needs_revision">Needs revision</option><option value="accepted">Accept after independent inspection</option></select></label><label>Feedback<textarea name="feedback" required minLength={20} maxLength={4000} placeholder="Explain what you verified, or what needs to change." /></label><button className="forge-primary-link" disabled={busy}>Save review</button></form></details>)}{error && <p role="alert" className="forge-error">{error}</p>}</section>;
}
