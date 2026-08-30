import { loadContractModel } from '../contract/load-contract';
import type { ContractModel } from '../contract/contract.schema';
import { detectDriftFromCachedSources } from '../drift/detect-drift';
import type { DriftFinding } from '../drift/drift.schema';
import { buildAiTestPlanFromCachedSources } from '../ai-test-planner/build-test-plan';
import type { AiTestPlanItem } from '../ai-test-planner/ai-test-plan.schema';
import { generateImplementationProposalsFromCachedSources } from '../test-generator/generate-implementation-proposals';
import type { TestImplementationProposal } from '../test-generator/test-implementation.schema';
import { IMPLEMENTED_PROPOSAL_IDS, NOT_AUTOMATED_OPERATION_IDS } from './report-annotations';
import {
  QualityReportSchema,
  type QualityReport,
  type TestExecutionSummary,
} from './quality-report.schema';

function countBy(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] ?? 0) + 1;
  }
  return counts;
}

/**
 * Pure, deterministic aggregation of every prior pipeline stage's output
 * plus the two curated annotations, plus the caller-supplied test execution
 * result. Makes no network call and runs no test itself — `testExecution`
 * must be measured by the caller (e.g. after running `npm test`) and passed
 * in as a plain value, keeping this function instantly testable with a
 * fixed input. Fails loudly if either curated annotation list references an
 * id that no longer exists in the real data, mirroring every prior day's
 * fail-loud precedent.
 */
export function buildQualityReport(
  contractModel: ContractModel,
  driftFindings: DriftFinding[],
  planItems: AiTestPlanItem[],
  proposals: TestImplementationProposal[],
  notAutomatedOperationIds: string[],
  implementedProposalIds: string[],
  testExecution: TestExecutionSummary,
): QualityReport {
  const knownOperationIds = new Set(contractModel.operations.map((o) => o.operationId));
  for (const id of notAutomatedOperationIds) {
    if (!knownOperationIds.has(id)) {
      throw new Error(
        `report-annotations: NOT_AUTOMATED_OPERATION_IDS references unknown operationId: ${id}`,
      );
    }
  }

  const knownProposalIds = new Set(proposals.map((p) => p.id));
  for (const id of implementedProposalIds) {
    if (!knownProposalIds.has(id)) {
      throw new Error(
        `report-annotations: IMPLEMENTED_PROPOSAL_IDS references unknown proposal id: ${id}`,
      );
    }
  }

  const notAutomatedSet = new Set(notAutomatedOperationIds);
  const automatedOperationIds = contractModel.operations
    .map((o) => o.operationId)
    .filter((id) => !notAutomatedSet.has(id));

  const implementedSet = new Set(implementedProposalIds);
  const unimplementedProposalIds = proposals
    .map((p) => p.id)
    .filter((id) => !implementedSet.has(id));

  return QualityReportSchema.parse({
    contractSummary: {
      totalOperations: contractModel.operations.length,
      totalDefinitions: contractModel.definitions.length,
    },
    automationSummary: {
      automatedOperationIds,
      notAutomatedOperationIds,
      automatedCount: automatedOperationIds.length,
      notAutomatedCount: notAutomatedOperationIds.length,
    },
    driftSummary: {
      totalFindings: driftFindings.length,
      byCategory: countBy(driftFindings.map((f) => f.category)),
      bySeverity: countBy(driftFindings.map((f) => f.severity)),
    },
    planSummary: {
      totalPlanItems: planItems.length,
      byRecommendedAction: countBy(planItems.map((p) => p.recommendedAction)),
    },
    implementationSummary: {
      totalProposals: proposals.length,
      byStatus: countBy(proposals.map((p) => p.implementationStatus)),
      implementedProposalIds,
      unimplementedProposalIds,
    },
    testExecutionSummary: testExecution,
  });
}

/**
 * Convenience wrapper over the cached Day 24-28 pipeline and the curated
 * annotations. `testExecution` is the one input that can't be cached — the
 * caller supplies it after actually running `npm test`.
 */
export function buildQualityReportFromCachedSources(
  testExecution: TestExecutionSummary,
): QualityReport {
  return buildQualityReport(
    loadContractModel(),
    detectDriftFromCachedSources(),
    buildAiTestPlanFromCachedSources(),
    generateImplementationProposalsFromCachedSources(),
    NOT_AUTOMATED_OPERATION_IDS,
    IMPLEMENTED_PROPOSAL_IDS,
    testExecution,
  );
}
