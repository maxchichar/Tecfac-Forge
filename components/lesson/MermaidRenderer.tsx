"use client";

import * as React from "react";

/** Renders any `<pre class="mermaid">` blocks produced by the markdown
 *  pipeline (lib/markdown.ts) into SVG diagrams, client-side only. */
export function MermaidRenderer({ scopeRef }: { scopeRef: React.RefObject<HTMLElement | null> }) {
  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      const root = scopeRef.current;
      if (!root) return;
      const nodes = root.querySelectorAll<HTMLElement>("pre.mermaid");
      if (nodes.length === 0) return;

      const mermaid = (await import("mermaid")).default;
      if (cancelled) return;

      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          background: "#0F172A",
          primaryColor: "#1E293B",
          primaryTextColor: "#E2E8F0",
          primaryBorderColor: "#64748B",
          lineColor: "#94A3B8",
          fontFamily: "system-ui, sans-serif",
        },
      });

      await mermaid.run({ nodes: Array.from(nodes) });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [scopeRef]);

  return null;
}
