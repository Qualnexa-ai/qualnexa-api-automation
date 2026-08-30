import { PlanAnnotationSchema, type PlanAnnotation } from './ai-test-plan.schema';

/**
 * One hand-authored annotation per Day 26 candidate id — never a new
 * candidate, never a promotion of a REJECTED/DEFERRED item. Every
 * `recommendedAction` here is this session's own judgment call, reached by
 * reading the real Contract Model / DriftFinding / candidate data, exactly
 * as this project has defined "AI-assisted" since Day 1.
 */
export const PLAN_ANNOTATIONS: PlanAnnotation[] = [
  // --- MUST ---------------------------------------------------------------
  PlanAnnotationSchema.parse({
    candidateId: 'addPet-missing-required-fields',
    risk:
      'If a future change to the server ever starts enforcing these fields, this test would ' +
      'need updating to expect 400 instead of 200 — but until then, it is the only thing that ' +
      'would catch a regression in either direction (the API silently starts rejecting ' +
      'valid-but-incomplete payloads, or silently changes what it defaults omitted fields to).',
    existingCoverage:
      'None — tests/pet/smoke.spec.ts always sends a full buildPet() payload; the {}-style ' +
      'omission behavior has only ever been checked manually during Day 5 discovery, never ' +
      'committed as a permanent regression test.',
    redundancyAssessment:
      "Not redundant — the closest existing test (place-order's minimal-payload test, Day 4) " +
      'covers a different resource (Order, which has no required fields declared at all) and ' +
      'does not establish this fact for Pet specifically.',
    recommendedAction: 'MUST',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'getInventory-security-not-enforced',
    risk:
      "Low risk to this demo API itself, but this is the framework's only planned exercise of " +
      'the Day 22 auth-header injection capability against a real target — if that capability ' +
      'ever silently broke (e.g. a refactor stopped merging the header correctly), nothing ' +
      'today would catch it.',
    existingCoverage:
      "None explicit — every one of the 54 existing tests' absence of auth headers is passive " +
      'evidence, not a deliberate, dedicated assertion.',
    redundancyAssessment:
      'Not redundant with any existing test. Deliberately the single representative instance ' +
      'rather than one of nine — see security-not-enforced-per-operation-duplication for the ' +
      'expansion this rejects.',
    recommendedAction: 'MUST',
  }),

  // --- OPTIONAL -------------------------------------------------------------
  PlanAnnotationSchema.parse({
    candidateId: 'findByStatus-collection-format',
    risk:
      "Low — this is a documentation/coverage gap, not a correctness risk. If the server's " +
      'undocumented comma-separated behavior ever changes, no test would notice, but nothing ' +
      'in this suite currently depends on that behavior either.',
    existingCoverage:
      'None — tests/pet/find-by-status.spec.ts only exercises a single status value.',
    redundancyAssessment:
      'Not redundant, but not actionable today — requires new PetClient/BaseClient ' +
      'multi-value query support before it could even be implemented (see the DEFERRED status ' +
      'on this candidate).',
    recommendedAction: 'OPTIONAL',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'declared-but-unobserved-400s',
    risk:
      "Unknown by design — this item's entire point is that there is not yet enough evidence " +
      'to name a risk with confidence.',
    existingCoverage: 'None, and cannot be assessed further without new live verification.',
    redundancyAssessment:
      'Not applicable — no scenario is concrete enough yet to compare against existing coverage.',
    recommendedAction: 'OPTIONAL',
    fallbackContractSupport:
      'getPetById, getOrderById, and getUserByName each declare a 400 ("Invalid ID/username ' +
      'supplied") response in the OpenAPI contract.',
    fallbackKnownLiveBehavior:
      'Never observed live across Days 1-26 for any input tried so far — absence of ' +
      'observation, not proof that it is unreachable.',
  }),

  // --- REJECT — preserving prior decisions, not re-deriving them -----------
  PlanAnnotationSchema.parse({
    candidateId: 'addPet-status-enum-not-enforced',
    risk:
      'Real but already known and accepted; re-testing it would add monitoring value only, ' +
      'not new risk coverage.',
    existingCoverage: 'None, and deliberately so.',
    redundancyAssessment:
      'Redundant with the already-documented, already-decided finding from Day 5 — no new ' +
      'signal over what is already on record.',
    recommendedAction: 'REJECT',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'findByStatus-enum-not-enforced',
    risk: 'Same reasoning as addPet-status-enum-not-enforced — a known, accepted non-issue.',
    existingCoverage: 'None, and deliberately so.',
    redundancyAssessment:
      'Redundant with the already-documented, already-decided finding from Day 7.',
    recommendedAction: 'REJECT',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'loginUser-missing-password',
    risk: 'None beyond what is already understood: there is no real authentication to protect.',
    existingCoverage: 'None, and deliberately so.',
    redundancyAssessment:
      'Redundant with the already-documented, already-decided finding from the Batch C / ' +
      'Days 10-15 discovery.',
    recommendedAction: 'REJECT',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'security-not-enforced-per-operation-duplication',
    risk: 'None — rejecting this avoids adding maintenance burden with zero new signal.',
    existingCoverage:
      'Would be none today, but that gap is intentionally left to getInventory-security-not-enforced.',
    redundancyAssessment:
      'Fully redundant with getInventory-security-not-enforced — same underlying fact ' +
      '(this API has no real security), would add 8 near-identical tests for zero new signal.',
    recommendedAction: 'REJECT',
  }),
  PlanAnnotationSchema.parse({
    candidateId: 'status-code-mismatch-dedicated-tests',
    risk: 'None — this coverage already exists.',
    existingCoverage:
      'Full — already covered by 10 existing tests across the Pet, Store, and User resources.',
    redundancyAssessment: 'Completely redundant — these ARE the existing tests, not new ones.',
    recommendedAction: 'REJECT',
  }),
];
