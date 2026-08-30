// This spec is local-only: it exercises buildAiTestPlan() against the
// cached Contract Model / Drift Engine / Negative Test Intelligence outputs
// and the hand-authored plan annotations, plus small synthetic fixtures for
// edge cases. It makes no network calls, no LLM/API calls, and needs no
// credentials — unlike every API-resource spec in this suite.
import { detectDriftFromCachedSources } from '../../src/drift/detect-drift';
import { generateCandidatesFromCachedSources } from '../../src/negative-tests/generate-candidates';
import {
  buildAiTestPlan,
  buildAiTestPlanFromCachedSources,
} from '../../src/ai-test-planner/build-test-plan';
import { PLAN_ANNOTATIONS } from '../../src/ai-test-planner/plan-annotations';
import { test, expect } from '../../src/fixtures/api.fixtures';
import type { DriftFinding } from '../../src/drift/drift.schema';
import type { NegativeTestCandidate } from '../../src/negative-tests/negative-test.schema';
import type { AiTestPlanItem, PlanAnnotation } from '../../src/ai-test-planner/ai-test-plan.schema';

function byId(items: AiTestPlanItem[], id: string): AiTestPlanItem {
  const found = items.find((i) => i.id === id);
  if (!found) {
    throw new Error(`plan item not found: ${id}`);
  }
  return found;
}

test.describe('AI Test Planner - buildAiTestPlanFromCachedSources', () => {
  test('produces exactly one plan item per Day 26 candidate, no new candidates invented', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const candidates = generateCandidatesFromCachedSources();

    expect(plan).toHaveLength(candidates.length);
    expect(plan).toHaveLength(9);
    expect(plan.map((p) => p.id).sort()).toEqual(candidates.map((c) => c.id).sort());
  });

  test('classifies recommendedAction exactly as required: 2 MUST, 2 OPTIONAL, 5 REJECT', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const countOf = (action: AiTestPlanItem['recommendedAction']): number =>
      plan.filter((p) => p.recommendedAction === action).length;

    expect(countOf('MUST')).toBe(2);
    expect(countOf('SHOULD')).toBe(0);
    expect(countOf('OPTIONAL')).toBe(2);
    expect(countOf('REJECT')).toBe(5);
  });

  test('does not silently promote REJECTED or DEFERRED candidates', () => {
    const plan = buildAiTestPlanFromCachedSources();

    const rejectedCandidateIds = [
      'addPet-status-enum-not-enforced',
      'findByStatus-enum-not-enforced',
      'loginUser-missing-password',
      'security-not-enforced-per-operation-duplication',
      'status-code-mismatch-dedicated-tests',
    ];
    const deferredCandidateIds = ['findByStatus-collection-format', 'declared-but-unobserved-400s'];

    for (const id of rejectedCandidateIds) {
      const item = byId(plan, id);
      expect(item.candidateStatus).toBe('REJECTED');
      expect(item.recommendedAction).toBe('REJECT');
    }
    for (const id of deferredCandidateIds) {
      const item = byId(plan, id);
      expect(item.candidateStatus).toBe('DEFERRED');
      expect(item.recommendedAction).toBe('OPTIONAL');
    }
  });

  test('orders MUST first, then OPTIONAL, then REJECT, by priority within each group', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const actionSequence = plan.map((p) => p.recommendedAction);

    expect(actionSequence).toEqual([
      'MUST',
      'MUST',
      'OPTIONAL',
      'OPTIONAL',
      'REJECT',
      'REJECT',
      'REJECT',
      'REJECT',
      'REJECT',
    ]);

    const mustGroup = plan.filter((p) => p.recommendedAction === 'MUST');
    expect(mustGroup[0]?.id).toBe('getInventory-security-not-enforced');
    expect(mustGroup[0]?.priority).toBe('P0');
    expect(mustGroup[1]?.id).toBe('addPet-missing-required-fields');
    expect(mustGroup[1]?.priority).toBe('P1');
  });

  test('preserves scenario, reason, priority, confidence, and evidence from the real candidate', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const candidates = generateCandidatesFromCachedSources();
    const candidate = candidates.find((c) => c.id === 'getInventory-security-not-enforced')!;
    const item = byId(plan, 'getInventory-security-not-enforced');

    expect(item.scenario).toBe(candidate.scenario);
    expect(item.reason).toBe(candidate.rationale);
    expect(item.priority).toBe(candidate.priority);
    expect(item.confidence).toBe(candidate.confidence);
    expect(item.evidence).toEqual(candidate.evidence);
  });

  test('resolves contractSupport/knownLiveBehavior from the real DriftFinding[] for a driftLink candidate', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const findings = detectDriftFromCachedSources();
    const item = byId(plan, 'addPet-missing-required-fields');

    const realFindings = findings.filter(
      (f) => f.operationId === 'addPet' && f.category === 'REQUIRED_FIELD_NOT_ENFORCED',
    );
    expect(realFindings).toHaveLength(2); // name + photoUrls

    for (const finding of realFindings) {
      expect(item.contractSupport).toContain(finding.declared);
      expect(item.knownLiveBehavior).toContain(finding.observed);
    }
  });

  test('uses the annotation fallback, not a DriftFinding lookup, for the candidate with no driftLink', () => {
    const plan = buildAiTestPlanFromCachedSources();
    const annotation = PLAN_ANNOTATIONS.find(
      (a) => a.candidateId === 'declared-but-unobserved-400s',
    )!;
    const item = byId(plan, 'declared-but-unobserved-400s');

    expect(item.driftCategory).toBeUndefined();
    expect(item.contractSupport).toBe(annotation.fallbackContractSupport);
    expect(item.knownLiveBehavior).toBe(annotation.fallbackKnownLiveBehavior);
  });

  test('is deterministic across repeated calls', () => {
    const first = buildAiTestPlanFromCachedSources();
    const second = buildAiTestPlanFromCachedSources();
    expect(second).toEqual(first);
  });
});

test.describe('AI Test Planner - buildAiTestPlan (pure function, synthetic fixtures)', () => {
  const syntheticCandidate: NegativeTestCandidate = {
    id: 'synthetic-candidate',
    operationId: 'createWidget',
    path: '/widget',
    method: 'post',
    driftCategory: 'ENUM_NOT_ENFORCED',
    scenario: 'synthetic scenario',
    expectedOutcome: 'synthetic outcome',
    rationale: 'synthetic rationale',
    evidence: ['synthetic evidence'],
    automatable: true,
    status: 'CANDIDATE',
    priority: 'P1',
    confidence: 'HIGH',
  };

  const syntheticFinding: DriftFinding = {
    operationId: 'createWidget',
    path: '/widget',
    method: 'post',
    category: 'ENUM_NOT_ENFORCED',
    declared: 'label: one of {a, b}',
    observed: 'label: arbitrary value accepted',
    severity: 'P2',
    evidence: 'synthetic evidence',
    explanation: 'synthetic explanation',
  };

  const syntheticAnnotation: PlanAnnotation = {
    candidateId: 'synthetic-candidate',
    risk: 'synthetic risk',
    existingCoverage: 'synthetic coverage',
    redundancyAssessment: 'synthetic redundancy',
    recommendedAction: 'SHOULD',
  };

  test('assembles a full item from a matching candidate + finding + annotation', () => {
    const result = buildAiTestPlan([syntheticCandidate], [syntheticFinding], [syntheticAnnotation]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'synthetic-candidate',
      contractSupport: 'label: one of {a, b}',
      knownLiveBehavior: 'label: arbitrary value accepted',
      recommendedAction: 'SHOULD',
    });
  });

  test('throws when an annotation references an unknown candidate id', () => {
    const danglingAnnotation: PlanAnnotation = { ...syntheticAnnotation, candidateId: 'ghost' };
    expect(() =>
      buildAiTestPlan([syntheticCandidate], [syntheticFinding], [danglingAnnotation]),
    ).toThrow(/unknown candidate id/);
  });

  test('throws when a candidate has no annotation at all', () => {
    expect(() => buildAiTestPlan([syntheticCandidate], [syntheticFinding], [])).toThrow(
      /No PlanAnnotation found/,
    );
  });

  test("throws when a candidate's driftCategory has no matching DriftFinding", () => {
    expect(() => buildAiTestPlan([syntheticCandidate], [], [syntheticAnnotation])).toThrow(
      /does not exist/,
    );
  });

  test('sanity: every real annotation resolves against a real Day 26 candidate', () => {
    const candidates = generateCandidatesFromCachedSources();
    const knownIds = new Set(candidates.map((c) => c.id));
    for (const annotation of PLAN_ANNOTATIONS) {
      expect(knownIds.has(annotation.candidateId)).toBe(true);
    }
  });
});
