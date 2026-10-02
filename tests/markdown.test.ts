import { describe, expect, it } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

// Security boundary tests for the lesson markdown renderer. The input is
// treated as untrusted: dangerous constructs must never survive to HTML, while
// GFM, code highlighting, Mermaid containers, and heading anchors must still
// render.

describe("renderMarkdown sanitization", () => {
  it("renders valid markdown (headings, GFM table, autolink anchors)", async () => {
    const html = await renderMarkdown(
      "# Welcome\n\nSome **bold** and a [link](https://example.com).\n\n| A | B |\n| - | - |\n| 1 | 2 |"
    );
    expect(html).toContain('<h1 id="welcome"');
    expect(html).toContain('href="#welcome"');
    expect(html).toContain("<table>");
    expect(html).toContain("https://example.com");
    expect(html).not.toContain("javascript:");
  });

  it("still renders Shiki-highlighted code fences", async () => {
    const html = await renderMarkdown("```ts\nconst x: number = 1;\n```");
    expect(html).toContain('class="shiki');
    expect(html).toContain("<code>");
  });

  it("still emits the Mermaid container for mermaid fences", async () => {
    const html = await renderMarkdown("```mermaid\ngraph TD\n  A --> B\n```");
    expect(html).toContain('class="mermaid');
    expect(html).toContain('class="mermaid-block');
  });

  it("strips <script> elements", async () => {
    const html = await renderMarkdown("hello\n\n<script>alert('x')</script>");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("alert(");
  });

  it("strips event handler attributes", async () => {
    const html = await renderMarkdown('<img src="x" onerror="alert(1)" /><a onmouseover="evil()">y</a>');
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("onmouseover");
    expect(html).not.toContain("evil()");
  });

  it("blocks javascript: URLs in raw HTML and markdown links", async () => {
    const rawHtml = await renderMarkdown('<a href="javascript:alert(1)">x</a>');
    expect(rawHtml).not.toContain("javascript:");

    const gfmLink = await renderMarkdown("[x](javascript:alert(1))");
    expect(gfmLink).not.toContain("javascript:");
  });

  it("blocks data: URLs", async () => {
    const html = await renderMarkdown('[x](data:text/html,<script>alert(1)</script>)');
    expect(html).not.toContain("data:text/html");
  });

  it("drops non-color CSS functions from allowed inline styles", async () => {
    const html = await renderMarkdown(
      '<span style="background-image:url(javascript:evil())">no</span>'
    );
    expect(html).not.toContain("url(javascript");
    expect(html).not.toContain("background-image");
  });

  it("blocks embedded SVG with script handlers", async () => {
    const html = await renderMarkdown('<svg onload="alert(1)"><circle/></svg>');
    expect(html.toLowerCase()).not.toContain("<svg");
  });

  it("does not leak raw HTML back out via dangerous serialization", async () => {
    // Even if a dangerous construct somehow reached the sanitizer, the stringify
    // step never re-emits raw HTML that wasn't allow-listed.
    const html = await renderMarkdown("<iframe src='https://evil.example'></iframe>");
    expect(html.toLowerCase()).not.toContain("<iframe");
  });
});
