import Link from "next/link";
import { headers } from "next/headers";
import { getSessionState } from "@/lib/server/session";
import { searchLibrary } from "@/lib/server/library";
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") return null;
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const results = await searchLibrary(session.userId, q);
  return <div className="mx-auto max-w-3xl"><span className="forge-eyebrow">Find your next reference</span><h1 className="text-3xl font-semibold mt-2">Search your workspace</h1><p className="mt-2 text-[var(--color-text-secondary)]">Search imported sources, projects, and your private notes.</p>
    <form action="/search" className="flex gap-3 mt-6"><input type="search" name="q" defaultValue={q} minLength={2} maxLength={120} required aria-label="Search sources, projects, and notes" placeholder="Search by topic or phrase…" className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3" /><button className="forge-secondary-link" type="submit">Search</button></form>
    {q.length < 2 ? <p className="mt-8 text-[var(--color-text-tertiary)]">Enter at least two characters to search.</p> : <><p className="mt-8 text-sm" role="status">{results.length ? `${results.length} results for “${q}” (up to 20 per category)` : `No results for “${q}”. Try a different phrase.`}</p><div className="space-y-2 mt-4">{results.map(result => <Link key={result.type + result.id} className="block rounded-xl border border-[var(--color-border)] p-4 hover:bg-[var(--color-surface)]" href={result.href}><span className="forge-eyebrow">{result.type}</span><p className="mt-1">{result.title}</p></Link>)}</div></>}
  </div>;
}
