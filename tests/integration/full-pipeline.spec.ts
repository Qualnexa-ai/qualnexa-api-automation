// This spec is local-only: it exercises the complete Days 24-30 pipeline
// end-to-end using the existing *FromCachedSources() functions and real
// cached data. It makes no network calls, no LLM/API calls, and needs no
// credentials — unlike every API-resource spec in this suite.
//
// Unlike each stage's own spec file (which only proves its own
// *FromCachedSources() wrapper runs correctly in isolation), this test
// proves the HANDOFFS between stages are correct — that a later stage's
// output genuinely resolves against an earlier stage's real data, not just
// that each stage independently produces plausible-looking output. This is
// the "MVP Integration" (Day 31) demonstration: it does not invent a new
// orchestration framework, it only chains functions that already exist.
import { loadContractModel } from '../../src/contract/load-contract';
import { detectDriftFromCachedSources } from '../../src/drift/detect-drift';
import { generateCandidatesFromCachedSources } from '../../src/negative-tests/generate-candidates';
import { buildAiTestPlanFromCachedSources } from '../../src/ai-test-planner/build-test-plan';
import { generateImplementationProposalsFromCachedSources } from '../../src/test-generator/generate-implementation-proposals';
import { buildQualityReportFromCachedSources } from '../../src/quality-report/build-quality-report';
import { test, expect } from '../../src/fixtures/api.fixtures';

// Illustrative, fixed synthetic input for the Quality Report's final stage —
// the real value is always measured by whoever actually runs `npm test`,
// never derived by this pipeline itself (see build-quality-report.ts).
const SAMPLE_TEST_EXECUTION = { total: 95, passed: 95, failed: 0 };

test.describe('Full pipeline integration (Contract Model -> Drift Engine -> Negative Test Intelligence -> AI Test Planner -> Test Generator -> Quality Report)', () => {
  test('every stage composes correctly end-to-end using real cached data', () => {
    // Stage 1: Contract Model — the declared source of truth every later
    // stage is built on top of.
    const model = loadContractModel();
    expect(model.operations).toHaveLength(20);
    expect(model.definitions).toHaveLength(6);
    const knownOperationIds = new Set(model.operations.map((o) => o.operationId));

    // Stage 2: Drift Engine — every finding's operationId must resolve in
    // the exact Contract Model that fed it.
    const findings = detectDriftFromCachedSources();
    expect(findings).toHaveLength(25);
    for (const finding of findings) {
      expect(knownOperationIds.has(finding.operationId)).toBe(true);
    }

    // Stage 3: Negative Test Intelligence — every candidate's operationId
    // must also resolve in the same Contract Model.
    const candidates = generateCandidatesFromCachedSources();
    expect(candidates).toHaveLength(9);
    for (const candidate of candidates) {
      expect(knownOperationIds.has(candidate.operationId)).toBe(true);
    }

    // Stage 4: AI Test Planner — exactly one plan item per candidate, ids
    // preserved through the handoff.
    const plan = buildAiTestPlanFromCachedSources();
    expect(plan).toHaveLength(candidates.length);
    expect(plan.map((p) => p.id).sort()).toEqual(candidates.map((c) => c.id).sort());

    // Stage 5: Test Generator — only MUST/OPTIONAL plan items ever become
    // proposals; every proposal must resolve back to a real, non-REJECT
    // plan item (never a silently-promoted rejected/deferred decision).
    const proposals = generateImplementationProposalsFromCachedSources();
    expect(proposals).toHaveLength(4);
    const planById = new Map(plan.map((p) => [p.id, p]));
    for (const proposal of proposals) {
      const planItem = planById.get(proposal.id);
      expect(planItem).toBeDefined();
      expect(planItem?.recommendedAction).not.toBe('REJECT');
    }

    // Stage 6: Quality Intelligence Report — aggregates every stage above;
    // its own counts must match the intermediate stages' real lengths, not
    // some independently re-derived number.
    const report = buildQualityReportFromCachedSources(SAMPLE_TEST_EXECUTION);
    expect(report.contractSummary.totalOperations).toBe(model.operations.length);
    expect(report.contractSummary.totalDefinitions).toBe(model.definitions.length);
    expect(report.driftSummary.totalFindings).toBe(findings.length);
    expect(report.planSummary.totalPlanItems).toBe(plan.length);
    expect(report.implementationSummary.totalProposals).toBe(proposals.length);
    expect(report.testExecutionSummary).toEqual(SAMPLE_TEST_EXECUTION);
  });

  test('is deterministic across repeated full-pipeline runs', () => {
    function runFullPipeline() {
      const model = loadContractModel();
      const findings = detectDriftFromCachedSources();
      const candidates = generateCandidatesFromCachedSources();
      const plan = buildAiTestPlanFromCachedSources();
      const proposals = generateImplementationProposalsFromCachedSources();
      const report = buildQualityReportFromCachedSources(SAMPLE_TEST_EXECUTION);
      return { model, findings, candidates, plan, proposals, report };
    }

    expect(runFullPipeline()).toEqual(runFullPipeline());
  });
});
