import { z } from 'zod';

/**
 * The Quality Report (Day 30) aggregates the outputs of every prior
 * pipeline stage (Contract Model, Drift Engine, Negative Test Intelligence,
 * AI Test Planner, Test Generator) plus the two facts that pipeline cannot
 * derive on its own without static analysis (see report-annotations.ts),
 * plus the actual live test-suite execution result, which is supplied by
 * the caller rather than run by this module. It performs no aggregation
 * logic beyond counting — every count here is a plain tally over already
 * -real, already-verified data.
 */

export const ContractSummarySchema = z.object({
  totalOperations: z.number().int().nonnegative(),
  totalDefinitions: z.number().int().nonnegative(),
});

export const AutomationSummarySchema = z.object({
  automatedOperationIds: z.array(z.string()),
  notAutomatedOperationIds: z.array(z.string()),
  automatedCount: z.number().int().nonnegative(),
  notAutomatedCount: z.number().int().nonnegative(),
});

// Plain string-keyed counts, not a record over the enum type — this is a
// reporting aggregate, not something feeding back into strict type-driven
// logic, and only categories/statuses that actually occurred are present.
const CountMapSchema = z.record(z.string(), z.number().int().nonnegative());

export const DriftSummarySchema = z.object({
  totalFindings: z.number().int().nonnegative(),
  byCategory: CountMapSchema,
  bySeverity: CountMapSchema,
});

export const PlanSummarySchema = z.object({
  totalPlanItems: z.number().int().nonnegative(),
  byRecommendedAction: CountMapSchema,
});

export const ImplementationSummarySchema = z.object({
  totalProposals: z.number().int().nonnegative(),
  byStatus: CountMapSchema,
  implementedProposalIds: z.array(z.string()),
  unimplementedProposalIds: z.array(z.string()),
});

export const TestExecutionSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

export const QualityReportSchema = z.object({
  contractSummary: ContractSummarySchema,
  automationSummary: AutomationSummarySchema,
  driftSummary: DriftSummarySchema,
  planSummary: PlanSummarySchema,
  implementationSummary: ImplementationSummarySchema,
  testExecutionSummary: TestExecutionSummarySchema,
});

export type ContractSummary = z.infer<typeof ContractSummarySchema>;
export type AutomationSummary = z.infer<typeof AutomationSummarySchema>;
export type DriftSummary = z.infer<typeof DriftSummarySchema>;
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type ImplementationSummary = z.infer<typeof ImplementationSummarySchema>;
export type TestExecutionSummary = z.infer<typeof TestExecutionSummarySchema>;
export type QualityReport = z.infer<typeof QualityReportSchema>;
