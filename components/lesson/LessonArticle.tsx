"use client";

import * as React from "react";
import { MermaidRenderer } from "@/components/lesson/MermaidRenderer";

export function LessonArticle({ html }: { html: string }) {
  const ref = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={ref} className="prose-forge" dangerouslySetInnerHTML={{ __html: html }} />
      <MermaidRenderer scopeRef={ref} />
    </>
  );
}
