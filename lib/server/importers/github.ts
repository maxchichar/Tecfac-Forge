import { prisma } from "@/lib/prisma";
import { logger, safeErrorMessage } from "@/lib/logger";

// Security limits for GitHub repository ingestion (untrusted input):
export const MAX_FILES_LIMIT = 40;
export const MAX_FILE_SIZE_BYTES = 250_000; // 250 KB per file
export const MAX_TOTAL_BYTES = 2_500_000; // 2.5 MB total markdown per repo
export const REQUEST_TIMEOUT_MS = 15_000; // 15 seconds

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

/**
 * Validate and parse a GitHub URL or shorthand.
 *
 * Enforces strict alphanumeric/dash/dot/underscore naming to prevent:
 * - SSRF (only github.com paths are parsed; internal IPs and URLs rejected)
 * - Path traversal (no `..` or leading slashes in owner/repo)
 * - Malformed input
 */
export function parseGitHubUrl(input: string): { ok: true; value: ParsedGitHubUrl } | { ok: false; error: string } {
  if (typeof input !== "string" || !input.trim()) {
    return { ok: false, error: "Repository URL is required." };
  }

  const trimmed = input.trim();

  // Disallow control characters and internal IP / dangerous schemes
  if (/[\r\n\t\0]/.test(trimmed) || /^(https?:\/\/)?(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/i.test(trimmed)) {
    return { ok: false, error: "Invalid repository URL." };
  }

  let pathname = trimmed;

  // If full URL provided, ensure hostname is github.com
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsedUrl = new URL(trimmed);
      if (parsedUrl.username || parsedUrl.password) {
        return { ok: false, error: "Credentials in repository URL are not permitted." };
      }
      if (parsedUrl.hostname.toLowerCase() !== "github.com" && parsedUrl.hostname.toLowerCase() !== "www.github.com") {
        return { ok: false, error: "Only public repositories on github.com are supported." };
      }
      pathname = parsedUrl.pathname;
    } catch {
      return { ok: false, error: "Malformed URL format." };
    }
  } else if (trimmed.toLowerCase().startsWith("github.com/")) {
    pathname = trimmed.slice("github.com/".length);
  }

  // Remove leading/trailing slashes and .git suffix
  pathname = pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    return { ok: false, error: "URL must contain both owner and repository name (e.g. owner/repo)." };
  }

  const [owner, repo] = parts;

  // GitHub user and repo naming rules: alphanumeric, dash, dot, underscore.
  const nameRegex = /^[a-zA-Z0-9_.-]+$/;
  if (!nameRegex.test(owner) || !nameRegex.test(repo) || owner === ".." || repo === "..") {
    return { ok: false, error: "Invalid repository owner or name." };
  }

  return { ok: true, value: { owner, repo } };
}

export interface TreeItem {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

export interface IngestedFile {
  path: string;
  title: string;
  markdown: string;
  order: number;
  estimatedMinutes: number;
}

export interface IngestedModule {
  title: string;
  order: number;
  lessons: IngestedFile[];
}

export interface IngestionResult {
  title: string;
  description: string;
  repository: string;
  language: string;
  modules: IngestedModule[];
  revision: string;
}

function cleanTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.(md|markdown)$/i, "");
  const withoutLeadingNumbers = withoutExt.replace(/^\d+[-_.]?/, "");
  return withoutLeadingNumbers
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || "Untitled";
}

export function extractTitleAndCleanMarkdown(rawMarkdown: string, fallbackFilename: string): { title: string; markdown: string } {
  // Strip null bytes to prevent PostgreSQL text encoding errors
  const sanitizedMarkdown = rawMarkdown.replace(/\0/g, "");
  const lines = sanitizedMarkdown.split("\n");
  let title = "";
  for (const line of lines) {
    const headingMatch = line.match(/^#\s+(.+)$/);
    if (headingMatch && headingMatch[1]) {
      title = headingMatch[1].replace(/[*_`[\]]/g, "").trim();
      break;
    }
  }

  if (!title) {
    title = cleanTitleFromFilename(fallbackFilename);
  }

  // Cap title length to prevent oversized database text / UI breaking
  if (title.length > 120) {
    title = title.slice(0, 117) + "...";
  }

  return { title, markdown: sanitizedMarkdown };
}

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.min(60, Math.round(words / 180)));
}

export function organizeMarkdownIntoModules(files: { path: string; content: string }[]): IngestedModule[] {
  // Separate README.md if present
  const readmeIdx = files.findIndex((f) => /^readme\.(md|markdown)$/i.test(f.path));
  let readmeFile: { path: string; content: string } | null = null;
  const remainingFiles = [...files];

  if (readmeIdx !== -1) {
    readmeFile = remainingFiles.splice(readmeIdx, 1)[0];
  }

  // Group remaining by top directory
  const groups = new Map<string, { path: string; content: string }[]>();

  for (const file of remainingFiles) {
    const parts = file.path.split("/");
    const filename = parts[parts.length - 1];
    let groupName = "General Documentation";

    // Detect chapter-based naming convention (e.g. ch01-01, ch02-00)
    const chapterMatch = filename.match(/^ch(\d{1,2})/i);
    if (chapterMatch) {
      groupName = `Chapter ${parseInt(chapterMatch[1], 10)}`;
    } else if (parts.length > 1) {
      const topDir = parts[0] === "docs" && parts.length > 2 ? parts[1] : parts[0];
      groupName = topDir
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    const current = groups.get(groupName) ?? [];
    current.push(file);
    groups.set(groupName, current);
  }

  const modules: IngestedModule[] = [];
  let moduleOrder = 1;

  if (readmeFile) {
    const { title, markdown } = extractTitleAndCleanMarkdown(readmeFile.content, "README.md");
    modules.push({
      title: "Getting Started",
      order: moduleOrder++,
      lessons: [
        {
          path: readmeFile.path,
          title: title || "Introduction & Overview",
          markdown,
          order: 1,
          estimatedMinutes: estimateReadingMinutes(markdown),
        },
      ],
    });
  }

  for (const [groupName, groupFiles] of groups.entries()) {
    const lessons: IngestedFile[] = groupFiles.map((f, idx) => {
      const { title, markdown } = extractTitleAndCleanMarkdown(f.content, f.path.split("/").pop() || "lesson.md");
      return {
        path: f.path,
        title,
        markdown,
        order: idx + 1,
        estimatedMinutes: estimateReadingMinutes(markdown),
      };
    });

    modules.push({
      title: groupName,
      order: moduleOrder++,
      lessons,
    });
  }

  // If no files were grouped (e.g. only 1 file)
  if (modules.length === 0 && files.length > 0) {
    const lessons: IngestedFile[] = files.map((f, idx) => {
      const { title, markdown } = extractTitleAndCleanMarkdown(f.content, f.path);
      return {
        path: f.path,
        title,
        markdown,
        order: idx + 1,
        estimatedMinutes: estimateReadingMinutes(markdown),
      };
    });
    modules.push({
      title: "Core Concepts",
      order: 1,
      lessons,
    });
  }

  return modules;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

/**
 * Fetch and parse a public GitHub repository into structured course data.
 */
export async function fetchGitHubRepoData(
  owner: string,
  repo: string,
  fetchFn: typeof fetch = fetch
): Promise<{ ok: true; value: IngestionResult } | { ok: false; status: number; error: string }> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Tecfac-Forge-Importer",
  };

  // 1. Fetch Repository Details
  const repoRes = await fetchFn(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      return { ok: false, status: 404, error: "Repository not found or is private." };
    }
    if (repoRes.status === 403 || repoRes.status === 429) {
      return { ok: false, status: 429, error: "GitHub API rate limit exceeded. Please try again later." };
    }
    return { ok: false, status: 502, error: `Failed to fetch repository metadata (GitHub HTTP ${repoRes.status}).` };
  }

  const repoJson = await repoRes.json();
  const defaultBranch = repoJson.default_branch || "main";
  const repoTitle = repoJson.name ? repoJson.name.replace(/[-_]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : `${owner}/${repo}`;
  const repoDesc = repoJson.description || `Technical course imported from GitHub repository ${owner}/${repo}.`;
  const language = repoJson.language || "Markdown";

  // Pin every downloaded file and citation to one commit, even if the branch moves.
  const revisionRes = await fetchFn(`https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(defaultBranch)}`, {
    headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!revisionRes.ok) return { ok: false, status: 502, error: "Could not resolve the repository revision." };
  const revisionJson = await revisionRes.json();
  if (typeof revisionJson.sha !== "string" || !/^[a-f0-9]{40}$/i.test(revisionJson.sha)) return { ok: false, status: 502, error: "Invalid repository revision." };
  const revision: string = revisionJson.sha;
  // 2. Fetch Repository Tree
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${revision}?recursive=1`;
  const treeRes = await fetchFn(treeUrl, {
    headers,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!treeRes.ok) {
    return { ok: false, status: 502, error: "Could not retrieve repository file tree." };
  }

  const treeJson = await treeRes.json();
  const rawTree: TreeItem[] = Array.isArray(treeJson.tree) ? treeJson.tree : [];

  // 3. Filter markdown files
  const markdownFiles = rawTree.filter((item) => {
    if (item.type !== "blob") return false;
    const lower = item.path.toLowerCase();
    if (!lower.endsWith(".md") && !lower.endsWith(".markdown")) return false;
    // Exclude hidden files/directories (e.g. .github/, .templates/), dependencies, and vendor dirs
    if (lower.startsWith(".") || lower.includes("/.") || lower.includes("node_modules/") || lower.includes("vendor/")) return false;
    return true;
  });

  if (markdownFiles.length === 0) {
    return { ok: false, status: 422, error: "No Markdown files found in this repository to build a course." };
  }

  // Prioritize README.md and documentation folders, cap at MAX_FILES_LIMIT
  const prioritized = [...markdownFiles].sort((a, b) => {
    const aIsReadme = /^readme\.(md|markdown)$/i.test(a.path);
    const bIsReadme = /^readme\.(md|markdown)$/i.test(b.path);
    if (aIsReadme) return -1;
    if (bIsReadme) return 1;
    return a.path.localeCompare(b.path);
  }).slice(0, MAX_FILES_LIMIT);

  // 4. Fetch file contents with byte size protection
  let totalBytes = 0;
  const loadedFiles: { path: string; content: string }[] = [];

  for (const file of prioritized) {
    if (totalBytes >= MAX_TOTAL_BYTES) {
      logger.warn("importer.github.total_bytes_limit_reached", { owner, repo, totalBytes });
      break;
    }

    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${revision}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
    try {
      const fileRes = await fetchFn(rawUrl, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!fileRes.ok) continue;

      let content = await fileRes.text();
      // Strip null bytes to prevent database text errors
      content = content.replace(/\0/g, "");

      if (content.length > MAX_FILE_SIZE_BYTES) {
        content = content.slice(0, MAX_FILE_SIZE_BYTES) + "\n\n*(Content truncated due to size limit)*";
      }

      totalBytes += content.length;
      loadedFiles.push({ path: file.path, content });
    } catch (err) {
      logger.warn("importer.github.file_fetch_failed", { path: file.path, message: safeErrorMessage(err) });
    }
  }

  if (loadedFiles.length === 0) {
    return { ok: false, status: 422, error: "Failed to download any markdown content from repository." };
  }

  const modules = organizeMarkdownIntoModules(loadedFiles);

  return {
    ok: true,
    value: {
      title: repoTitle,
      description: repoDesc,
      repository: `${owner}/${repo}`,
      language,
      modules,
      revision,
    },
  };
}

/**
 * Ingest a GitHub repository and persist it directly to the database.
 */
export async function ingestGitHubRepoToDatabase(
  workspaceId: string,
  githubUrl: string,
  fetchFn: typeof fetch = fetch
): Promise<{ ok: true; courseSlug: string; courseId: string; isExisting?: boolean } | { ok: false; status: number; error: string }> {
  const parsed = parseGitHubUrl(githubUrl);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const { owner, repo } = parsed.value;

  // 1. Idempotency: Check if course already exists in this workspace
  const existing = await prisma.course.findUnique({
    where: {
      workspaceId_repository: {
        workspaceId,
        repository: `${owner}/${repo}`,
      },
    },
    select: { id: true, slug: true },
  });

  if (existing) {
    logger.info("importer.github.already_exists", {
      workspaceId,
      repository: `${owner}/${repo}`,
      courseId: existing.id,
      slug: existing.slug,
    });
    return { ok: true, courseSlug: existing.slug, courseId: existing.id, isExisting: true };
  }

  const repoData = await fetchGitHubRepoData(owner, repo, fetchFn);
  if (!repoData.ok) {
    return repoData;
  }

  const { title, description, repository, language, modules, revision } = repoData.value;

  // Generate unique course slug
  const baseSlug = slugify(repo);
  let finalSlug = baseSlug;
  let counter = 1;
  while (await prisma.course.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${baseSlug}-${counter++}`;
  }

  const totalEstimatedHours = Math.max(
    1,
    Math.round(
      modules.reduce((sum, m) => sum + m.lessons.reduce((lsum, l) => lsum + l.estimatedMinutes, 0), 0) / 60
    )
  );

  // Persist course, modules, lessons atomically in a transaction
  try {
    const createdCourse = await prisma.$transaction(
      async (tx) => {
        return tx.course.create({
          data: {
            workspaceId,
            slug: finalSlug,
            title,
            description,
            repository,
            language,
            difficulty: "beginner",
            estimatedHours: totalEstimatedHours,
            tags: [language.toLowerCase(), "imported", "github"],
            importSource: "github",
            modules: {
              create: modules.map((mod) => {
                const usedSlugs = new Set<string>();
                return {
                  title: mod.title,
                  order: mod.order,
                  lessons: {
                    create: mod.lessons.map((lesson) => {
                      const baseLessonSlug = slugify(lesson.title) || "lesson";
                      let lessonSlug = baseLessonSlug;
                      let slugCounter = 1;
                      while (usedSlugs.has(lessonSlug)) {
                        lessonSlug = `${baseLessonSlug}-${slugCounter++}`;
                      }
                      usedSlugs.add(lessonSlug);
                      return {
                        slug: lessonSlug,
                        title: lesson.title,
                        markdown: lesson.markdown,
                        sourcePath: lesson.path,
                        sourceRevision: revision,
                        sourceUrl: `https://github.com/${owner}/${repo}/blob/${revision}/${lesson.path.split("/").map(encodeURIComponent).join("/")}`,
                        estimatedMinutes: lesson.estimatedMinutes,
                        difficulty: "beginner",
                        order: lesson.order,
                      };
                    }),
                  },
                };
              }),
            },
          },
        });
      },
      { timeout: 30000 }
    );

    logger.info("importer.github.success", {
      courseId: createdCourse.id,
      slug: createdCourse.slug,
      modulesCount: modules.length,
    });

    return { ok: true, courseSlug: createdCourse.slug, courseId: createdCourse.id };
  } catch (err: unknown) {
    // Handle concurrent import race where another request imported the same repo
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
      const raceExisting = await prisma.course.findUnique({
        where: {
          workspaceId_repository: {
            workspaceId,
            repository: `${owner}/${repo}`,
          },
        },
        select: { id: true, slug: true },
      });
      if (raceExisting) {
        logger.info("importer.github.concurrency_resolved", {
          workspaceId,
          repository: `${owner}/${repo}`,
          courseId: raceExisting.id,
          slug: raceExisting.slug,
        });
        return { ok: true, courseSlug: raceExisting.slug, courseId: raceExisting.id, isExisting: true };
      }
    }
    throw err;
  }
}
