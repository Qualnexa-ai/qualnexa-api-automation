// This spec is local-only: it exercises generateCandidates() against the
// cached Contract Model, the real Drift Engine output, and the curated
// candidate seeds, plus small synthetic fixtures for edge cases. It makes
// no network calls, unlike every API-resource spec in this suite.
import { detectDriftFromCachedSources } from '../../src/drift/detect-drift';
import {
  generateCandidates,
  generateCandidatesFromCachedSources,
} from '../../src/negative-tests/generate-candidates';
import { CANDIDATE_SEEDS } from '../../src/negative-tests/candidate-seeds';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { loadContractModel } from '../../src/contract/load-contract';
import type { ContractModel } from '../../src/contract/contract.schema';
import type { DriftFinding } from '../../src/drift/drift.schema';
import type {
  CandidateSeed,
  NegativeTestCandidate,
} from '../../src/negative-tests/negative-test.schema';

function byId(candidates: NegativeTestCandidate[], id: string): NegativeTestCandidate {
  const found = candidates.find((c) => c.id === id);
  if (!found) {
    throw new Error(`candidate not found: ${id}`);
  }
  return found;
}

test.describe('Negative Test Intelligence - generateCandidatesFromCachedSources', () => {
  test('produces exactly one candidate per curated seed', () => {
    const candidates = generateCandidatesFromCachedSources();
    expect(candidates).toHaveLength(CANDIDATE_SEEDS.length);
    expect(candidates).toHaveLength(9);
  });

  test('classifies A/B/C exactly as curated: 2 CANDIDATE, 2 DEFERRED, 5 REJECTED', () => {
    const candidates = generateCandidatesFromCachedSources();
    const countOf = (status: NegativeTestCandidate['status']): number =>
      candidates.filter((c) => c.status === status).length;

    expect(countOf('CANDIDATE')).toBe(2);
    expect(countOf('DEFERRED')).toBe(2);
    expect(countOf('REJECTED')).toBe(5);
  });

  test('rejected and deferred candidates are not accidentally promoted to CANDIDATE', () => {
    const candidates = generateCandidatesFromCachedSources();
    const rejectedIds = [
      'addPet-status-enum-not-enforced',
      'findByStatus-enum-not-enforced',
      'loginUser-missing-password',
      'security-not-enforced-per-operation-duplication',
      'status-code-mismatch-dedicated-tests',
    ];
    const deferredIds = ['findByStatus-collection-format', 'declared-but-unobserved-400s'];

    for (const id of rejectedIds) {
      expect(byId(candidates, id).status).toBe('REJECTED');
    }
    for (const id of deferredIds) {
      expect(byId(candidates, id).status).toBe('DEFERRED');
    }
  });

  test('orders CANDIDATE items first, then DEFERRED, then REJECTED, by priority within each group', () => {
    const candidates = generateCandidatesFromCachedSources();
    const statusSequence = candidates.map((c) => c.status);

    // CANDIDATE(2) then DEFERRED(2) then REJECTED(5), never interleaved.
    expect(statusSequence).toEqual([
      'CANDIDATE',
      'CANDIDATE',
      'DEFERRED',
      'DEFERRED',
      'REJECTED',
      'REJECTED',
      'REJECTED',
      'REJECTED',
      'REJECTED',
    ]);

    // Within CANDIDATE, P0 (getInventory) sorts before P1 (addPet).
    const candidateGroup = candidates.filter((c) => c.status === 'CANDIDATE');
    expect(candidateGroup[0]?.id).toBe('getInventory-security-not-enforced');
    expect(candidateGroup[0]?.priority).toBe('P0');
    expect(candidateGroup[1]?.id).toBe('addPet-missing-required-fields');
    expect(candidateGroup[1]?.priority).toBe('P1');
  });

  test('resolves addPet-missing-required-fields evidence from the real DriftFinding[] (both fields)', () => {
    const candidates = generateCandidatesFromCachedSources();
    const findings = detectDriftFromCachedSources();

    const candidate = byId(candidates, 'addPet-missing-required-fields');
    const realFindings = findings.filter(
      (f) => f.operationId === 'addPet' && f.category === 'REQUIRED_FIELD_NOT_ENFORCED',
    );

    expect(realFindings).toHaveLength(2); // name + photoUrls
    expect(candidate.evidence.sort()).toEqual(realFindings.map((f) => f.evidence).sort());
  });

  test('preserves rationale and prior-decision citations verbatim from the seed', () => {
    const candidates = generateCandidatesFromCachedSources();
    const seed = CANDIDATE_SEEDS.find((s) => s.id === 'loginUser-missing-password')!;
    const candidate = byId(candidates, 'loginUser-missing-password');

    expect(candidate.rationale).toBe(seed.rationale);
    expect(candidate.priorDecisionRef).toBe(seed.priorDecisionRef);
  });

  test('uses fallbackEvidence, not a DriftFinding lookup, for seeds with no driftLink', () => {
    const candidates = generateCandidatesFromCachedSources();
    const seed = CANDIDATE_SEEDS.find((s) => s.id === 'declared-but-unobserved-400s')!;
    const candidate = byId(candidates, 'declared-but-unobserved-400s');

    expect(seed.driftLink).toBeUndefined();
    expect(candidate.driftCategory).toBeUndefined();
    expect(candidate.evidence).toEqual([seed.fallbackEvidence]);
  });

  test('is deterministic across repeated calls', () => {
    const first = generateCandidatesFromCachedSources();
    const second = generateCandidatesFromCachedSources();
    expect(second).toEqual(first);
  });
});

test.describe('Negative Test Intelligence - generateCandidates (pure function, synthetic fixtures)', () => {
  function minimalModel(overrides: Partial<ContractModel> = {}): ContractModel {
    return { operations: [], definitions: [], ...overrides };
  }

  const widgetOp: ContractModel['operations'][number] = {
    path: '/widget',
    method: 'post',
    operationId: 'createWidget',
    parameters: [],
    responses: [{ statusCode: '200' }],
    security: [],
    consumes: [],
    deprecated: false,
  };

  test('resolves a driftLink seed against a matching synthetic DriftFinding', () => {
    const model = minimalModel({ operations: [widgetOp] });
    const finding: DriftFinding = {
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
    const seed: CandidateSeed = {
      id: 'synthetic-candidate',
      operationId: 'createWidget',
      driftLink: { category: 'ENUM_NOT_ENFORCED' },
      scenario: 'synthetic scenario',
      expectedOutcome: 'synthetic outcome',
      rationale: 'synthetic rationale',
      automatable: true,
      status: 'CANDIDATE',
      priority: 'P1',
      confidence: 'HIGH',
    };

    const result = generateCandidates(model, [finding], [seed]);
    expect(result).toHaveLength(1);
    expect(result[0]?.evidence).toEqual(['synthetic evidence']);
  });

  test('throws when a driftLink seed has no matching DriftFinding (stale reference)', () => {
    const model = minimalModel({ operations: [widgetOp] });
    const seed: CandidateSeed = {
      id: 'stale-candidate',
      operationId: 'createWidget',
      driftLink: { category: 'SECURITY_NOT_ENFORCED' },
      scenario: 'synthetic scenario',
      expectedOutcome: 'synthetic outcome',
      rationale: 'synthetic rationale',
      automatable: true,
      status: 'CANDIDATE',
      priority: 'P1',
      confidence: 'HIGH',
    };

    expect(() => generateCandidates(model, [], [seed])).toThrow(/does not exist/);
  });

  test('throws when a seed references an operationId the contract model does not know about', () => {
    const model = minimalModel();
    const seed: CandidateSeed = {
      id: 'unknown-op-candidate',
      operationId: 'doesNotExist',
      fallbackEvidence: 'synthetic',
      scenario: 'synthetic scenario',
      expectedOutcome: 'synthetic outcome',
      rationale: 'synthetic rationale',
      automatable: true,
      status: 'DEFERRED',
      priority: 'P2',
      confidence: 'LOW',
    };

    expect(() => generateCandidates(model, [], [seed])).toThrow(/unknown operationId/);
  });

  test('sanity: the real Contract Model actually resolves every curated seed operationId', () => {
    const model = loadContractModel();
    const knownIds = new Set(model.operations.map((o) => o.operationId));

    for (const seed of CANDIDATE_SEEDS) {
      expect(knownIds.has(seed.operationId)).toBe(true);
    }
  });
});
