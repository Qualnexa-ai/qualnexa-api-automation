import { CandidateSeedSchema, type CandidateSeed } from './negative-test.schema';

/**
 * The hand-curated A/B/C classification from the Day 26 discovery. Each
 * seed is a judgment call, not a mechanical derivation from DriftFinding[]
 * — that's deliberate (see negative-test.schema.ts's top comment). Do not
 * add a seed that mechanically expands a category to every operation it
 * touches (see getInventory-security-not-enforced and
 * security-not-enforced-per-operation-duplication below for why that's
 * explicitly rejected, not just omitted).
 */
export const CANDIDATE_SEEDS: CandidateSeed[] = [
  // --- A: strong candidates ---------------------------------------------
  CandidateSeedSchema.parse({
    id: 'addPet-missing-required-fields',
    operationId: 'addPet',
    driftLink: { category: 'REQUIRED_FIELD_NOT_ENFORCED' },
    scenario: 'Create a pet omitting `name` and `photoUrls` (both declared required)',
    expectedOutcome: '200, not 400 — the proven behavior, not the declared one',
    rationale:
      'Real, repeatedly-verified drift with zero permanent regression coverage today — ' +
      "tests/pet/smoke.spec.ts always sends a full buildPet() payload. Unlike loginUser's " +
      'equivalent (see loginUser-missing-password below), this exact scenario was only ever ' +
      'deprioritized by day-by-day scope on Day 5 (rated SHOULD, not implemented for lack of ' +
      'room), never rejected on merit — still worth doing.',
    automatable: true,
    status: 'CANDIDATE',
    priority: 'P1',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'getInventory-security-not-enforced',
    operationId: 'getInventory',
    driftLink: { category: 'SECURITY_NOT_ENFORCED' },
    scenario:
      'Call GET /store/inventory with a deliberately wrong value configured via ' +
      "BaseClient's opt-in auth-header mechanism (Day 22)",
    expectedOutcome: '200 — the declared `api_key` security has no effect',
    rationale:
      'Every one of the 42 existing tests implicitly proves no operation enforces its ' +
      'declared security, but none *deliberately* varies the header to assert it — this ' +
      "closes that gap AND exercises Day 22's own auth-header capability end-to-end for the " +
      'first time against real evidence. Chosen as the single representative instance for ' +
      'all 9 SECURITY_NOT_ENFORCED findings (getInventory has the deepest existing ' +
      'verification history — Days 5, 16, 22 — and needs no request body). Proposing this ' +
      'once per affected operation was considered and explicitly rejected — see ' +
      'security-not-enforced-per-operation-duplication below.',
    automatable: true,
    status: 'CANDIDATE',
    priority: 'P0',
    confidence: 'HIGH',
  }),

  // --- B: deferred — need more than "write a test" -----------------------
  CandidateSeedSchema.parse({
    id: 'findByStatus-collection-format',
    operationId: 'findPetsByStatus',
    driftLink: { category: 'COLLECTION_FORMAT_MISMATCH' },
    scenario:
      'Query using the undocumented comma-separated multi-value status filter and assert ' +
      'the proven OR-filter behavior',
    expectedOutcome:
      'Returns pets matching ANY of the comma-separated statuses (live-verified working, ' +
      'though undocumented — the declared collectionFormat: multi via repeated keys does not)',
    rationale:
      'The behavior itself is solidly proven (Day 7), but PetClient.findByStatus() and ' +
      'BaseClient.get() only support a single query value today — implementing this needs ' +
      'new client capability first, not just a test. Day 7 itself said to "defer unless you ' +
      'want it explicitly." Blocked on architecture work, belongs to a future implementation ' +
      'day, not a Day 26 candidate ready to convert directly into a test.',
    priorDecisionRef: 'Day 7 discovery: "defer unless you want it explicitly"',
    automatable: false,
    status: 'DEFERRED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'declared-but-unobserved-400s',
    operationId: 'getPetById',
    fallbackEvidence:
      'No dedicated live verification has been performed to confirm whether the declared ' +
      '400 responses on getPetById, getOrderById, and getUserByName are truly unreachable, ' +
      'or simply never triggered by any input tried so far across Days 1-25.',
    scenario:
      'Investigate whether any input can actually trigger the declared 400 on getPetById ' +
      '(and, by the same open question, getOrderById and getUserByName)',
    expectedOutcome:
      'Unknown — this is exactly why it is deferred rather than proposed: asserting an ' +
      'outcome here without first collecting evidence would be inventing behavior',
    rationale:
      'Per the Day 26 principle "do not invent expected behavior without evidence" — this ' +
      'needs a dedicated live-verification pass (trying more input shapes) that has not been ' +
      'done, not a test written from a guess.',
    automatable: false,
    status: 'DEFERRED',
    priority: 'P2',
    confidence: 'LOW',
  }),

  // --- C: rejected — preserving prior decisions, not re-deriving them ----
  CandidateSeedSchema.parse({
    id: 'addPet-status-enum-not-enforced',
    operationId: 'addPet',
    driftLink: { category: 'ENUM_NOT_ENFORCED' },
    scenario: 'Create a pet with an invalid, non-enum `status` value',
    expectedOutcome: '200 — accepted verbatim, not restricted to the declared enum',
    rationale:
      'Real, live-verified finding, but already evaluated and explicitly rejected on Day 5 ' +
      'as low-signal/redundant with the already-established "no server-side validation" story.',
    priorDecisionRef:
      "Day 5 discovery scenario table: \"real but low-signal — same 'no server validation' " +
      'story as the previous row; would be redundant to automate both"',
    automatable: true,
    status: 'REJECTED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'findByStatus-enum-not-enforced',
    operationId: 'findPetsByStatus',
    driftLink: { category: 'ENUM_NOT_ENFORCED' },
    scenario: 'Query findByStatus with an invalid `status` value',
    expectedOutcome: '200 + [] — not the documented 400',
    rationale: 'Already evaluated and explicitly rejected on Day 7.',
    priorDecisionRef:
      'Day 7 coverage table: "redundant signal, already documented elsewhere in this exact form"',
    automatable: true,
    status: 'REJECTED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'loginUser-missing-password',
    operationId: 'loginUser',
    driftLink: { category: 'REQUIRED_FIELD_NOT_ENFORCED' },
    scenario: 'Call GET /user/login omitting the declared-required `password` query param',
    expectedOutcome: '200 — still succeeds',
    rationale:
      'Already evaluated and explicitly rejected during the Batch C / Days 10-15 discovery. ' +
      'Contrast with addPet-missing-required-fields above: that scenario was only ever ' +
      'deprioritized by scope, this one was actively judged not worth it — different history, ' +
      'different outcome, despite being the same drift category.',
    priorDecisionRef:
      "Batch C discovery: \"REJECT — same 'required means nothing' pattern already " +
      'established generically"',
    automatable: true,
    status: 'REJECTED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'security-not-enforced-per-operation-duplication',
    operationId: 'addPet',
    driftLink: { category: 'SECURITY_NOT_ENFORCED' },
    scenario:
      'A dedicated SECURITY_NOT_ENFORCED regression test for addPet specifically — and, by ' +
      'the same reasoning, for each of the other 7 operations beyond getInventory ' +
      '(updatePet, findPetsByStatus, findPetsByTags, getPetById, updatePetWithForm, ' +
      'deletePet, uploadFile)',
    expectedOutcome: '200 — the same underlying fact as getInventory-security-not-enforced',
    rationale:
      "This API's lack of real security is one fact, not nine — expanding " +
      'getInventory-security-not-enforced to one test per operation would be pure ' +
      'duplication of the same signal. Explicitly considered and rejected during the Day 26 ' +
      'discovery.',
    automatable: true,
    status: 'REJECTED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
  CandidateSeedSchema.parse({
    id: 'status-code-mismatch-dedicated-tests',
    operationId: 'addPet',
    driftLink: { category: 'STATUS_CODE_MISMATCH' },
    scenario:
      'A dedicated test asserting the undocumented status code for addPet specifically — ' +
      'and, by the same reasoning, for each of the other 9 STATUS_CODE_MISMATCH findings',
    expectedOutcome:
      'Already the exact behavior asserted by tests/pet/smoke.spec.ts, and analogously by ' +
      "each affected operation's existing test",
    rationale:
      'All 10 STATUS_CODE_MISMATCH findings are already fully covered by existing tests — ' +
      "the 8 undocumented-success ones by each resource's own smoke/CRUD test, the 2 real " +
      'defects (uploadFile, placeOrder) by their existing dedicated regression tests ' +
      '(Days 18, 4). Nothing to add.',
    automatable: true,
    status: 'REJECTED',
    priority: 'P2',
    confidence: 'HIGH',
  }),
];
