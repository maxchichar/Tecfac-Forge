/**
 * Derives a concise, source-grounded learning objective for a concept.
 * Answers: "What should the learner be able to understand or do after studying this concept?"
 */
export function deriveLearningObjective(
  conceptName: string,
  description: string,
  evidenceExcerpt?: string | null
): string {
  const cleanName = conceptName.trim();
  const lowerName = cleanName.toLowerCase();

  // If evidence excerpt exists, extract a salient contextual phrase
  let contextualClause = "";
  if (evidenceExcerpt && evidenceExcerpt.trim().length > 15) {
    const cleanExcerpt = evidenceExcerpt
      .replace(/[*_`#[\]()]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Look for key phrases or verbs
    const sentences = cleanExcerpt.split(/(?<=[.!?])\s+/);
    const firstSentence = sentences[0] || "";

    if (firstSentence.length > 20 && firstSentence.length < 150) {
      contextualClause = ` and examine how ${firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1).replace(/[.!?]$/, "")}`;
    }
  }

  // Choose appropriate Bloom's taxonomy action verb based on concept characteristics
  let actionVerb = "Understand";
  if (lowerName.includes("guide") || lowerName.includes("requirements") || lowerName.includes("setup")) {
    actionVerb = "Follow and configure";
  } else if (lowerName.includes("syntax") || lowerName.includes("types") || lowerName.includes("functions")) {
    actionVerb = "Explain and write";
  } else if (lowerName.includes("architecture") || lowerName.includes("concurrency") || lowerName.includes("ownership")) {
    actionVerb = "Reason about and apply";
  } else if (lowerName.includes("submitting") || lowerName.includes("contributing") || lowerName.includes("pr")) {
    actionVerb = "Execute";
  }

  if (contextualClause) {
    return `${actionVerb} the principles of ${cleanName}${contextualClause}.`;
  }

  // Fallback using description
  if (description && description.trim().length > 10 && !description.toLowerCase().startsWith("concepts related to")) {
    const cleanDesc = description.replace(/[.!?]$/, "").trim();
    return `${actionVerb} ${cleanName}: ${cleanDesc.charAt(0).toLowerCase() + cleanDesc.slice(1)}.`;
  }

  return `${actionVerb} the core concepts and real-world usage of ${cleanName} within this codebase.`;
}
