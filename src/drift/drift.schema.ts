import { z } from 'zod';

/**
 * The Drift Engine (see `detect-drift.ts`) compares two deliberately
 * distinct sources:
 *
 *   ContractModel (src/contract/) = what the OpenAPI spec DECLARES.
 *   LiveEvidence (`live-evidence.ts`) = what Days 1-24's live testing has
 *     already PROVEN, hand-transcribed from docs/API-BEHAVIOR-NOTES.md and
 *     the passing test suite — never re-derived by calling the live API.
 *
 * Neither source is adjusted to match the other. A `DriftFinding` records
 * that disagreement; it does not resolve it.
 */

export const DriftCategorySchema = z.enum([
  'STATUS_CODE_MISMATCH',
  'REQUIRED_FIELD_NOT_ENFORCED',
  'ENUM_NOT_ENFORCED',
  'SECURITY_NOT_ENFORCED',
  'COLLECTION_FORMAT_MISMATCH',
]);

export const DriftSeveritySchema = z.enum(['P0', 'P1', 'P2']);

export const DriftFindingSchema = z.object({
  operationId: z.string(),
  path: z.string(),
  method: z.string(),
  category: DriftCategorySchema,
  declared: z.string(),
  observed: z.string(),
  severity: DriftSeveritySchema,
  evidence: z.string(),
  explanation: z.string(),
});

/**
 * One hand-curated, already-proven fact, keyed to an `operationId` so the
 * Drift Engine can look up the corresponding declared contract fact and
 * compare. Each variant carries only what its category needs to locate that
 * fact — not a general "observed value" blob.
 */
export const LiveEvidenceEntrySchema = z.discriminatedUnion('category', [
  z.object({
    category: z.literal('STATUS_CODE_MISMATCH'),
    operationId: z.string(),
    observedStatusCodes: z.array(z.string()).min(1),
    evidence: z.string(),
  }),
  z.object({
    category: z.literal('REQUIRED_FIELD_NOT_ENFORCED'),
    operationId: z.string(),
    fieldName: z.string(),
    evidence: z.string(),
  }),
  z.object({
    category: z.literal('ENUM_NOT_ENFORCED'),
    operationId: z.string(),
    fieldName: z.string(),
    evidence: z.string(),
  }),
  z.object({
    category: z.literal('SECURITY_NOT_ENFORCED'),
    operationId: z.string(),
    evidence: z.string(),
  }),
  z.object({
    category: z.literal('COLLECTION_FORMAT_MISMATCH'),
    operationId: z.string(),
    paramName: z.string(),
    // What was actually observed to work instead, if anything (e.g. a
    // comma-separated value) — optional because not every mismatch has one.
    observedBehavior: z.string(),
    evidence: z.string(),
  }),
]);

export const LiveEvidenceSchema = z.array(LiveEvidenceEntrySchema);

export type DriftCategory = z.infer<typeof DriftCategorySchema>;
export type DriftSeverity = z.infer<typeof DriftSeveritySchema>;
export type DriftFinding = z.infer<typeof DriftFindingSchema>;
export type LiveEvidenceEntry = z.infer<typeof LiveEvidenceEntrySchema>;
export type LiveEvidence = z.infer<typeof LiveEvidenceSchema>;
