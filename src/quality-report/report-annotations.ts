/**
 * Two small, hand-curated facts the deterministic pipeline (Days 24-28)
 * cannot derive on its own without static analysis of tests/**:
 *
 * - Which of the 20 declared operations are intentionally not automated
 *   (established by hand during Day 20's architecture review).
 * - Which of the Test Generator's proposals actually became real,
 *   committed tests (Day 29's outcome).
 *
 * Both are validated against the real ContractModel / TestImplementationProposal[]
 * by build-quality-report.ts, which fails loudly if either goes stale.
 */

export const NOT_AUTOMATED_OPERATION_IDS: string[] = [
  // findByTags: spec-deprecated AND live-verified to return zero results
  // for every input tried, including the spec's own example values
  // (Day 17) — no usable signal exists at all.
  'findPetsByTags',
  // logoutUser: fully stateless — no observable effect to assert beyond
  // "returns 200" (Days 10-15).
  'logoutUser',
  // Bulk-create variants: same underlying create logic as POST /user,
  // only marginal incremental signal (Day 5 / Day 20).
  'createUsersWithArrayInput',
  'createUsersWithListInput',
];

export const IMPLEMENTED_PROPOSAL_IDS: string[] = [
  // Day 29 turned these 3 of Day 28's 4 proposals into real, committed,
  // passing tests. declared-but-unobserved-400s remains DEFERRED.
  'addPet-missing-required-fields',
  'getInventory-security-not-enforced',
  'findByStatus-collection-format',
];
