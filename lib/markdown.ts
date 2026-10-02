import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSanitize from "rehype-sanitize";
import { defaultSchema } from "hast-util-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter, type Highlighter } from "shiki";

// Rendering pipeline notes (P0 hardening):
//  - Lesson markdown is UNTRUSTED (it can come from imported repos/docs). It
//    therefore goes through rehype-sanitize (allow-list schema) after raw HTML
//    has been parsed, and inline `style` values are further restricted to the
//    safe color-subset Shiki emits. Scripts, event handlers, javascript:/data:
//    URLs and arbitrary HTML injection never survive to the page.
//  - Code fences and Mermaid blocks are OUR OWN injected nodes (turned into raw
//    HTML by remark-rehype), then parsed by rehype-raw and allow-listed by the
//    same sanitizer — we keep Shiki highlighting and Mermaid containers working
//    while still blocking everything else.

const SUPPORTED_LANGS = [
  "javascript", "typescript", "jsx", "tsx", "rust", "python", "bash", "shell",
  "json", "yaml", "html", "css", "go", "sql", "markdown", "toml", "dockerfile", "text",
];

// Attributes we must keep on the elements WE generate even though they carry
// presentational data (Shiki inline theme). Everything else stays on the
// default allow-list. id/className are needed for heading anchors + TOC.
const defaultAttrs = defaultSchema.attributes ?? {};
const sanitizeSchema = {
  ...defaultSchema,
  clobberPrefix: "",
  attributes: {
    ...defaultAttrs,
    "*": Array.from(
      new Set([...(defaultAttrs["*"] ?? []), "className", "id"])
    ),
    pre: Array.from(new Set([...(defaultAttrs.pre ?? []), "className", "style"])),
    code: Array.from(new Set([...(defaultAttrs.code ?? []), "className", "style"])),
    span: Array.from(new Set([...(defaultAttrs.span ?? []), "className", "style"])),
    div: Array.from(new Set([...(defaultAttrs.div ?? []), "className"])),
    a: Array.from(new Set([...(defaultAttrs.a ?? []), "className"])),
  },
};

// Style values are reduced to the shape Shiki emits: `prop:#hex;` pairs only.
// This deliberately rejects CSS functions such as url(), calc(), var(),
// expression() — so an injected style can't trigger requests or script.
const SAFE_STYLE_RE = /^([a-zA-Z-]+:\s*#[0-9a-fA-F]{3,8}\s*;?\s*)+$/;

interface HasProperties {
  properties?: Record<string, unknown>;
  children?: unknown[];
}

function sanitizeInlineStyles(tree: unknown): void {
  const stack: unknown[] = [tree];
  while (stack.length > 0) {
    const current = stack.pop() as HasProperties | null;
    if (!current || typeof current !== "object") continue;
    const props = current.properties;
    if (props && typeof props === "object" && "style" in props) {
      const value = props.style;
      if (typeof value !== "string" || !SAFE_STYLE_RE.test(value.trim())) {
        delete props.style;
      }
    }
    if (Array.isArray(current.children)) {
      for (const child of current.children) stack.push(child);
    }
  }
}

/** Runs after rehype-sanitize to enforce the style-value subset. */
function restrictStyleAttributes() {
  return (tree: unknown) => {
    sanitizeInlineStyles(tree);
  };
}

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

interface MdastNode {
  type: string;
  lang?: string;
  value?: string;
  children?: MdastNode[];
}

interface MdastCodeNode extends MdastNode {
  type: "code" | "html";
  value: string;
}

/** Collects every mdast `code` node in the tree. Intentionally hand-rolled
 *  instead of unist-util-visit — see README's "Known quirks" section. */
function findCodeNodes(node: unknown, acc: MdastCodeNode[] = []): MdastCodeNode[] {
  if (!node || typeof node !== "object") return acc;
  const mdNode = node as MdastNode;
  if (mdNode.type === "code" && typeof mdNode.value === "string") {
    acc.push(mdNode as MdastCodeNode);
    return acc;
  }
  if (Array.isArray(mdNode.children)) {
    for (const child of mdNode.children) findCodeNodes(child, acc);
  }
  return acc;
}

/** Turns fenced code blocks into Shiki-highlighted HTML, and passes
 *  ```mermaid``` blocks through as diagram containers for client-side render. */
function remarkHighlightCode() {
  return async (tree: unknown) => {
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
    // allowDangerousHtml lets OUR code/mermaid nodes (and any raw HTML) reach
    // rehype-raw as real elements — rehype-sanitize immediately after is what
    // makes that safe. rehype-stringify never serializes raw HTML back out.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeSanitize, sanitizeSchema)
    .use(restrictStyleAttributes)
    .use(rehypeStringify)
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
