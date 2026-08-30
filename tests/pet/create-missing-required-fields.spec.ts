import { safeId } from '../../src/data/safe-id';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { PetSchema } from '../../src/schemas/pet.schema';
import type { Pet } from '../../src/schemas/pet.schema';

test.describe('Pet API - create with missing required fields', () => {
  test('POST /pet succeeds even when name and photoUrls (both declared required) are omitted', async ({
    petClient,
  }) => {
    // `name`/`photoUrls` are declared required in both the OpenAPI contract
    // and PetSchema, but live verification (Day 5, reconfirmed for this
    // test) proved the server accepts their omission — this test documents
    // that real behavior, not the declared one, following the same
    // create-then-assert-the-proven-outcome precedent as
    // tests/store/place-order.spec.ts's minimal-payload test (Day 4).
    const payload = { id: safeId(), status: 'available' } as unknown as Pet;

    const created = await petClient.create(payload);

    // Live-verified: photoUrls defaults to [] server-side even when omitted
    // from the request, but `name` has no default and is genuinely absent
    // from the response — a plain PetSchema.parse() would throw on the
    // missing `name`. Validate structurally instead of weakening PetSchema
    // for every other caller.
    const partial = PetSchema.omit({ name: true }).parse(created);

    expect(partial.id).toBe(payload.id);
    expect(partial.status).toBe(payload.status);
    expect(partial.photoUrls).toEqual([]);
  });
});
