import { ConceptImportance, RelationshipType } from "@prisma/client";

export interface ConceptOrderingInput {
  id: string;
  name: string;
  slug: string;
  importance: ConceptImportance;
  confidence: number;
  orderHint?: number;
}

export interface RelationshipOrderingInput {
  sourceConceptId: string;
  targetConceptId: string;
  type: RelationshipType;
  confidence: number;
}

export interface OrderedConceptResult {
  concept: ConceptOrderingInput;
  sequenceOrder: number;
  prerequisiteIds: string[];
  dependentIds: string[];
  depth: number;
}

export interface CurriculumOrderingOutput {
  orderedConcepts: OrderedConceptResult[];
  hasCycle: boolean;
  cycleNodeIds: string[];
}

const IMPORTANCE_WEIGHT: Record<ConceptImportance, number> = {
  foundational: 0,
  core: 1,
  advanced: 2,
};

/**
 * Deterministically orders concepts into a curriculum sequence based on prerequisite
 * relationships, importance tiers, and source ordering.
 *
 * Guarantees:
 * 1. Topological validity: if A is a prerequisite for B, A appears before B (unless a cycle forces a deterministic break).
 * 2. Cycle resilience: cycles are detected and broken deterministically (foundational first) without crashing or looping infinitely.
 * 3. Isolated concepts: concepts without relationships are integrated naturally by importance and appearance order.
 * 4. Missing prerequisites: relationships pointing to nonexistent IDs are safely pruned with zero corruption.
 * 5. Weak confidence: relationships with confidence < 0.5 are excluded from blocking dependencies.
 */
export function computeCurriculumOrder(
  concepts: ConceptOrderingInput[],
  relationships: RelationshipOrderingInput[],
  minConfidence = 0.5
): CurriculumOrderingOutput {
  if (concepts.length === 0) {
    return { orderedConcepts: [], hasCycle: false, cycleNodeIds: [] };
  }

  const conceptMap = new Map<string, ConceptOrderingInput>();
  for (const c of concepts) {
    conceptMap.set(c.id, c);
  }

  // prereqId -> set of concept IDs that depend on it
  const dependentsMap = new Map<string, Set<string>>();
  // conceptId -> set of prereq concept IDs required before it
  const prerequisitesMap = new Map<string, Set<string>>();

  for (const c of concepts) {
    dependentsMap.set(c.id, new Set());
    prerequisitesMap.set(c.id, new Set());
  }

  // Filter and populate valid dependency edges
  for (const rel of relationships) {
    if (rel.confidence < minConfidence) continue;

    // Prerequisite: source is prereq of target
    // Depends_on: source depends on target, so target is prereq of source
    let prereqId: string | null = null;
    let dependentId: string | null = null;

    if (rel.type === "prerequisite") {
      prereqId = rel.sourceConceptId;
      dependentId = rel.targetConceptId;
    } else if (rel.type === "depends_on") {
      prereqId = rel.targetConceptId;
      dependentId = rel.sourceConceptId;
    }

    if (!prereqId || !dependentId) continue;
    if (prereqId === dependentId) continue; // ignore self-dependency

    // Verify both nodes exist in the current concept set
    if (!conceptMap.has(prereqId) || !conceptMap.has(dependentId)) continue;

    prerequisitesMap.get(dependentId)!.add(prereqId);
    dependentsMap.get(prereqId)!.add(dependentId);
  }

  // In-degree tracking for Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const [id, prereqs] of prerequisitesMap.entries()) {
    inDegree.set(id, prereqs.size);
  }

  // Stable comparator for ready nodes
  const compareConcepts = (aId: string, bId: string): number => {
    const a = conceptMap.get(aId)!;
    const b = conceptMap.get(bId)!;

    // 1. Importance (foundational before core before advanced)
    const impDiff = IMPORTANCE_WEIGHT[a.importance] - IMPORTANCE_WEIGHT[b.importance];
    if (impDiff !== 0) return impDiff;

    // 2. Original order hint (e.g. lesson/module order in course)
    const aOrder = a.orderHint ?? 9999;
    const bOrder = b.orderHint ?? 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;

    // 3. Confidence (higher confidence first)
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;

    // 4. Alphabetical tie-breaker
    return a.slug.localeCompare(b.slug);
  };

  // Ready set: all nodes with in-degree 0
  const ready: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      ready.push(id);
    }
  }
  ready.sort(compareConcepts);

  const orderedIds: string[] = [];
  const depthMap = new Map<string, number>();

  for (const c of concepts) {
    depthMap.set(c.id, 0);
  }

  // Kahn's algorithm execution
  while (ready.length > 0) {
    const currentId = ready.shift()!;
    orderedIds.push(currentId);
    const currentDepth = depthMap.get(currentId)!;

    const deps = dependentsMap.get(currentId) || new Set();
    for (const depId of deps) {
      const currentIn = inDegree.get(depId)! - 1;
      inDegree.set(depId, currentIn);

      // Depth is max(depth of all satisfied prerequisites) + 1
      const depDepth = Math.max(depthMap.get(depId)!, currentDepth + 1);
      depthMap.set(depId, depDepth);

      if (currentIn === 0) {
        ready.push(depId);
        ready.sort(compareConcepts);
      }
    }
  }

  // Cycle Handling
  let hasCycle = false;
  const cycleNodeIds: string[] = [];

  if (orderedIds.length < concepts.length) {
    hasCycle = true;
    const remaining = concepts.filter((c) => !orderedIds.includes(c.id));

    for (const r of remaining) {
      cycleNodeIds.push(r.id);
    }

    // Sort remaining nodes by lowest remaining in-degree, then standard importance
    remaining.sort((a, b) => {
      const aDeg = inDegree.get(a.id) ?? 0;
      const bDeg = inDegree.get(b.id) ?? 0;
      if (aDeg !== bDeg) return aDeg - bDeg;
      return compareConcepts(a.id, b.id);
    });

    for (const r of remaining) {
      orderedIds.push(r.id);
      // Approximate depth based on remaining
      depthMap.set(r.id, Math.max(depthMap.get(r.id)!, 1));
    }
  }

  const orderedConcepts: OrderedConceptResult[] = orderedIds.map((id, index) => {
    const concept = conceptMap.get(id)!;
    return {
      concept,
      sequenceOrder: index + 1,
      prerequisiteIds: Array.from(prerequisitesMap.get(id) || []),
      dependentIds: Array.from(dependentsMap.get(id) || []),
      depth: depthMap.get(id) || 0,
    };
  });

  return {
    orderedConcepts,
    hasCycle,
    cycleNodeIds,
  };
}
