import Link from "next/link";
import { headers } from "next/headers";
import { getSessionState } from "@/lib/server/session";
import { getPersonalBookmarks } from "@/lib/server/library";
export default async function BookmarksPage() {
 const session = await getSessionState(await headers());
 if (session.kind !== "ok") return null;
 const items = await getPersonalBookmarks(session.userId);
 return <div className="mx-auto max-w-3xl"><span className="forge-eyebrow">Personal library</span><h1 className="text-3xl font-semibold mt-2">Your saved sources</h1><p className="mt-2 text-[var(--color-text-secondary)]">Return to the references you want to build with.</p>
 {items.length === 0 ? <div className="forge-empty mt-8"><h2>Nothing saved yet.</h2><p>Save a note or bookmark while reading a source to find it here.</p><Link className="forge-primary-link" href="/workspace">Explore your sources</Link></div> : <div className="mt-8 space-y-4">{items.map(item => item.lesson && <article key={item.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"><Link className="font-medium underline underline-offset-4" href={`/lesson/${item.lesson.slug}#personal-notes`}>{item.lesson.title}</Link><p className="text-xs mt-1 text-[var(--color-text-tertiary)]">{item.lesson.module.course.title}</p></article>)}</div>}
 </div>;
}
