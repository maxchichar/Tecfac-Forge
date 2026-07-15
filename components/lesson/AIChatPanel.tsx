"use client";

import * as React from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = ["Explain like I'm 5", "Generate a quiz", "Give me a hint", "Summarize this lesson"];

export function AIChatPanel({
  lessonTitle,
  courseTitle,
  lessonId,
}: {
  lessonTitle: string;
  courseTitle: string;
  lessonId: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `I'm reading "${lessonTitle}" with you. Ask me to explain a concept, give an analogy, or quiz you on this lesson — I'll keep my answers scoped to what you've covered so far.`,
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          context: { lessonId, lessonTitle, courseTitle },
        }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply as string }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Something went wrong reaching the AI tutor. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-end)]">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium">AI Tutor</p>
          <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">Context: {lessonTitle}</p>
        </div>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[92%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13px] leading-relaxed",
              m.role === "user"
                ? "ml-auto bg-gradient-to-br from-[var(--color-accent-start)] to-[var(--color-accent-mid)] text-white"
                : "bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)]"
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-[13px] text-[var(--color-text-tertiary)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-border)] px-4 py-2.5">
        {QUICK_ACTIONS.map((qa) => (
          <button
            key={qa}
            onClick={() => send(qa)}
            className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
          >
            {qa}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-[var(--color-border)] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this lesson…"
          className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-[13px] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
        />
        <Button type="submit" size="icon" disabled={loading}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
