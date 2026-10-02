import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseGitHubUrl,
  extractTitleAndCleanMarkdown,
  fetchGitHubRepoData,
  ingestGitHubRepoToDatabase,
} from "@/lib/server/importers/github";
import { courseImportRateLimiter, aiChatRateLimiter } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { setLessonProgress } from "@/lib/server/progress";
import { getAuthorizedLessonById } from "@/lib/server/lessons";
import { getAuthorizedCourseBySlug } from "@/lib/server/courses";

describe("P1.5 Hardening: SSRF & URL Validation", () => {
  it("rejects URLs containing credentials/userinfo", () => {
    const res = parseGitHubUrl("https://admin:secret@github.com/owner/repo");
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/credentials/i);
    }
  });

  it("rejects domain spoofing (e.g. github.com.attacker.com)", () => {
    const res = parseGitHubUrl("https://github.com.attacker.com/owner/repo");
    expect(res.ok).toBe(false);
  });

  it("rejects cloud metadata IP addresses", () => {
    const res = parseGitHubUrl("http://169.254.169.254/latest/meta-data");
    expect(res.ok).toBe(false);
  });

  it("rejects localhost and loopback IPv4/IPv6", () => {
    expect(parseGitHubUrl("http://localhost/repo").ok).toBe(false);
    expect(parseGitHubUrl("http://127.0.0.1/repo").ok).toBe(false);
    expect(parseGitHubUrl("http://[::1]/repo").ok).toBe(false);
  });
});

describe("P1.5 Hardening: Input Sanitization & Edge Cases", () => {
  it("strips null bytes from markdown content to prevent PostgreSQL encoding failures", () => {
    const raw = "# Hello\0 World\nThis is \0binary null data.";
    const result = extractTitleAndCleanMarkdown(raw, "fallback.md");
    expect(result.markdown).toBe("# Hello World\nThis is binary null data.");
    expect(result.markdown).not.toContain("\0");
  });

  it("caps excessively long heading titles to 120 characters", () => {
    const longHeading = "# " + "A".repeat(200);
    const result = extractTitleAndCleanMarkdown(longHeading, "fallback.md");
    expect(result.title.length).toBeLessThanOrEqual(120);
    expect(result.title.endsWith("...")).toBe(true);
  });

  it("filters out hidden files, .github directories, and vendor folders from ingestion tree", async () => {
    const mockTree = {
      tree: [
        { path: ".github/workflows/ci.md", type: "blob" },
        { path: ".gitlab/ci.md", type: "blob" },
        { path: "node_modules/lib/README.md", type: "blob" },
        { path: "vendor/bundle/doc.md", type: "blob" },
        { path: "docs/introduction.md", type: "blob" },
      ],
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/owner/repo") && !url.includes("/trees/")) {
        return Promise.resolve(new Response(JSON.stringify({
          name: "repo",
          description: "desc",
          language: "Rust",
          default_branch: "main",
        }), { status: 200 }));
      }
      if (url.includes("/trees/main")) {
        return Promise.resolve(new Response(JSON.stringify(mockTree), { status: 200 }));
      }
      if (url.includes("raw.githubusercontent.com")) {
        return Promise.resolve(new Response("# Introduction\nContent", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const res = await fetchGitHubRepoData("owner", "repo", mockFetch as unknown as typeof fetch);
    expect(res.ok).toBe(true);
    if (res.ok) {
      const allLessons = res.value.modules.flatMap((m) => m.lessons);
      expect(allLessons.length).toBe(1);
      expect(allLessons[0].path).toBe("docs/introduction.md");
    }
  });

  it("returns a safe 422 error when a repository has 0 markdown files", async () => {
    const mockTree = {
      tree: [
        { path: "src/main.rs", type: "blob" },
        { path: "Cargo.toml", type: "blob" },
      ],
    };

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/owner/repo") && !url.includes("/trees/")) {
        return Promise.resolve(new Response(JSON.stringify({
          name: "repo",
          description: "desc",
          language: "Rust",
          default_branch: "main",
        }), { status: 200 }));
      }
      if (url.includes("/trees/main")) {
        return Promise.resolve(new Response(JSON.stringify(mockTree), { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const res = await fetchGitHubRepoData("owner", "repo", mockFetch as unknown as typeof fetch);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(422);
      expect(res.error).toMatch(/no markdown files/i);
    }
  });
});

describe("P1.5 Hardening: Rate Limiting & Abuse Prevention", () => {
  beforeEach(() => {
    courseImportRateLimiter.reset();
    aiChatRateLimiter.reset();
  });

  it("enforces course import rate limit of 10 requests per minute per user", () => {
    const key = "user:test-user-import";
    for (let i = 0; i < 10; i++) {
      const decision = courseImportRateLimiter.check(key);
      expect(decision.allowed).toBe(true);
    }

    const blocked = courseImportRateLimiter.check(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("P1.5 Hardening: Idempotency & Concurrency Safety", () => {
  it("returns existing course immediately on re-import without duplicating in DB", async () => {
    const mockCourse = {
      id: "existing-course-id",
      slug: "existing-repo-slug",
    };

    const findUniqueSpy = vi
      .spyOn(prisma.course, "findUnique")
      .mockResolvedValueOnce(mockCourse as unknown as Awaited<ReturnType<typeof prisma.course.findUnique>>);

    const res = await ingestGitHubRepoToDatabase("test-workspace-id", "https://github.com/test-owner/test-repo");
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.courseId).toBe("existing-course-id");
      expect(res.courseSlug).toBe("existing-repo-slug");
      expect(res.isExisting).toBe(true);
    }

    findUniqueSpy.mockRestore();
  });

  it("resolves concurrent import race (P2002 unique constraint conflict) cleanly", async () => {
    const findUniqueSpy = vi
      .spyOn(prisma.course, "findUnique")
      .mockResolvedValueOnce(null) // 1. Initial check by workspaceId_repository
      .mockResolvedValueOnce(null) // 2. Slug collision check
      .mockResolvedValueOnce({ id: "race-winner-course-id", slug: "race-winner-slug" } as unknown as Awaited<ReturnType<typeof prisma.course.findUnique>>); // 3. Race recovery lookup

    const txSpy = vi.spyOn(prisma, "$transaction").mockRejectedValueOnce({
      code: "P2002",
      message: "Unique constraint failed on the fields: (workspaceId, repository)",
    });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/repos/test-owner/test-repo") && !url.includes("/trees/")) {
        return Promise.resolve(new Response(JSON.stringify({
          name: "test-repo",
          description: "desc",
          language: "Rust",
          default_branch: "main",
        }), { status: 200 }));
      }
      if (url.includes("/trees/main")) {
        return Promise.resolve(new Response(JSON.stringify({
          tree: [{ path: "README.md", type: "blob" }],
        }), { status: 200 }));
      }
      if (url.includes("raw.githubusercontent.com")) {
        return Promise.resolve(new Response("# Test Readme\nContent", { status: 200 }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    });

    const res = await ingestGitHubRepoToDatabase(
      "test-workspace-id",
      "https://github.com/test-owner/test-repo",
      mockFetch as unknown as typeof fetch
    );

    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.courseId).toBe("race-winner-course-id");
      expect(res.courseSlug).toBe("race-winner-slug");
      expect(res.isExisting).toBe(true);
    }

    findUniqueSpy.mockRestore();
    txSpy.mockRestore();
  });
});

describe("P1.5 Hardening: Multi-Tenant Isolation", () => {
  it("rejects lesson progress mutation if user is not in the course's workspace", async () => {
    const findLessonSpy = vi.spyOn(prisma.lesson, "findFirst").mockResolvedValueOnce(null);

    const res = await setLessonProgress("attacker-user-id", "victim-lesson-id", true);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(404);
      expect(res.error).toMatch(/unauthorized|not found/i);
    }

    findLessonSpy.mockRestore();
  });

  it("returns null for lesson details if requesting user lacks workspace authorization", async () => {
    const findLessonSpy = vi.spyOn(prisma.lesson, "findFirst").mockResolvedValueOnce(null);

    const lesson = await getAuthorizedLessonById("unauthorized-user-id", "target-lesson-id");
    expect(lesson).toBeNull();

    findLessonSpy.mockRestore();
  });

  it("returns null for course details if requesting user lacks workspace authorization", async () => {
    const findCourseSpy = vi.spyOn(prisma.course, "findFirst").mockResolvedValueOnce(null);

    const course = await getAuthorizedCourseBySlug("unauthorized-user-id", "target-course-slug");
    expect(course).toBeNull();

    findCourseSpy.mockRestore();
  });
});
