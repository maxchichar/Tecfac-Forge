"use client";
import { useId, useState, useEffect } from "react";
export function NotesPanel({ lessonId, initialValue = "", initialBookmarked = false }: { lessonId: string; initialValue?: string; initialBookmarked?: boolean }) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(initialValue);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const id = useId();
  useEffect(() => {
    if (value === saved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [value, saved]);
  async function save(input: { content?: string; bookmarked?: boolean }) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/lessons/${lessonId}/library`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error("Save failed. Your draft is still here; please try again.");
      if (input.content !== undefined) setSaved(input.content);
      if (input.bookmarked !== undefined) setBookmarked(input.bookmarked);
      setMessage(input.content !== undefined ? "Note saved." : input.bookmarked ? "Source bookmarked." : "Bookmark removed.");
    } catch { setError("Save failed. Your draft is still here; please try again."); }
    finally { setBusy(false); }
  }
  return <section id="personal-notes" className="forge-scratchpad">
    <div className="flex items-center justify-between gap-4"><label htmlFor={id}>Your learning notes</label><button className="forge-secondary-link" disabled={busy} aria-pressed={bookmarked} onClick={() => save({ bookmarked: !bookmarked })}>{bookmarked ? "Bookmarked" : "Bookmark source"}</button></div>
    <p id={`${id}-hint`}>Explain the idea in your own words. Notes are private to your account.</p>
    <textarea id={id} aria-describedby={`${id}-hint`} value={value} maxLength={20_000} onChange={e => setValue(e.target.value)} placeholder="What did you learn? What would you try next?" rows={6} />
    <div className="flex items-center gap-4 mt-3"><button className="forge-primary-link" disabled={busy || value === saved} onClick={() => save({ content: value })}>{busy ? "Saving…" : "Save note"}</button><span className="text-xs text-[var(--color-text-tertiary)]" role="status">{value !== saved ? "Unsaved changes — save before leaving" : message}</span></div>
    {error && <p role="alert">{error}</p>}
  </section>;
}
