import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import { createHighlighter, type Highlighter } from "shiki";

const SUPPORTED_LANGS = [
  "javascript", "typescript", "jsx", "tsx", "rust", "python", "bash", "shell",
  "json", "yaml", "html", "css", "go", "sql", "markdown", "toml", "dockerfile", "text",
];

let highlighterPromise: Promise<Highlighter> | null = null;
function getShiki() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark-dimmed"],
      langs: SUPPORTED_LANGS.filter((l) => l !== "text"),
    });
  }
  return highlighterPromise;
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Collects every mdast `code` node in the tree. Intentionally hand-rolled
 *  instead of unist-util-visit — see README's "Known quirks" section. */
function findCodeNodes(node: any, acc: any[] = []): any[] {
  if (node && node.type === "code") {
    acc.push(node);
    return acc;
  }
  if (node && Array.isArray(node.children)) {
    for (const child of node.children) findCodeNodes(child, acc);
  }
  return acc;
}

/** Turns fenced code blocks into Shiki-highlighted HTML, and passes
 *  ```mermaid``` blocks through as diagram containers for client-side render. */
function remarkHighlightCode() {
  return async (tree: any) => {
    const highlighter = await getShiki();
    const nodes = findCodeNodes(tree);

    for (const node of nodes) {
      const rawLang = (node.lang || "text").toLowerCase();

      if (rawLang === "mermaid") {
        node.type = "html";
        node.value = `<div class="mermaid-block not-prose my-6 rounded-xl border border-[var(--color-border)] bg-[#0d0d12] p-4 overflow-x-auto"><pre class="mermaid">${escapeHtml(
          node.value
        )}</pre></div>`;
        continue;
      }

      const lang = SUPPORTED_LANGS.includes(rawLang) ? rawLang : "text";
      try {
        const html = highlighter.codeToHtml(node.value, {
          lang,
          theme: "github-dark-dimmed",
        });
        node.type = "html";
        node.value = html;
      } catch {
        node.type = "html";
        node.value = `<pre><code>${escapeHtml(node.value)}</code></pre>`;
      }
    }
  };
}

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHighlightCode)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown);

  return String(file);
}

export interface TocEntry {
  id: string;
  text: string;
  depth: number;
}

/** Lightweight heading extraction for the table-of-contents sidebar. */
export function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const toc: TocEntry[] = [];
  for (const line of lines) {
    const match = /^(#{1,3})\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    const depth = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    toc.push({ id, text, depth });
  }
  return toc;
}
