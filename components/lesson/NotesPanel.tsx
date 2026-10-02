"use client";
import { useId, useState } from "react";

export function NotesPanel({ initialValue = "" }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);
  const id = useId();
  return <div className="forge-scratchpad"><label htmlFor={id}>Lesson scratchpad</label><p id={`${id}-hint`}>Draft only. Copy anything you want to keep before leaving this page.</p><textarea id={id} aria-describedby={`${id}-hint`} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Explain the idea in your own words. What would you try next?" rows={5} /></div>;
}
