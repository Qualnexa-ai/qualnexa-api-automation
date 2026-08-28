import { LiveEvidenceSchema, type LiveEvidence } from './drift.schema';

/**
 * A typed, explicit transcription of facts already proven true by live
 * testing during Days 1-24 — the structured counterpart to
 * docs/API-BEHAVIOR-NOTES.md's prose. Nothing here is inferred, guessed, or
 * derived by calling the live API from this file: every entry cites the
 * day/test/doc that established it, and every entry only exists because a
 * previous day's live verification proved it.
 *
 * Do not add an entry unless it is backed by a citable prior finding. Do not
 * "complete the pattern" by assuming similar operations behave the same way
 * without their own evidence (see the `findPetsByTags` omission below).
 */
export const LIVE_EVIDENCE: LiveEvidence = LiveEvidenceSchema.parse([
  // --- STATUS_CODE_MISMATCH -------------------------------------------
  // Undocumented successes and two real, reproducible server defects
  // (uploadFile / placeOrder's 500s).
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'addPet',
    observedStatusCodes: ['200'],
    evidence: 'Day 5 — tests/pet/smoke.spec.ts; spec declares only 405',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'updatePet',
    observedStatusCodes: ['200'],
    evidence: 'Day 5 — tests/pet/update.spec.ts; spec declares 400/404/405',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'updatePetWithForm',
    observedStatusCodes: ['200', '404'],
    evidence: 'Day 19 — tests/pet/update-form.spec.ts; spec declares only 405',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'deletePet',
    observedStatusCodes: ['200', '404'],
    evidence: 'Day 6 — tests/pet/delete.spec.ts; spec declares 400/404',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'uploadFile',
    observedStatusCodes: ['200', '500'],
    evidence:
      'Day 18 — tests/pet/upload-image.spec.ts; spec declares only 200. The 500 is a ' +
      'reproducible server defect: omitting the declared-optional `file` field crashes ' +
      'the server instead of the documented graceful handling.',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'createUser',
    observedStatusCodes: ['200'],
    evidence: 'Batch A — tests/user/create-and-get.spec.ts; spec declares only `default`',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'updateUser',
    observedStatusCodes: ['200'],
    evidence: 'Batch B — tests/user/update.spec.ts; spec declares 400/404',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'deleteUser',
    observedStatusCodes: ['200', '404'],
    evidence: 'Batch B — tests/user/delete.spec.ts; spec declares 400/404',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'deleteOrder',
    observedStatusCodes: ['200', '404'],
    evidence: 'Day 9 — tests/store/delete-order.spec.ts; spec declares 400/404',
  },
  {
    category: 'STATUS_CODE_MISMATCH',
    operationId: 'placeOrder',
    observedStatusCodes: ['200', '500'],
    evidence:
      'Day 4 — tests/store/place-order.spec.ts; spec declares 200/400. The 500 is a ' +
      'reproducible server defect: a type-mismatched field (quantity as a string) crashes ' +
      'the server instead of returning the documented 400.',
  },

  // --- REQUIRED_FIELD_NOT_ENFORCED -------------------------------------
  {
    category: 'REQUIRED_FIELD_NOT_ENFORCED',
    operationId: 'addPet',
    fieldName: 'name',
    evidence:
      'Day 5/21 discovery — POST /pet with `{}` returns 200 despite Pet.name being ' +
      'declared required (see docs/API-BEHAVIOR-NOTES.md, Pet resource)',
  },
  {
    category: 'REQUIRED_FIELD_NOT_ENFORCED',
    operationId: 'addPet',
    fieldName: 'photoUrls',
    evidence:
      'Day 5/21 discovery — same `{}` create; Pet.photoUrls is declared required ' +
      '(see docs/API-BEHAVIOR-NOTES.md, Pet resource)',
  },
  {
    category: 'REQUIRED_FIELD_NOT_ENFORCED',
    operationId: 'loginUser',
    fieldName: 'password',
    evidence:
      'Days 10-15 discovery — omitting the declared-required `password` query param ' +
      'still returns 200 (see docs/API-BEHAVIOR-NOTES.md, User/Auth resource)',
  },

  // --- ENUM_NOT_ENFORCED ------------------------------------------------
  {
    category: 'ENUM_NOT_ENFORCED',
    operationId: 'addPet',
    fieldName: 'status',
    evidence:
      'Day 5 discovery — an arbitrary, non-enum string value for `status` is accepted ' +
      'and echoed back verbatim on create, not restricted to available/pending/sold',
  },
  {
    category: 'ENUM_NOT_ENFORCED',
    operationId: 'findPetsByStatus',
    fieldName: 'status',
    evidence:
      'Day 5/7 discovery — an invalid `status` query value returns 200 + `[]`, not the ' +
      'documented 400',
  },

  // --- SECURITY_NOT_ENFORCED --------------------------------------------
  // Every operation below declares a `security` requirement; every live
  // call made against it throughout this engagement succeeded with zero
  // auth headers sent, and dedicated no-key/bogus-key/valid-looking-key
  // checks (Days 5, 16, 22) confirmed the header makes no observable
  // difference.
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'addPet',
    evidence: 'Day 5 discovery + every passing run of tests/pet/smoke.spec.ts',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'updatePet',
    evidence: 'Every passing run of tests/pet/update.spec.ts, zero auth headers ever sent',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'findPetsByStatus',
    evidence: 'Every passing run of tests/pet/find-by-status.spec.ts, zero auth headers ever sent',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'findPetsByTags',
    evidence:
      'Day 17 discovery curl checks — all return 200 with zero auth headers sent ' +
      '(no permanent automated test exists; operation is deprecated and not automated)',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'getPetById',
    evidence:
      "Every passing run of tests/pet/smoke.spec.ts's getById test, zero auth headers ever sent",
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'updatePetWithForm',
    evidence: 'Every passing run of tests/pet/update-form.spec.ts, zero auth headers ever sent',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'deletePet',
    evidence: 'Every passing run of tests/pet/delete.spec.ts, zero auth headers ever sent',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'uploadFile',
    evidence: 'Every passing run of tests/pet/upload-image.spec.ts, zero auth headers ever sent',
  },
  {
    category: 'SECURITY_NOT_ENFORCED',
    operationId: 'getInventory',
    evidence:
      'Day 5 discovery + Day 16 dedicated re-verification (no key, bogus key, ' +
      'valid-looking key all made no difference) + every passing run of ' +
      'tests/store/inventory.spec.ts',
  },

  // --- COLLECTION_FORMAT_MISMATCH ---------------------------------------
  // findPetsByTags declares the same `collectionFormat: multi`, but is
  // deliberately NOT included here — Day 17 found it returns empty results
  // for every input regardless of encoding, so there is no distinguishable
  // signal to confirm a mismatch against. Do not add it without new evidence.
  {
    category: 'COLLECTION_FORMAT_MISMATCH',
    operationId: 'findPetsByStatus',
    paramName: 'status',
    observedBehavior:
      'repeated status= query keys silently drop all but the first value; an ' +
      'undocumented comma-separated value (status=a,b) works as an OR filter instead',
    evidence:
      'Day 7 discovery — tests/pet/find-by-status.spec.ts covers only the single-value case',
  },
]);
