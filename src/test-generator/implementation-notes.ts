import { ImplementationNoteSchema, type ImplementationNote } from './test-implementation.schema';

/**
 * One hand-authored note per Day 27 plan item actually worth considering —
 * deliberately only the 4 MUST/OPTIONAL items, never one of the 5 REJECT
 * items. Each `implementationStatus` reflects real inspection of the
 * existing client/schema code (see the Day 28 discovery), not an
 * assumption that every MUST item must be IMPLEMENTABLE.
 */
export const IMPLEMENTATION_NOTES: ImplementationNote[] = [
  // --- IMPLEMENTABLE --------------------------------------------------
  ImplementationNoteSchema.parse({
    planItemId: 'addPet-missing-required-fields',
    implementationStatus: 'IMPLEMENTABLE',
    requiredClientMethod: 'PetClient.create(pet: Pet) — reusable as-is, no client change needed',
    requestConstructionApproach:
      'Build a payload that omits name/photoUrls via a scoped type-bypass at the call site ' +
      "(e.g. `{ id: safeId(), status: 'available' } as unknown as Pet`), mirroring the " +
      "precedent already established in tests/store/place-order.spec.ts's type-mismatch test " +
      "(Day 4). Do not change PetClient.create()'s signature or PetSchema to accommodate this.",
    schemaFactoryUsage:
      'buildPet() is not used directly, since it always fills name/photoUrls — construct the ' +
      'payload by hand instead. Critically, the response must NOT be validated with a plain ' +
      'PetSchema.parse(): PetSchema.name is z.string() and PetSchema.photoUrls is ' +
      'z.array(z.string()), neither optional, so a response that genuinely omits them would ' +
      'throw a ZodError. Validate structurally instead (assert the specific fields present, or ' +
      'use PetSchema.omit({ name: true, photoUrls: true }) for the rest), mirroring the ' +
      "precedent from Day 7 (find-by-status) and Day 21 (place-order's minimal-payload fix).",
    expectedAssertions: [
      'The call succeeds (BaseClient does not throw an ApiError) — i.e. 200, not 400',
      'The response id matches the id that was sent',
      'The response status matches the status that was sent',
      'The response does not resemble a validation-error body',
    ],
    frameworkCapabilitiesSufficient: true,
    recommendedTestFile: 'tests/pet/create-missing-required-fields.spec.ts',
  }),

  // --- NEEDS_CLIENT_CAPABILITY -----------------------------------------
  ImplementationNoteSchema.parse({
    planItemId: 'getInventory-security-not-enforced',
    implementationStatus: 'NEEDS_CLIENT_CAPABILITY',
    requiredClientMethod:
      'StoreClient.getInventory() exists and would be sufficient for the call itself',
    requestConstructionApproach:
      'Blocked before this step: no request can be constructed with a deliberately wrong ' +
      "auth header value at test-run time, because config/env.ts's `env` singleton is " +
      'computed once at module-import time from process.env/.env — a test callback cannot ' +
      'mutate it and have BaseClient.authHeaders() observe the change.',
    schemaFactoryUsage: 'Not applicable — blocked before reaching this step.',
    expectedAssertions: [],
    frameworkCapabilitiesSufficient: false,
    capabilityGapDetail:
      "BaseClient's auth-header mechanism (Day 22) is process-wide and load-once. " +
      'Implementing this scenario as scoped (a self-contained test that configures a wrong ' +
      'value and asserts success) requires a new per-instance or per-call auth-header override ' +
      'capability on BaseClient/resource clients — a BaseClient change requiring its own ' +
      'explicit proposal and approval, not built as part of Day 28 and not worked around here.',
  }),
  ImplementationNoteSchema.parse({
    planItemId: 'findByStatus-collection-format',
    implementationStatus: 'NEEDS_CLIENT_CAPABILITY',
    requiredClientMethod:
      'PetClient.findByStatus(status: PetStatus) exists but only accepts a single value',
    requestConstructionApproach:
      "Blocked: BaseClient.get()'s params type (Record<string, string | number | boolean>) and " +
      "findByStatus()'s signature have no way to express or send a comma-separated multi-value " +
      'query string.',
    schemaFactoryUsage: 'Not applicable — blocked before reaching this step.',
    expectedAssertions: [],
    frameworkCapabilitiesSufficient: false,
    capabilityGapDetail:
      'Needs new PetClient/BaseClient support for multi-value query parameters (e.g. accepting ' +
      'PetStatus[] and joining with a comma) before any test could call this shape at all. ' +
      'Day 7 explicitly deferred building this pending explicit interest — still true today.',
  }),

  // --- DEFERRED ----------------------------------------------------------
  ImplementationNoteSchema.parse({
    planItemId: 'declared-but-unobserved-400s',
    implementationStatus: 'DEFERRED',
    requiredClientMethod:
      'Potentially PetClient.getById() / StoreClient.getOrderById() / UserClient.getByUsername() ' +
      '— all already exist',
    requestConstructionApproach:
      'Not yet defined — there is no concrete input known to trigger the declared 400 on any ' +
      'of the three operations; defining one would require new live verification (trying ' +
      'additional input shapes) that has not been performed.',
    schemaFactoryUsage: 'Not applicable — no scenario is concrete enough yet to define this.',
    expectedAssertions: [],
    frameworkCapabilitiesSufficient: true,
    capabilityGapDetail:
      'Not a framework-capability gap — the existing client methods would be sufficient once a ' +
      'concrete triggering input is known. The actual blocker is evidence, not capability: this ' +
      'stays DEFERRED until a dedicated live-verification pass is performed.',
  }),
];
