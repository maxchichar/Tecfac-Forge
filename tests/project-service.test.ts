import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  course: { findFirst: vi.fn() }, lesson: { findMany: vi.fn() },
  project: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  projectMilestone: { findFirst: vi.fn(), findMany: vi.fn() },
  projectSubmission: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: { ...db, $transaction: (fn: (tx: typeof db) => unknown) => fn(db) } }));
import { createLearningProject, getLearningProjects, reviewProjectSubmission, submitProjectMilestone } from "@/lib/server/projects/service";
const createInput = { courseId: "course", title: "My project", outcome: "Build a working example.", sourceIds: ["source"] };
const submitInput = { milestoneId: "m", artifact: "patch", explanation: "reason", verification: "test evidence", criterionEvidence: ["first", "second"], selfChecked: true };
const reviewInput = { submissionId: "s", status: "accepted" as const, feedback: "Inspected all acceptance criteria." };
beforeEach(() => { vi.resetAllMocks(); });

describe("project access and evidence persistence", () => {
  it("rejects a course outside the user's workspace before writing", async () => {
    db.course.findFirst.mockResolvedValue(null);
    await expect(createLearningProject("intruder", createInput)).rejects.toMatchObject({ status: 404 });
    expect(db.course.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "course", workspace: { members: { some: { userId: "intruder" } } } } }));
    expect(db.project.create).not.toHaveBeenCalled();
  });
  it("rejects sources from another course", async () => {
    db.course.findFirst.mockResolvedValue({ id: "course" }); db.lesson.findMany.mockResolvedValue([]);
    await expect(createLearningProject("learner", createInput)).rejects.toMatchObject({ status: 400 });
    expect(db.lesson.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ["source"] }, module: { courseId: "course" } } }));
    expect(db.project.create).not.toHaveBeenCalled();
  });
  it("creates the authored workflow atomically with selected sources", async () => {
    db.course.findFirst.mockResolvedValue({ id: "course" }); db.lesson.findMany.mockResolvedValue([{ id: "source" }]); db.project.count.mockResolvedValue(0); db.project.create.mockResolvedValue({ id: "project" });
    await expect(createLearningProject("learner", createInput)).resolves.toEqual({ id: "project" });
    const data = db.project.create.mock.calls[0][0].data;
    expect(data.milestones.create).toHaveLength(5);
    expect(data.milestones.create.every((m: { sources: unknown }) => JSON.stringify(m.sources) === JSON.stringify({ connect: [{ id: "source" }] }))).toBe(true);
  });
  it("reads only the current learner's attempts within authorized projects", async () => {
    db.project.findMany.mockResolvedValue([]);
    await getLearningProjects("learner", "p");
    const query = db.project.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ id: "p", course: { workspace: { members: { some: { userId: "learner" } } } } });
    expect(query.include.milestones.include.submissions.where).toEqual({ userId: "learner" });
  });
  it("rejects submitting into another project or workspace", async () => {
    db.projectMilestone.findFirst.mockResolvedValue(null);
    await expect(submitProjectMilestone("intruder", "p", submitInput)).rejects.toMatchObject({ status: 404 });
    expect(db.projectMilestone.findFirst.mock.calls[0][0].where).toMatchObject({ id: "m", projectId: "p", project: { course: { workspace: { members: { some: { userId: "intruder" } } } } } });
    expect(db.projectSubmission.create).not.toHaveBeenCalled();
  });
  it("blocks bypassing an unfinished or reopened prerequisite", async () => {
    db.projectMilestone.findFirst.mockResolvedValue({ id: "m", order: 1, criteria: ["a", "b"] });
    db.projectMilestone.findMany.mockResolvedValue([{ submissions: [{ status: "needs_revision" }] }]);
    await expect(submitProjectMilestone("learner", "p", submitInput)).rejects.toMatchObject({ status: 409 });
    expect(db.projectSubmission.create).not.toHaveBeenCalled();
  });
  it("persists the authenticated learner, preserves attempt history, and never writes mastery", async () => {
    db.projectMilestone.findFirst.mockResolvedValue({ id: "m", order: 1, criteria: ["a", "b"] });
    db.projectMilestone.findMany.mockResolvedValue([{ submissions: [{ status: "accepted" }] }]);
    db.projectSubmission.create.mockResolvedValue({ id: "new-attempt", status: "self_checked" });
    await submitProjectMilestone("learner", "p", submitInput);
    expect(db.projectSubmission.create.mock.calls[0][0].data).toMatchObject({ userId: "learner", milestoneId: "m", status: "self_checked" });
    expect(db.projectSubmission.update).not.toHaveBeenCalled();
  });
});

describe("independent review", () => {
  it("requires owner/admin membership in the submission's workspace", async () => {
    db.projectSubmission.findFirst.mockResolvedValue(null);
    await expect(reviewProjectSubmission("outsider", "p", reviewInput)).rejects.toMatchObject({ status: 404 });
    expect(db.projectSubmission.findFirst.mock.calls[0][0].where.milestone.project.course.workspace.members.some).toEqual({ userId: "outsider", role: { in: ["owner", "admin"] } });
    expect(db.projectSubmission.update).not.toHaveBeenCalled();
  });
  it("refuses self-review even for an owner", async () => {
    db.projectSubmission.findFirst.mockResolvedValue({ id: "s", userId: "owner", milestoneId: "m", status: "submitted" });
    await expect(reviewProjectSubmission("owner", "p", reviewInput)).rejects.toMatchObject({ status: 403 });
  });
  it("refuses reviews of superseded attempts", async () => {
    db.projectSubmission.findFirst.mockResolvedValueOnce({ id: "s", userId: "learner", milestoneId: "m", status: "submitted" }).mockResolvedValueOnce({ id: "newer" });
    await expect(reviewProjectSubmission("owner", "p", reviewInput)).rejects.toMatchObject({ status: 409 });
    expect(db.projectSubmission.update).not.toHaveBeenCalled();
  });
  it("records the independent reviewer and decision", async () => {
    db.projectSubmission.findFirst.mockResolvedValueOnce({ id: "s", userId: "learner", milestoneId: "m", status: "submitted" }).mockResolvedValueOnce({ id: "s" });
    await reviewProjectSubmission("owner", "p", reviewInput);
    expect(db.projectSubmission.update.mock.calls[0][0].data).toMatchObject({ status: "accepted", reviewerId: "owner", reviewedAt: expect.any(Date) });
  });
});
