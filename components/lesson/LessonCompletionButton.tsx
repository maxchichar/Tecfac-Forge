"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface LessonCompletionButtonProps {
  lessonId: string;
  initialCompleted: boolean;
}

export function LessonCompletionButton({ lessonId, initialCompleted }: LessonCompletionButtonProps) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setLoading(true);
    setError(null);
    const nextState = !completed;

    try {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextState }),
      });

      if (!res.ok) {
        throw new Error("Failed to update progress.");
      }

      const data = await res.json();
      if (data.ok && typeof data.completed === "boolean") {
        setCompleted(data.completed);
      } else {
        setCompleted(nextState);
      }
    } catch {
      setError("Failed to save progress. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={completed ? "secondary" : "primary"}
        size="sm"
        onClick={toggle}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : completed ? (
          <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
        {completed ? "Completed" : "Mark as complete"}
      </Button>
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}
