import { buildAiTestPlanFromCachedSources } from '../ai-test-planner/build-test-plan';
import type { AiTestPlanItem } from '../ai-test-planner/ai-test-plan.schema';
import { IMPLEMENTATION_NOTES } from './implementation-notes';
import {
  TestImplementationProposalSchema,
  type ImplementationNote,
  type TestImplementationProposal,
} from './test-implementation.schema';

const STATUS_RANK: Record<TestImplementationProposal['implementationStatus'], number> = {
  IMPLEMENTABLE: 0,
  NEEDS_CLIENT_CAPABILITY: 1,
  NEEDS_SCHEMA_CHANGE: 1,
  DEFERRED: 2,
};

/**
 * Pure, deterministic translation of approved AI Test Plan items into
 * structured implementation proposals — never an executable test, never a
 * file write. Only ever processes the plan items an ImplementationNote
 * exists for (deliberately never all 9 — see implementation-notes.ts); a
 * note that resolves to a REJECT-classified plan item is a bug in the
 * dataset, not a scenario to honor, and fails loudly rather than silently
 * reconsidering a settled decision.
 */
export function generateImplementationProposals(
  planItems: AiTestPlanItem[],
  notes: ImplementationNote[],
): TestImplementationProposal[] {
  const proposals = notes.map((note): TestImplementationProposal => {
    const planItem = planItems.find((p) => p.id === note.planItemId);
    if (!planItem) {
      throw new Error(
        `ImplementationNote references unknown AiTestPlanItem id: ${note.planItemId}`,
      );
    }
    if (planItem.recommendedAction === 'REJECT') {
      throw new Error(
        `ImplementationNote targets "${note.planItemId}", which the AI Test Planner ` +
          'recommended REJECT — the Test Generator must never reconsider a rejected decision.',
      );
    }

    return TestImplementationProposalSchema.parse({
      id: planItem.id,
      operationId: planItem.operationId,
      path: planItem.path,
      method: planItem.method,
      scenario: planItem.scenario,
      rationale: planItem.reason,
      implementationStatus: note.implementationStatus,
      requiredClientMethod: note.requiredClientMethod,
      requestConstructionApproach: note.requestConstructionApproach,
      schemaFactoryUsage: note.schemaFactoryUsage,
      expectedAssertions: note.expectedAssertions,
      frameworkCapabilitiesSufficient: note.frameworkCapabilitiesSufficient,
      recommendedTestFile: note.recommendedTestFile,
      capabilityGapDetail: note.capabilityGapDetail,
      traceability: {
        candidateId: planItem.id,
        driftCategory: planItem.driftCategory,
        planRecommendedAction: planItem.recommendedAction,
      },
    });
  });

  return proposals.sort((a, b) => {
    const statusDiff = STATUS_RANK[a.implementationStatus] - STATUS_RANK[b.implementationStatus];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

/** Convenience wrapper over the cached Day 24-27 pipeline and the curated implementation notes. */
export function generateImplementationProposalsFromCachedSources(): TestImplementationProposal[] {
  return generateImplementationProposals(buildAiTestPlanFromCachedSources(), IMPLEMENTATION_NOTES);
}
