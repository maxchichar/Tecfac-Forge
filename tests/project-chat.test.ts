import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { projectFixture } from "./fixtures/project";
const mocks = vi.hoisted(() => ({ projects: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ getSessionState: async () => ({ kind: "ok", userId: "learner" }) }));
vi.mock("@/lib/env", () => ({ DEFAULT_AI_MODEL: "configured-model", envString: (key: string) => key === "OPENAI_API_KEY" ? "test-key" : undefined }));
vi.mock("@/lib/rate-limit", () => ({ aiChatRateLimiter: { check: () => ({ allowed: true }) } }));
vi.mock("@/lib/server/projects/service", () => ({ getLearningProjects: mocks.projects }));
vi.mock("@/lib/server/lessons", () => ({ getAuthorizedLessonById: async () => ({ id: "source-1", title: "Actual source", markdown: "Source evidence", courseTitle: "Actual course" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { conceptEvidence: { findFirst: async () => null } } }));
import { POST } from "@/app/api/ai/chat/route";
const context = { lessonId: "source-1", lessonTitle: "Untrusted client title", courseTitle: "Untrusted course", projectId: "project-fixture", milestoneId: "milestone-0" };
const request = (overrides = {}) => new NextRequest("http://localhost/api/ai/chat", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "Give me a hint" }], context: { ...context, ...overrides } }) });
beforeEach(() => { vi.clearAllMocks(); mocks.projects.mockResolvedValue([projectFixture]); mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "A grounded hint." }] }] }))); vi.stubGlobal("fetch", mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());

describe("project tutor context", () => {
  it("loads the authorized project and milestone from the server", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.projects).toHaveBeenCalledWith("learner", "project-fixture");
    const payload = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(payload.instructions).toContain("Build a resilient API client");
    expect(payload.instructions).toContain("Investigate the source");
    expect(payload.instructions).toContain("not mastery evidence");
    expect(payload.instructions).not.toContain("Untrusted client title");
  });
  it("never calls the provider for an unauthorized project", async () => {
    mocks.projects.mockResolvedValue([]);
    expect((await POST(request())).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("rejects mixing another lesson into project context", async () => {
    expect((await POST(request({ lessonId: "unrelated-lesson" }))).status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("returns a controlled error when project persistence is unavailable", async () => {
    mocks.projects.mockRejectedValue(new Error("database unavailable"));
    expect((await POST(request())).status).toBe(503);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
