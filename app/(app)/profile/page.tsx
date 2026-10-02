import Link from "next/link";
import { headers } from "next/headers";
import { UserRound } from "lucide-react";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedCourses } from "@/lib/server/courses";
import { prisma } from "@/lib/prisma";
import { ProgressRing } from "@/components/course/ProgressRing";

export default async function ProfilePage() {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") return null;
  const [user, courses] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } }),
    getAuthorizedCourses(session.userId),
  ]);
  return <div className="mx-auto max-w-3xl"><header className="forge-project-header"><div><span className="forge-eyebrow">Your profile</span><h1>{user?.name ?? "Learner"}</h1><p>{user?.email}</p></div><UserRound size={32} /></header><section className="rounded-lg border border-[var(--color-border)] p-6"><h2 className="text-lg font-medium">Reading progress</h2><p className="forge-footnote">Lessons marked as read. This is separate from demonstrated mastery.</p>{courses.length ? courses.map((course) => <Link className="forge-source-row" key={course.id} href={`/course/${course.slug}`}><ProgressRing value={course.completion} size={52} strokeWidth={4} /><div><h3>{course.title}</h3><p>{course.repository}</p></div></Link>) : <p className="forge-muted">No courses yet. <Link href="/workspace" className="underline">Start with a source.</Link></p>}</section></div>;
}
