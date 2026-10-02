import { z } from "zod";

/**
 * Validation schema for a piece of source evidence grounding a concept.
 */
export const ExtractedEvidenceSchema = z.object({
  filePath: z.string().min(1).max(300),
  section: z.string().max(200).optional().default(""),
  excerpt: z.string().min(5).max(1000),
  confidence: z.number().min(0).max(1).default(1.0),
});

export type ExtractedEvidence = z.infer<typeof ExtractedEvidenceSchema>;

/**
 * Validation schema for an extracted concept.
 */
export const ExtractedConceptSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(1000),
  importance: z.enum(["foundational", "core", "advanced"]).default("core"),
  confidence: z.number().min(0).max(1).default(1.0),
  evidence: z.array(ExtractedEvidenceSchema).min(1),
});

export type ExtractedConcept = z.infer<typeof ExtractedConceptSchema>;

/**
 * Validation schema for a relationship between two concepts.
 */
export const ExtractedRelationshipSchema = z.object({
  sourceConceptName: z.string().min(2).max(120),
  targetConceptName: z.string().min(2).max(120),
  type: z.enum(["prerequisite", "depends_on", "related_to", "implements", "uses"]).default("related_to"),
  confidence: z.number().min(0).max(1).default(1.0),
  reason: z.string().min(5).max(500),
  evidenceExcerpt: z.string().max(1000).optional().default(""),
});

export type ExtractedRelationship = z.infer<typeof ExtractedRelationshipSchema>;

/**
 * Top-level extraction output schema.
 */
export const ExtractionOutputSchema = z.object({
  concepts: z.array(ExtractedConceptSchema),
  relationships: z.array(ExtractedRelationshipSchema).default([]),
});

export type ExtractionOutput = z.infer<typeof ExtractionOutputSchema>;

/**
 * Persisted Concept with nested evidence and relationships for UI/API.
 */
export interface ConceptWithEvidence {
  id: string;
  name: string;
  slug: string;
  description: string;
  importance: "foundational" | "core" | "advanced";
  confidence: number;
  evidence: {
    id: string;
    filePath: string;
    lessonId: string | null;
    lessonSlug?: string;
    section: string | null;
    excerpt: string;
    confidence: number;
  }[];
  prerequisites: {
    targetConceptId: string;
    targetConceptName: string;
    type: string;
    reason: string | null;
    confidence: number;
  }[];
  dependents: {
    sourceConceptId: string;
    sourceConceptName: string;
    type: string;
    reason: string | null;
    confidence: number;
  }[];
}

export interface CourseIntelligenceReport {
  analysisRun: {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    version: string;
    model: string | null;
    errorMessage: string | null;
    conceptsCount: number;
    relationshipsCount: number;
    durationMs: number | null;
    completedAt: string | null;
  } | null;
  concepts: ConceptWithEvidence[];
  relationships: {
    id: string;
    sourceConceptId: string;
    sourceConceptName: string;
    targetConceptId: string;
    targetConceptName: string;
    type: string;
    confidence: number;
    reason: string | null;
    evidenceExcerpt: string | null;
  }[];
}
