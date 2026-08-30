// This spec is local-only: it exercises buildQualityReport() against the
// cached Days 24-28 pipeline output and the curated report annotations,
// plus small synthetic fixtures for edge cases. It makes no network calls
// and runs no tests itself — the testExecution figure is a fixed synthetic
// input, exactly as the real function expects a caller-supplied value.
import { loadContractModel } from '../../src/contract/load-contract';
import { generateImplementationProposalsFromCachedSources } from '../../src/test-generator/generate-implementation-proposals';
import {
  IMPLEMENTED_PROPOSAL_IDS,
  NOT_AUTOMATED_OPERATION_IDS,
} from '../../src/quality-report/report-annotations';
import {
  buildQualityReport,
  buildQualityReportFromCachedSources,
} from '../../src/quality-report/build-quality-report';
import { test, expect } from '../../src/fixtures/api.fixtures';
import type { ContractModel } from '../../src/contract/contract.schema';
import type { DriftFinding } from '../../src/drift/drift.schema';
import type { AiTestPlanItem } from '../../src/ai-test-planner/ai-test-plan.schema';
import type { TestImplementationProposal } from '../../src/test-generator/test-implementation.schema';

const FIXED_TEST_EXECUTION = { total: 82, passed: 82, failed: 0 };

test.describe('Quality Report - buildQualityReportFromCachedSources', () => {
  test('contractSummary matches the real Contract Model (20 operations, 6 definitions)', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.contractSummary).toEqual({ totalOperations: 20, totalDefinitions: 6 });
  });

  test('automationSummary reflects the 16 automated / 4 intentionally-not-automated split', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.automationSummary.automatedCount).toBe(16);
    expect(report.automationSummary.notAutomatedCount).toBe(4);
    expect(report.automationSummary.notAutomatedOperationIds.sort()).toEqual(
      [...NOT_AUTOMATED_OPERATION_IDS].sort(),
    );
    expect(report.automationSummary.automatedOperationIds).not.toContain('findPetsByTags');
    expect(
      report.automationSummary.automatedOperationIds.length +
        report.automationSummary.notAutomatedOperationIds.length,
    ).toBe(20);
  });

  test('driftSummary matches the real 25 findings and their exact category/severity breakdown', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.driftSummary.totalFindings).toBe(25);
    expect(report.driftSummary.byCategory).toEqual({
      STATUS_CODE_MISMATCH: 10,
      REQUIRED_FIELD_NOT_ENFORCED: 3,
      ENUM_NOT_ENFORCED: 2,
      SECURITY_NOT_ENFORCED: 9,
      COLLECTION_FORMAT_MISMATCH: 1,
    });
    expect(report.driftSummary.bySeverity).toEqual({ P0: 11, P1: 12, P2: 2 });
  });

  test('planSummary matches the real 9 plan items (2 MUST, 2 OPTIONAL, 5 REJECT, 0 SHOULD)', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.planSummary.totalPlanItems).toBe(9);
    expect(report.planSummary.byRecommendedAction).toEqual({ MUST: 2, OPTIONAL: 2, REJECT: 5 });
    expect(report.planSummary.byRecommendedAction.SHOULD).toBeUndefined();
  });

  test('implementationSummary matches the real 4 proposals and the 3 Day-29-implemented ids', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.implementationSummary.totalProposals).toBe(4);
    expect(report.implementationSummary.byStatus).toEqual({
      IMPLEMENTABLE: 1,
      NEEDS_CLIENT_CAPABILITY: 2,
      DEFERRED: 1,
    });
    expect(report.implementationSummary.implementedProposalIds.sort()).toEqual(
      [...IMPLEMENTED_PROPOSAL_IDS].sort(),
    );
    expect(report.implementationSummary.unimplementedProposalIds).toEqual([
      'declared-but-unobserved-400s',
    ]);
  });

  test('testExecutionSummary passes through exactly what the caller supplies', () => {
    const report = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(report.testExecutionSummary).toEqual(FIXED_TEST_EXECUTION);
  });

  test('is deterministic across repeated calls with the same testExecution input', () => {
    const first = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    const second = buildQualityReportFromCachedSources(FIXED_TEST_EXECUTION);
    expect(second).toEqual(first);
  });

  test('sanity: every curated annotation id resolves against the real pipeline data', () => {
    const model = loadContractModel();
    const knownOperationIds = new Set(model.operations.map((o) => o.operationId));
    for (const id of NOT_AUTOMATED_OPERATION_IDS) {
      expect(knownOperationIds.has(id)).toBe(true);
    }

    const proposals = generateImplementationProposalsFromCachedSources();
    const knownProposalIds = new Set(proposals.map((p) => p.id));
    for (const id of IMPLEMENTED_PROPOSAL_IDS) {
      expect(knownProposalIds.has(id)).toBe(true);
    }
  });
});

test.describe('Quality Report - buildQualityReport (pure function, synthetic fixtures)', () => {
  const minimalModel: ContractModel = {
    operations: [
      {
        path: '/widget',
        method: 'post',
        operationId: 'createWidget',
        parameters: [],
        responses: [{ statusCode: '200' }],
        security: [],
        consumes: [],
        deprecated: false,
      },
    ],
    definitions: [],
  };
  const noFindings: DriftFinding[] = [];
  const noPlanItems: AiTestPlanItem[] = [];
  const noProposals: TestImplementationProposal[] = [];

  test('throws when NOT_AUTOMATED_OPERATION_IDS references an unknown operationId', () => {
    expect(() =>
      buildQualityReport(
        minimalModel,
        noFindings,
        noPlanItems,
        noProposals,
        ['doesNotExist'],
        [],
        FIXED_TEST_EXECUTION,
      ),
    ).toThrow(/unknown operationId/);
  });

  test('throws when IMPLEMENTED_PROPOSAL_IDS references an unknown proposal id', () => {
    expect(() =>
      buildQualityReport(
        minimalModel,
        noFindings,
        noPlanItems,
        noProposals,
        [],
        ['ghost-proposal'],
        FIXED_TEST_EXECUTION,
      ),
    ).toThrow(/unknown proposal id/);
  });

  test('assembles a minimal report correctly with no findings/plan items/proposals', () => {
    const report = buildQualityReport(
      minimalModel,
      noFindings,
      noPlanItems,
      noProposals,
      [],
      [],
      FIXED_TEST_EXECUTION,
    );

    expect(report.contractSummary).toEqual({ totalOperations: 1, totalDefinitions: 0 });
    expect(report.automationSummary).toEqual({
      automatedOperationIds: ['createWidget'],
      notAutomatedOperationIds: [],
      automatedCount: 1,
      notAutomatedCount: 0,
    });
    expect(report.driftSummary).toEqual({ totalFindings: 0, byCategory: {}, bySeverity: {} });
  });
});
