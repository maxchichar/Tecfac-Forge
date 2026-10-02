import { describe, expect, it, vi } from "vitest";
import {
  parseGitHubUrl,
  organizeMarkdownIntoModules,
  fetchGitHubRepoData,
  extractTitleAndCleanMarkdown,
} from "@/lib/server/importers/github";

describe("GitHub URL Validation & SSRF Prevention", () => {
  it("accepts valid full HTTPS URLs", () => {
    const res = parseGitHubUrl("https://github.com/facebook/react");
    expect(res).toEqual({ ok: true, value: { owner: "facebook", repo: "react" } });
  });

  it("accepts valid shorthand URLs", () => {
    const res = parseGitHubUrl("rust-lang/book");
    expect(res).toEqual({ ok: true, value: { owner: "rust-lang", repo: "book" } });
  });

  it("accepts URLs with .git suffix", () => {
    const res = parseGitHubUrl("https://github.com/torvalds/linux.git");
    expect(res).toEqual({ ok: true, value: { owner: "torvalds", repo: "linux" } });
  });

  it("rejects non-github domains (SSRF prevention)", () => {
    const res = parseGitHubUrl("https://evil-site.com/malicious/repo");
    expect(res.ok).toBe(false);
  });

  it("rejects internal/loopback IPs (SSRF prevention)", () => {
    expect(parseGitHubUrl("http://localhost/foo/bar").ok).toBe(false);
    expect(parseGitHubUrl("http://127.0.0.1/foo/bar").ok).toBe(false);
    expect(parseGitHubUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(parseGitHubUrl("http://10.0.0.1/internal/repo").ok).toBe(false);
  });

  it("rejects path traversal attempts", () => {
    expect(parseGitHubUrl("owner/../etc/passwd").ok).toBe(false);
    expect(parseGitHubUrl("../owner/repo").ok).toBe(false);
  });

  it("rejects empty or incomplete inputs", () => {
    expect(parseGitHubUrl("").ok).toBe(false);
    expect(parseGitHubUrl("just-an-owner").ok).toBe(false);
  });
});

describe("extractTitleAndCleanMarkdown", () => {
  it("extracts first H1 title", () => {
    const md = "# Getting Started with Rust\n\nThis is a lesson.";
    const { title } = extractTitleAndCleanMarkdown(md, "intro.md");
    expect(title).toBe("Getting Started with Rust");
  });

  it("falls back to filename when no H1 exists", () => {
    const md = "Just some text without any heading.";
    const { title } = extractTitleAndCleanMarkdown(md, "01-memory-safety.md");
    expect(title).toBe("Memory Safety");
  });
});

describe("organizeMarkdownIntoModules", () => {
  it("places README in Getting Started and subdirs into separate modules", () => {
    const files = [
      { path: "README.md", content: "# Welcome\n\nIntroduction to the project." },
      { path: "docs/architecture/system.md", content: "# Architecture\n\nSystem design." },
      { path: "docs/architecture/flow.md", content: "# Data Flow\n\nHow data moves." },
      { path: "docs/api/endpoints.md", content: "# Endpoints\n\nREST API." },
    ];

    const modules = organizeMarkdownIntoModules(files);
    expect(modules.length).toBe(3);

    expect(modules[0].title).toBe("Getting Started");
    expect(modules[0].lessons[0].title).toBe("Welcome");

    const archModule = modules.find((m) => m.title === "Architecture");
    expect(archModule).toBeDefined();
    expect(archModule?.lessons.length).toBe(2);

    const apiModule = modules.find((m) => m.title === "Api");
    expect(apiModule).toBeDefined();
    expect(apiModule?.lessons.length).toBe(1);
  });
});

describe("fetchGitHubRepoData", () => {
  it("returns 404 when repository is missing", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const res = await fetchGitHubRepoData("ghost", "missing-repo", mockFetch as typeof fetch);
    expect(res).toEqual({ ok: false, status: 404, error: "Repository not found or is private." });
  });

  it("returns 429 when rate limited", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 403 }));
    const res = await fetchGitHubRepoData("owner", "repo", mockFetch as typeof fetch);
    expect(res).toEqual({
      ok: false,
      status: 429,
      error: "GitHub API rate limit exceeded. Please try again later.",
    });
  });

  it("returns 422 when no markdown files are found", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ default_branch: "main", name: "code-only" }), { status: 200 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tree: [{ path: "main.go", type: "blob" }],
          }),
          { status: 200 }
        )
      );

    const res = await fetchGitHubRepoData("owner", "code-only", mockFetch as typeof fetch);
    expect(res).toEqual({
      ok: false,
      status: 422,
      error: "No Markdown files found in this repository to build a course.",
    });
  });

  it("successfully parses repo with markdown into modules", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            default_branch: "main",
            name: "test-repo",
            description: "A test repository",
            language: "TypeScript",
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tree: [
              { path: "README.md", type: "blob" },
              { path: "docs/guide.md", type: "blob" },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response("# Welcome to Test Repo\n\nContent", { status: 200 }))
      .mockResolvedValueOnce(new Response("# User Guide\n\nGuide content", { status: 200 }));

    const res = await fetchGitHubRepoData("owner", "test-repo", mockFetch as typeof fetch);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.title).toBe("Test Repo");
      expect(res.value.modules.length).toBe(2);
      expect(res.value.modules[0].lessons[0].title).toBe("Welcome to Test Repo");
    }
  });
});
