import { z } from 'zod';

import { DriftCategorySchema } from '../drift/drift.schema';

/**
 * Negative Test Intelligence (Day 26) reasons from three-plus sources:
 *
 *   ContractModel (Day 24)  = what the spec declares.
 *   DriftFinding[] (Day 25) = what's already been proven live, and where it
 *     disagrees with the contract.
 *   Existing test coverage  = what's already permanently regression-tested.
 *   Prior documented decisions = scenarios earlier days already evaluated
 *     and explicitly accepted, deferred, or rejected.
 *
 * A `DriftFinding` is an INPUT to this reasoning, never automatically a test
 * candidate — see `candidate-seeds.ts` for why each candidate below is
 * classified the way it is. This module produces recommendation data only;
 * nothing here executes, and nothing here becomes a Playwright spec.
 */

export const CandidateStatusSchema = z.enum(['CANDIDATE', 'REJECTED', 'DEFERRED']);
export const CandidatePrioritySchema = z.enum(['P0', 'P1', 'P2']);
export const CandidateConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Optional link from a seed to the DriftFinding(s) that justify it. When
 * present, `generateCandidates` resolves the *real* DriftFinding data (not a
 * copy) and fails loudly if nothing matches. When absent, the seed must
 * supply its own `fallbackEvidence` (used for candidates — like B2 — that
 * aren't yet backed by a proven drift finding at all).
 */
export const DriftLinkSchema = z.object({
  category: DriftCategorySchema,
});

export const CandidateSeedSchema = z
  .object({
    id: z.string(),
    operationId: z.string(),
    driftLink: DriftLinkSchema.optional(),
    fallbackEvidence: z.string().optional(),
    scenario: z.string(),
    expectedOutcome: z.string(),
    rationale: z.string(),
    priorDecisionRef: z.string().optional(),
    automatable: z.boolean(),
    status: CandidateStatusSchema,
    priority: CandidatePrioritySchema,
    confidence: CandidateConfidenceSchema,
  })
  .refine((seed) => seed.driftLink !== undefined || seed.fallbackEvidence !== undefined, {
    message: 'a seed must have either a driftLink or fallbackEvidence to source its evidence from',
  });

export const NegativeTestCandidateSchema = z.object({
  id: z.string(),
  operationId: z.string(),
  path: z.string(),
  method: z.string(),
  driftCategory: DriftCategorySchema.optional(),
  scenario: z.string(),
  expectedOutcome: z.string(),
  rationale: z.string(),
  // Resolved from real DriftFinding entries when driftLink is present
  // (there can be more than one, e.g. addPet's two REQUIRED_FIELD_NOT_ENFORCED
  // findings for `name` and `photoUrls`), or the seed's own fallbackEvidence
  // otherwise. Never invented.
  evidence: z.array(z.string()).min(1),
  priorDecisionRef: z.string().optional(),
  automatable: z.boolean(),
  status: CandidateStatusSchema,
  priority: CandidatePrioritySchema,
  confidence: CandidateConfidenceSchema,
});

export type CandidateStatus = z.infer<typeof CandidateStatusSchema>;
export type CandidatePriority = z.infer<typeof CandidatePrioritySchema>;
export type CandidateConfidence = z.infer<typeof CandidateConfidenceSchema>;
export type DriftLink = z.infer<typeof DriftLinkSchema>;
export type CandidateSeed = z.infer<typeof CandidateSeedSchema>;
export type NegativeTestCandidate = z.infer<typeof NegativeTestCandidateSchema>;
