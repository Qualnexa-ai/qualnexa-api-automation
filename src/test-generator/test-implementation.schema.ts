import { z } from 'zod';

import { DriftCategorySchema } from '../drift/drift.schema';
import { RecommendedActionSchema } from '../ai-test-planner/ai-test-plan.schema';

/**
 * The Test Generator (Day 28) turns a human-approved `AiTestPlanItem` into a
 * structured implementation proposal — never an executable test, never a
 * file write. It only ever processes `MUST`/`OPTIONAL` plan items; a note
 * that targets a `REJECT` item is a bug, not a scenario to honor (see
 * generate-implementation-proposals.ts's fail-loud check).
 *
 * `implementationStatus` is the honest answer to "can this actually be
 * built with today's framework?" — including, deliberately, cases where the
 * answer is no. `IMPLEMENTABLE` is not the default; it is earned by
 * inspecting the real client/schema code (see implementation-notes.ts for
 * the reasoning behind each classification).
 */
export const ImplementationStatusSchema = z.enum([
  'IMPLEMENTABLE',
  'NEEDS_CLIENT_CAPABILITY',
  'NEEDS_SCHEMA_CHANGE',
  'DEFERRED',
]);

const baseNoteFields = {
  requiredClientMethod: z.string(),
  requestConstructionApproach: z.string(),
  schemaFactoryUsage: z.string(),
  expectedAssertions: z.array(z.string()),
  frameworkCapabilitiesSufficient: z.boolean(),
  recommendedTestFile: z.string().optional(),
  capabilityGapDetail: z.string().optional(),
};

/**
 * One hand-authored implementation note per plan item actually worth
 * considering — never one for a `REJECT` item. `recommendedTestFile` is
 * only meaningful (and required) when `implementationStatus` is
 * `IMPLEMENTABLE`; `capabilityGapDetail` is required for every other status,
 * naming exactly what's missing rather than leaving it implicit.
 */
export const ImplementationNoteSchema = z
  .object({
    planItemId: z.string(),
    implementationStatus: ImplementationStatusSchema,
    ...baseNoteFields,
  })
  .refine(
    (note) =>
      note.implementationStatus === 'IMPLEMENTABLE'
        ? note.recommendedTestFile !== undefined
        : note.capabilityGapDetail !== undefined,
    {
      message:
        'IMPLEMENTABLE notes must set recommendedTestFile; every other status must set capabilityGapDetail',
    },
  );

export const TraceabilitySchema = z.object({
  candidateId: z.string(),
  driftCategory: DriftCategorySchema.optional(),
  planRecommendedAction: RecommendedActionSchema,
});

export const TestImplementationProposalSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  path: z.string(),
  method: z.string(),
  scenario: z.string(),
  rationale: z.string(),
  implementationStatus: ImplementationStatusSchema,
  ...baseNoteFields,
  traceability: TraceabilitySchema,
});

export type ImplementationStatus = z.infer<typeof ImplementationStatusSchema>;
export type ImplementationNote = z.infer<typeof ImplementationNoteSchema>;
export type Traceability = z.infer<typeof TraceabilitySchema>;
export type TestImplementationProposal = z.infer<typeof TestImplementationProposalSchema>;
