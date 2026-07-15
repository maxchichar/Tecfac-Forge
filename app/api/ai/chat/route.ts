import { NextRequest, NextResponse } from "next/server";
import { getLessonById } from "@/lib/mock-data";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  context: { lessonId: string; lessonTitle: string; courseTitle: string };
}

// Swap this mock lookup for a real DB query (progress, notes, prior lessons)
// once Prisma is wired up — see prisma/schema.prisma and README.md.
function buildSystemPrompt(context: RequestBody["context"]) {
  return [
    "You are the AI Tutor inside Tecfac Forge, an app that turns documentation and repositories into structured courses.",
    `The learner is currently on the lesson "${context.lessonTitle}" in the course "${context.courseTitle}".`,
    "Keep answers scoped to what a learner at this point in the course would know.",
    "Never reveal full project solutions — offer hints and ask guiding questions instead, unless the learner explicitly asks for the answer.",
    "Keep responses concise: a few sentences, or a short list, not an essay.",
  ].join(" ");
}

function stubReply(lastUserMessage: string, context: RequestBody["context"]) {
  return (
    `(No OPENAI_API_KEY configured, so this is a placeholder response — see README.md.)\n\n` +
    `On "${context.lessonTitle}", about "${lastUserMessage.slice(0, 80)}": ` +
    `once your API key is set, I'll answer using the real lesson content, your notes, and your progress in ${context.courseTitle}.`
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const { messages, context } = body;
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: stubReply(lastUserMessage, context) });
  }

  // Pull the actual lesson markdown into context so answers are grounded,
  // not generic — this is what makes the tutor "context aware."
  const lesson = getLessonById(context.lessonId);
  const lessonExcerpt = lesson?.markdown?.slice(0, 4000) ?? "";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        instructions: buildSystemPrompt(context) + (lessonExcerpt ? `\n\nLesson content:\n${lessonExcerpt}` : ""),
        input: messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI Responses API error:", errText);
      return NextResponse.json(
        { reply: "The AI tutor is temporarily unavailable. Please try again shortly." },
        { status: 200 }
      );
    }

    const data = await response.json();
    // Responses API returns output as an array of items; extract the text.
    const text =
      data.output_text ??
      data.output?.flatMap((o: any) => o.content?.map((c: any) => c.text) ?? []).join("\n") ??
      "I couldn't generate a response for that — try rephrasing.";

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("AI tutor request failed:", err);
    return NextResponse.json(
      { reply: "The AI tutor is temporarily unavailable. Please try again shortly." },
      { status: 200 }
    );
  }
}
