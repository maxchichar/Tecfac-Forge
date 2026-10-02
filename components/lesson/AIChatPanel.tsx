"use client";

import * as React from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = ["Explain the core idea", "Ask me a question", "Give me a hint", "Summarize this lesson"];

export function AIChatPanel({
  lessonTitle,
  courseTitle,
  lessonId,
  projectId,
  milestoneId,
}: {
  lessonTitle: string;
  courseTitle: string;
  lessonId: string;
  projectId?: string;
  milestoneId?: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content: projectId ? `Let's work through "${lessonTitle}". Ask for a hint, a source explanation, or help designing a check. I can use the milestone brief and your latest saved attempt.` : `I'm reading "${lessonTitle}" with you. Ask me to explain a concept, give an analogy, or quiz you on this lesson.`,
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
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
          messages: next.slice(-20),
          context: { lessonId, lessonTitle, courseTitle, ...(projectId ? { projectId, milestoneId } : {}) },
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        reply?: string;
        message?: string;
      } | null;
      // The server returns { reply } on success and { code, message } on any
      // non-2xx — surface the server's safe message, never crash on a shape we
      // don't recognize.
      const assistantReply =
        data && typeof data.reply === "string"
          ? data.reply
          : data && typeof data.message === "string"
            ? data.message
            : "The AI tutor couldn't respond right now. Please try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: assistantReply }]);
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
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-surface-hover)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--color-text-primary)]" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-medium">AI Tutor</p>
          <p className="truncate text-[11px] text-[var(--color-text-tertiary)]">Context: {lessonTitle}</p>
        </div>
      </div>

      <div ref={listRef} role="log" aria-label="Tutor conversation" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[92%] rounded-[var(--radius-md)] px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words",
              m.role === "user"
                ? "ml-auto bg-[var(--color-bg)] border border-[var(--color-border-strong)] text-[var(--color-text-primary)]"
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
        {(projectId ? ["Give me a hint for this milestone", "Help me design a failure-case check", "Explain the relevant source", "Review my latest saved attempt"] : QUICK_ACTIONS).map((qa) => (
          <button
            key={qa}
            onClick={() => send(qa)}
            disabled={loading}
            className="min-h-10 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[11px] text-[var(--color-text-tertiary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
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
          maxLength={4000}
          aria-label="Message the AI tutor"
          onChange={(e) => setInput(e.target.value)}
          placeholder={projectId ? "Ask about this milestone…" : "Ask about this lesson…"}
          className="h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-[13px] outline-none placeholder:text-[var(--color-text-tertiary)] focus:border-[var(--color-accent-solid)]"
        />
        <Button type="submit" size="icon" disabled={loading} aria-label="Send message">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
