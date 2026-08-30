// This spec is local-only: it exercises generateImplementationProposals()
// against the cached Day 24-27 pipeline output and the hand-authored
// implementation notes, plus small synthetic fixtures for edge cases. It
// makes no network calls, no LLM/API calls, and needs no credentials —
// unlike every API-resource spec in this suite.
import { buildAiTestPlanFromCachedSources } from '../../src/ai-test-planner/build-test-plan';
import {
  generateImplementationProposals,
  generateImplementationProposalsFromCachedSources,
} from '../../src/test-generator/generate-implementation-proposals';
import { IMPLEMENTATION_NOTES } from '../../src/test-generator/implementation-notes';
import { test, expect } from '../../src/fixtures/api.fixtures';
import type { AiTestPlanItem } from '../../src/ai-test-planner/ai-test-plan.schema';
import type {
  ImplementationNote,
  TestImplementationProposal,
} from '../../src/test-generator/test-implementation.schema';

function byId(proposals: TestImplementationProposal[], id: string): TestImplementationProposal {
  const found = proposals.find((p) => p.id === id);
  if (!found) {
    throw new Error(`proposal not found: ${id}`);
  }
  return found;
}

test.describe('Test Generator - generateImplementationProposalsFromCachedSources', () => {
  test('(a) valid plan items resolve correctly — exactly one proposal per curated note', () => {
    const proposals = generateImplementationProposalsFromCachedSources();
    expect(proposals).toHaveLength(IMPLEMENTATION_NOTES.length);
    expect(proposals).toHaveLength(4);
    expect(proposals.map((p) => p.id).sort()).toEqual(
      IMPLEMENTATION_NOTES.map((n) => n.planItemId).sort(),
    );
  });

  test('(c) classifies implementation status exactly as required for each of the 4 items', () => {
    const proposals = generateImplementationProposalsFromCachedSources();

    expect(byId(proposals, 'addPet-missing-required-fields').implementationStatus).toBe(
      'IMPLEMENTABLE',
    );
    expect(byId(proposals, 'getInventory-security-not-enforced').implementationStatus).toBe(
      'NEEDS_CLIENT_CAPABILITY',
    );
    expect(byId(proposals, 'findByStatus-collection-format').implementationStatus).toBe(
      'NEEDS_CLIENT_CAPABILITY',
    );
    expect(byId(proposals, 'declared-but-unobserved-400s').implementationStatus).toBe('DEFERRED');
  });

  test('the one IMPLEMENTABLE proposal carries a recommended test file and reuses PetClient.create', () => {
    const proposals = generateImplementationProposalsFromCachedSources();
    const proposal = byId(proposals, 'addPet-missing-required-fields');

    expect(proposal.recommendedTestFile).toBe('tests/pet/create-missing-required-fields.spec.ts');
    expect(proposal.requiredClientMethod).toContain('PetClient.create');
    expect(proposal.frameworkCapabilitiesSufficient).toBe(true);
    expect(proposal.expectedAssertions.length).toBeGreaterThan(0);
    expect(proposal.capabilityGapDetail).toBeUndefined();
  });

  test('both NEEDS_CLIENT_CAPABILITY proposals name a concrete gap and no recommended test file', () => {
    const proposals = generateImplementationProposalsFromCachedSources();

    for (const id of ['getInventory-security-not-enforced', 'findByStatus-collection-format']) {
      const proposal = byId(proposals, id);
      expect(proposal.frameworkCapabilitiesSufficient).toBe(false);
      expect(proposal.capabilityGapDetail).toBeTruthy();
      expect(proposal.recommendedTestFile).toBeUndefined();
      expect(proposal.expectedAssertions).toEqual([]);
    }
  });

  test('(e) no REJECT or DEFERRED-beyond-scope item is silently promoted to IMPLEMENTABLE', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const proposals = generateImplementationProposalsFromCachedSources();

    const rejectedPlanIds = plan.filter((p) => p.recommendedAction === 'REJECT').map((p) => p.id);
    expect(rejectedPlanIds).toHaveLength(5);
    for (const id of rejectedPlanIds) {
      expect(proposals.some((p) => p.id === id)).toBe(false);
    }

    // declared-but-unobserved-400s is OPTIONAL/DEFERRED-at-plan-level and
    // stays DEFERRED here too — never promoted to IMPLEMENTABLE.
    expect(byId(proposals, 'declared-but-unobserved-400s').implementationStatus).toBe('DEFERRED');
  });

  test('preserves traceability back to the originating candidate/drift finding/plan decision', () => {
    const proposals = generateImplementationProposalsFromCachedSources();
    const proposal = byId(proposals, 'addPet-missing-required-fields');

    expect(proposal.traceability).toEqual({
      candidateId: 'addPet-missing-required-fields',
      driftCategory: 'REQUIRED_FIELD_NOT_ENFORCED',
      planRecommendedAction: 'MUST',
    });
  });

  test('orders IMPLEMENTABLE first, then capability-blocked, then deferred', () => {
    const proposals = generateImplementationProposalsFromCachedSources();
    expect(proposals.map((p) => p.implementationStatus)).toEqual([
      'IMPLEMENTABLE',
      'NEEDS_CLIENT_CAPABILITY',
      'NEEDS_CLIENT_CAPABILITY',
      'DEFERRED',
    ]);
  });

  test('(d) is deterministic across repeated calls', () => {
    const first = generateImplementationProposalsFromCachedSources();
    const second = generateImplementationProposalsFromCachedSources();
    expect(second).toEqual(first);
  });
});

test.describe('Test Generator - generateImplementationProposals (pure function, synthetic fixtures)', () => {
  const mustPlanItem: AiTestPlanItem = {
    id: 'synthetic-must',
    operationId: 'createWidget',
    path: '/widget',
    method: 'post',
    driftCategory: 'ENUM_NOT_ENFORCED',
    scenario: 'synthetic scenario',
    reason: 'synthetic reason',
    risk: 'synthetic risk',
    priority: 'P1',
    contractSupport: 'synthetic contract support',
    knownLiveBehavior: 'synthetic known live behavior',
    existingCoverage: 'synthetic coverage',
    redundancyAssessment: 'synthetic redundancy',
    recommendedAction: 'MUST',
    confidence: 'HIGH',
    evidence: ['synthetic evidence'],
    candidateStatus: 'CANDIDATE',
  };

  const rejectPlanItem: AiTestPlanItem = {
    ...mustPlanItem,
    id: 'synthetic-reject',
    recommendedAction: 'REJECT',
    candidateStatus: 'REJECTED',
  };

  const implementableNote: ImplementationNote = {
    planItemId: 'synthetic-must',
    implementationStatus: 'IMPLEMENTABLE',
    requiredClientMethod: 'synthetic client method',
    requestConstructionApproach: 'synthetic request approach',
    schemaFactoryUsage: 'synthetic schema/factory usage',
    expectedAssertions: ['synthetic assertion'],
    frameworkCapabilitiesSufficient: true,
    recommendedTestFile: 'tests/synthetic/synthetic.spec.ts',
  };

  test('(b) throws when a note references an unknown plan item id (stale reference)', () => {
    const danglingNote: ImplementationNote = { ...implementableNote, planItemId: 'ghost' };
    expect(() => generateImplementationProposals([mustPlanItem], [danglingNote])).toThrow(
      /unknown AiTestPlanItem id/,
    );
  });

  test('(e) throws rather than reconsider a note that targets a REJECT-classified plan item', () => {
    const noteForRejected: ImplementationNote = {
      ...implementableNote,
      planItemId: 'synthetic-reject',
    };
    expect(() =>
      generateImplementationProposals([mustPlanItem, rejectPlanItem], [noteForRejected]),
    ).toThrow(/recommended REJECT/);
  });

  test('assembles a full proposal from a matching MUST plan item + IMPLEMENTABLE note', () => {
    const result = generateImplementationProposals([mustPlanItem], [implementableNote]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'synthetic-must',
      implementationStatus: 'IMPLEMENTABLE',
      recommendedTestFile: 'tests/synthetic/synthetic.spec.ts',
    });
    expect(result[0]?.traceability).toEqual({
      candidateId: 'synthetic-must',
      driftCategory: 'ENUM_NOT_ENFORCED',
      planRecommendedAction: 'MUST',
    });
  });

  test('sanity: every real implementation note resolves against a real, non-REJECT Day 27 plan item', () => {
    const plan = buildAiTestPlanFromCachedSources();
    for (const note of IMPLEMENTATION_NOTES) {
      const planItem = plan.find((p) => p.id === note.planItemId);
      expect(planItem).toBeDefined();
      expect(planItem?.recommendedAction).not.toBe('REJECT');
    }
  });
});
