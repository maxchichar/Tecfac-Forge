import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), create: vi.fn(), submit: vi.fn(), review: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ getSessionState: mocks.session }));
vi.mock("@/lib/server/projects/service", async (original) => {
  const mod = await original<typeof import("@/lib/server/projects/service")>();
  return { ...mod, createLearningProject: mocks.create, submitProjectMilestone: mocks.submit, reviewProjectSubmission: mocks.review };
});
import { POST as create } from "@/app/api/projects/route";
import { POST as submit } from "@/app/api/projects/[id]/submissions/route";
import { POST as review } from "@/app/api/projects/[id]/reviews/route";
import { ProjectError } from "@/lib/server/projects/service";
const body = { courseId: "c", title: "A project", outcome: "Build a repeatable example.", sourceIds: ["s"] };
const request = (value: unknown, origin = "http://localhost") => new Request("http://localhost/api/projects", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockResolvedValue({ kind: "ok", userId: crypto.randomUUID() }); mocks.create.mockResolvedValue({ id: "created" }); });

describe("project mutation boundaries", () => {
  it.each(["not_configured", "infra_error", "no_session"])("fails closed for %s", async (kind) => {
    mocks.session.mockResolvedValue({ kind });
    expect((await create(request(body))).status).toBe(kind === "no_session" ? 401 : 503);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects a cross-origin mutation", async () => {
    expect((await create(request(body, "https://attacker.example"))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects injected identity and decision fields", async () => {
    expect((await create(request({ ...body, userId: "other" }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("returns safe errors for infrastructure failures", async () => {
    mocks.create.mockRejectedValue(new Error("private database connection details"));
    const result = await create(request(body));
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("private database");
  });
  it("preserves the project's conflict status", async () => {
    mocks.submit.mockRejectedValue(new ProjectError(409, "Earlier milestones need review."));
    const result = await submit(request({ milestoneId: "m", artifact: "", explanation: "", verification: "", criterionEvidence: [], selfChecked: false }), { params: Promise.resolve({ id: "p" }) });
    expect(result.status).toBe(409);
  });
  it("accepts only explicit review decisions", async () => {
    const result = await review(request({ submissionId: "s", status: "mastered", feedback: "Should never award mastery." }), { params: Promise.resolve({ id: "p" }) });
    expect(result.status).toBe(400);
    expect(mocks.review).not.toHaveBeenCalled();
  });
});
