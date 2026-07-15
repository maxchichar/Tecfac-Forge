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
          background: "#0d0d12",
          primaryColor: "#1c1c28",
          primaryTextColor: "#f2f2f7",
          primaryBorderColor: "#2e2e42",
          lineColor: "#6366f1",
          fontFamily: "Inter, sans-serif",
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
