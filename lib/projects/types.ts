export type MilestoneStatus = "available" | "locked" | "needs_revision" | "submitted" | "self_checked" | "accepted";
export const STATUS_LABELS: Record<MilestoneStatus, string> = {
  available: "Ready to start", locked: "Upcoming", needs_revision: "Needs revision",
  submitted: "Awaiting review", self_checked: "Self-checked", accepted: "Peer reviewed",
};

export interface ProjectSource {
  id: string;
  title: string;
  path: string | null;
  url: string | null;
  excerpt: string;
  concepts: { id: string; name: string; description: string }[];
}

export interface SubmissionView {
  id: string;
  artifact: string;
  explanation: string;
  verification: string;
  criterionEvidence: string[];
  status: "needs_revision" | "submitted" | "self_checked" | "accepted";
  feedback: string;
  createdAt: string;
  reviewedAt: string | null;
}

export interface MilestoneView {
  id: string;
  title: string;
  brief: string;
  order: number;
  criteria: string[];
  status: MilestoneStatus;
  sources: ProjectSource[];
  submissions: SubmissionView[];
}

export interface ProjectView {
  id: string;
  title: string;
  description: string;
  course: { id: string; title: string; slug: string; repository: string | null };
  milestones: MilestoneView[];
}

export interface ProjectCourseOption {
  id: string;
  title: string;
  lessons: { id: string; title: string; sourcePath: string | null }[];
}
