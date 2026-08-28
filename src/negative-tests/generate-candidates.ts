import { loadContractModel } from '../contract/load-contract';
import type { ContractModel } from '../contract/contract.schema';
import { detectDriftFromCachedSources } from '../drift/detect-drift';
import type { DriftFinding } from '../drift/drift.schema';
import { CANDIDATE_SEEDS } from './candidate-seeds';
import {
  NegativeTestCandidateSchema,
  type CandidateSeed,
  type NegativeTestCandidate,
} from './negative-test.schema';

const STATUS_RANK: Record<NegativeTestCandidate['status'], number> = {
  CANDIDATE: 0,
  DEFERRED: 1,
  REJECTED: 2,
};

const PRIORITY_RANK: Record<NegativeTestCandidate['priority'], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
};

function resolveEvidence(findings: DriftFinding[], seed: CandidateSeed): string[] {
  if (!seed.driftLink) {
    // fallbackEvidence is guaranteed present by CandidateSeedSchema's refine().
    return [seed.fallbackEvidence!];
  }

  const matches = findings.filter(
    (f) => f.operationId === seed.operationId && f.category === seed.driftLink!.category,
  );

  if (matches.length === 0) {
    // A seed claiming a drift link that no longer resolves against the real
    // DriftFinding[] is stale data (e.g. after evidence or the spec
    // changed) — fail loudly rather than silently keep an unsupported
    // candidate, mirroring detect-drift.ts's own fail-loud precedent.
    throw new Error(
      `CandidateSeed "${seed.id}" references a DriftFinding for operationId=` +
        `"${seed.operationId}" category=${seed.driftLink.category} that does not exist`,
    );
  }

  return matches.map((f) => f.evidence);
}

/**
 * Pure, deterministic reasoning over three inputs — never automatically
 * turning a DriftFinding into a test candidate. See candidate-seeds.ts for
 * the actual judgment calls; this function only resolves each seed's
 * evidence against the real Contract Model / DriftFinding[] and orders the
 * result. It makes no network calls and generates no executable test code —
 * the output is recommendation data only.
 */
export function generateCandidates(
  model: ContractModel,
  findings: DriftFinding[],
  seeds: CandidateSeed[],
): NegativeTestCandidate[] {
  const candidates = seeds.map((seed): NegativeTestCandidate => {
    const op = model.operations.find((o) => o.operationId === seed.operationId);
    if (!op) {
      throw new Error(
        `CandidateSeed "${seed.id}" references unknown operationId: ${seed.operationId}`,
      );
    }

    return NegativeTestCandidateSchema.parse({
      id: seed.id,
      operationId: op.operationId,
      path: op.path,
      method: op.method,
      driftCategory: seed.driftLink?.category,
      scenario: seed.scenario,
      expectedOutcome: seed.expectedOutcome,
      rationale: seed.rationale,
      evidence: resolveEvidence(findings, seed),
      priorDecisionRef: seed.priorDecisionRef,
      automatable: seed.automatable,
      status: seed.status,
      priority: seed.priority,
      confidence: seed.confidence,
    });
  });

  return candidates.sort((a, b) => {
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) {
      return statusDiff;
    }
    const priorityDiff = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

/** Convenience wrapper over the cached spec, the real drift findings, and the curated seeds. */
export function generateCandidatesFromCachedSources(): NegativeTestCandidate[] {
  return generateCandidates(loadContractModel(), detectDriftFromCachedSources(), CANDIDATE_SEEDS);
}
