import { z } from 'zod';

import { DriftCategorySchema } from '../drift/drift.schema';
import {
  CandidateConfidenceSchema,
  CandidatePrioritySchema,
  CandidateStatusSchema,
} from '../negative-tests/negative-test.schema';

/**
 * The AI Test Planner (Day 27) does not re-derive anything Days 24-26
 * already solved — it republishes `NegativeTestCandidate` fields, resolves
 * `contractSupport`/`knownLiveBehavior` from the real `DriftFinding[]`
 * (Day 25), and adds exactly four new fields that no prior day captured:
 * `risk`, `existingCoverage`, `redundancyAssessment`, `recommendedAction`.
 *
 * "AI" here means this session's own reasoning, hand-authored into
 * `plan-annotations.ts` — the same pattern already used for
 * `live-evidence.ts` (Day 25) and `candidate-seeds.ts` (Day 26). There is no
 * LLM/API integration, no network call, and no credential handling anywhere
 * in this module, matching CLAUDE.md's own definition of "AI-assisted."
 */

export const RecommendedActionSchema = z.enum(['MUST', 'SHOULD', 'OPTIONAL', 'REJECT']);

/**
 * The hand-authored judgment for one existing candidate (by id). Never
 * introduces a new candidate — every `candidateId` here must already exist
 * in Day 26's `CANDIDATE_SEEDS`, or `buildAiTestPlan` fails loudly.
 * `fallbackContractSupport`/`fallbackKnownLiveBehavior` are only needed for
 * a candidate with no linked `DriftFinding` (e.g. one still awaiting live
 * verification) — for every other candidate these are resolved from the
 * real `DriftFinding[]` instead of being hand-typed here.
 */
export const PlanAnnotationSchema = z
  .object({
    candidateId: z.string(),
    risk: z.string(),
    existingCoverage: z.string(),
    redundancyAssessment: z.string(),
    recommendedAction: RecommendedActionSchema,
    fallbackContractSupport: z.string().optional(),
    fallbackKnownLiveBehavior: z.string().optional(),
  })
  .refine(
    (a) =>
      (a.fallbackContractSupport === undefined) === (a.fallbackKnownLiveBehavior === undefined),
    { message: 'fallbackContractSupport and fallbackKnownLiveBehavior must be set together' },
  );

export const AiTestPlanItemSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  path: z.string(),
  method: z.string(),
  driftCategory: DriftCategorySchema.optional(),
  scenario: z.string(),
  reason: z.string(),
  risk: z.string(),
  priority: CandidatePrioritySchema,
  contractSupport: z.string(),
  knownLiveBehavior: z.string(),
  existingCoverage: z.string(),
  redundancyAssessment: z.string(),
  recommendedAction: RecommendedActionSchema,
  confidence: CandidateConfidenceSchema,
  evidence: z.array(z.string()).min(1),
  // Day 26's own lifecycle status, preserved for traceability alongside the
  // final recommendedAction verdict — the two are related but distinct (see
  // this module's top comment).
  candidateStatus: CandidateStatusSchema,
});

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;
export type PlanAnnotation = z.infer<typeof PlanAnnotationSchema>;
export type AiTestPlanItem = z.infer<typeof AiTestPlanItemSchema>;
