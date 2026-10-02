import { envString, DEFAULT_AI_MODEL, DEFAULT_FAST_AI_MODEL } from "@/lib/env";

export const TUTOR_MODES = ["auto", "hint", "explain", "challenge", "debug", "review"] as const;
export type TutorMode = typeof TUTOR_MODES[number];
export type TeachingMode = Exclude<TutorMode, "auto">;
export const MODE_INSTRUCTIONS: Record<TeachingMode, string> = {
  hint: "Give one small hint linked to a source reference. Ask the learner to attempt the next step before revealing more.",
  explain: "Explain the central idea in a few sentences, connect it to the source, then ask the learner to predict an outcome.",
  challenge: "Ask one source-grounded question or small practical challenge. Do not reveal its answer until the learner attempts it; then give specific feedback.",
  debug: "Ask for the observed result and expected result if missing. Propose one hypothesis and a check grounded in the source. Never claim you executed code.",
  review: "Compare the learner's saved work to the stated criteria. Identify evidence, one gap, and one next action. Do not award grades or mastery.",
};
/** Model selection is deterministic and adds no paid classification call. */
export function routeTutor(mode: TutorMode) {
  const qualityModel = envString("GROQ_MODEL") ?? DEFAULT_AI_MODEL;
  const fastModel = envString("GROQ_FAST_MODEL") ?? DEFAULT_FAST_AI_MODEL;
  return { mode: mode === "auto" ? "hint" as const : mode, model: ["auto", "debug", "review"].includes(mode) ? qualityModel : fastModel };
}
