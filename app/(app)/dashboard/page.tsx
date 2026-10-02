import { headers } from "next/headers";
import { LearningOverview } from "@/components/dashboard/LearningOverview";
import { getSessionState } from "@/lib/server/session";
import { getAuthorizedCourses } from "@/lib/server/courses";
import { getUserDashboardStats } from "@/lib/server/progress";
import { getLearningProjects } from "@/lib/server/projects/service";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getSessionState(await headers());
  if (session.kind !== "ok") return null;
  const [user, courses, stats, projects] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    getAuthorizedCourses(session.userId),
    getUserDashboardStats(session.userId),
    getLearningProjects(session.userId),
  ]);
  return <LearningOverview name={user?.name?.split(" ")[0] ?? ""} courses={courses} projects={projects} completedLessons={stats.completedLessonsCount} />;
}
