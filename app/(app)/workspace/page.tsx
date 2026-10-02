import { headers } from "next/headers";
import { FolderGit2, ArrowRight } from "lucide-react";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedCourses } from "@/lib/server/courses";
import { CourseCard } from "@/components/course/CourseCard";
import { Button } from "@/components/ui/Button";
import { ImportCourseDialog } from "@/components/workspace/ImportCourseDialog";

export default async function WorkspacePage() {
  const session = await getSessionState(await headers());
  const courses = session.kind === "ok" ? await getAuthorizedCourses(session.userId) : [];
  return <div className="forge-overview">
    <header className="forge-project-header"><div><span className="forge-eyebrow">Start with the source</span><h1>Your source library.</h1><p>The reference material behind your lessons and projects.</p></div><ImportCourseDialog><Button><FolderGit2 size={17} /> Import from GitHub</Button></ImportCourseDialog></header>
    <section className="forge-import-guide"><FolderGit2 size={28} /><div><h2>A repository is a place to begin.</h2><p>Import Markdown from a public GitHub repository, read the lessons, and connect the source to a project you can build.</p><p className="forge-footnote">GitHub Markdown import is available. ZIP uploads and documentation-site imports are not available yet.</p></div></section>
    <div className="forge-section-row"><h2>{courses.length} {courses.length === 1 ? "course" : "courses"}</h2><span>Reading progress, at a glance</span></div>
    {courses.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div> : <div className="forge-empty"><BookPlaceholder /><h2>Your library starts here.</h2><p>Choose a repository you want to understand. Forge will bring its Markdown into your workspace.</p><ImportCourseDialog><Button>Import your first source <ArrowRight size={16} /></Button></ImportCourseDialog></div>}
  </div>;
}
function BookPlaceholder() { return <FolderGit2 size={32} aria-hidden="true" />; }
