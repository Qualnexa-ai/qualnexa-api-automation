import { detectDriftFromCachedSources } from '../drift/detect-drift';
import type { DriftFinding } from '../drift/drift.schema';
import { generateCandidatesFromCachedSources } from '../negative-tests/generate-candidates';
import type { NegativeTestCandidate } from '../negative-tests/negative-test.schema';
import { PLAN_ANNOTATIONS } from './plan-annotations';
import {
  AiTestPlanItemSchema,
  type AiTestPlanItem,
  type PlanAnnotation,
} from './ai-test-plan.schema';

const ACTION_RANK: Record<AiTestPlanItem['recommendedAction'], number> = {
  MUST: 0,
  SHOULD: 1,
  OPTIONAL: 2,
  REJECT: 3,
};

const PRIORITY_RANK: Record<AiTestPlanItem['priority'], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

function resolveContractFacts(
  findings: DriftFinding[],
  candidate: NegativeTestCandidate,
  annotation: PlanAnnotation,
): { contractSupport: string; knownLiveBehavior: string } {
  if (!candidate.driftCategory) {
    // No linked DriftFinding to pull from — the annotation must supply both
    // (enforced by PlanAnnotationSchema's refine()).
    return {
      contractSupport: annotation.fallbackContractSupport!,
      knownLiveBehavior: annotation.fallbackKnownLiveBehavior!,
    };
  }

  const matches = findings.filter(
    (f) => f.operationId === candidate.operationId && f.category === candidate.driftCategory,
  );

  if (matches.length === 0) {
    // The candidate itself already validated this link when it was built
    // (Day 26); this only fires if the two pipelines fall out of sync with
    // each other — fail loudly rather than silently drop the fact.
    throw new Error(
      `AiTestPlanItem for candidate "${candidate.id}" references a DriftFinding for ` +
        `operationId="${candidate.operationId}" category=${candidate.driftCategory} that does not exist`,
    );
  }

  return {
    contractSupport: matches.map((f) => f.declared).join('; '),
    knownLiveBehavior: matches.map((f) => f.observed).join('; '),
  };
}

/**
 * Pure, deterministic assembly of the AI Test Plan from Day 24-26's outputs
 * plus this session's own hand-authored annotations. Never invents a new
 * candidate, never promotes a REJECTED/DEFERRED candidate beyond what its
 * annotation says, and never re-derives a contract/live fact that
 * DriftFinding[] already established. Produces recommendation data only —
 * no file is written, no test is generated, nothing executes.
 */
export function buildAiTestPlan(
  candidates: NegativeTestCandidate[],
  findings: DriftFinding[],
  annotations: PlanAnnotation[],
): AiTestPlanItem[] {
  const candidateIds = new Set(candidates.map((c) => c.id));
  for (const annotation of annotations) {
    if (!candidateIds.has(annotation.candidateId)) {
      throw new Error(`PlanAnnotation references unknown candidate id: ${annotation.candidateId}`);
    }
  }

  const items = candidates.map((candidate): AiTestPlanItem => {
    const annotation = annotations.find((a) => a.candidateId === candidate.id);
    if (!annotation) {
      throw new Error(`No PlanAnnotation found for candidate "${candidate.id}"`);
    }

    const { contractSupport, knownLiveBehavior } = resolveContractFacts(
      findings,
      candidate,
      annotation,
    );

    return AiTestPlanItemSchema.parse({
      id: candidate.id,
      operationId: candidate.operationId,
      path: candidate.path,
      method: candidate.method,
      driftCategory: candidate.driftCategory,
      scenario: candidate.scenario,
      reason: candidate.rationale,
      risk: annotation.risk,
      priority: candidate.priority,
      contractSupport,
      knownLiveBehavior,
      existingCoverage: annotation.existingCoverage,
      redundancyAssessment: annotation.redundancyAssessment,
      recommendedAction: annotation.recommendedAction,
      confidence: candidate.confidence,
      evidence: candidate.evidence,
      candidateStatus: candidate.status,
    });
  });

  return items.sort((a, b) => {
    const actionDiff = ACTION_RANK[a.recommendedAction] - ACTION_RANK[b.recommendedAction];
    if (actionDiff !== 0) {
      return actionDiff;
    }
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

/** Convenience wrapper over the cached spec, real drift/candidate data, and the curated annotations. */
export function buildAiTestPlanFromCachedSources(): AiTestPlanItem[] {
  return buildAiTestPlan(
    generateCandidatesFromCachedSources(),
    detectDriftFromCachedSources(),
    PLAN_ANNOTATIONS,
  );
}
