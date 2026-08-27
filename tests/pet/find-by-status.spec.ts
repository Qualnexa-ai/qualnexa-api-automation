import { test, expect } from '../../src/fixtures/api.fixtures';

test.describe('Pet API - find by status', () => {
  test('GET /pet/findByStatus?status=available returns pets that all have the requested status', async ({
    petClient,
  }) => {
    // petClient.findByStatus() only resolves for a 2xx response (BaseClient
    // throws ApiError otherwise), so reaching this point already confirms 200.
    const pets = await petClient.findByStatus('available');

    // Live-verified: the shared public dataset contains real records that
    // violate Pet's own declared `required` fields (some are missing `name`
    // and/or `photoUrls`), so this deliberately does not run PetSchema.parse()
    // on the response — that would make the test flaky against data this
    // suite doesn't own. It asserts only what's actually guaranteed: a
    // non-empty array where every item's status matches the query.
    expect(Array.isArray(pets)).toBe(true);

    const petList = pets as { status?: string }[];

    expect(petList.length).toBeGreaterThan(0);
    expect(petList.every((pet) => pet.status === 'available')).toBe(true);
  });
});
