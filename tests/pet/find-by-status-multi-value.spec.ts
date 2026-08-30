import { test, expect } from '../../src/fixtures/api.fixtures';

test.describe('Pet API - find by status (multi-value)', () => {
  test('GET /pet/findByStatus accepts a comma-separated multi-value status and returns the union', async ({
    petClient,
  }) => {
    // Live-verified (Day 7): the declared collectionFormat: multi (repeated
    // status= keys) does NOT work — only the first value is honored. An
    // undocumented comma-separated value does work as a genuine OR filter.
    // PetClient.findByStatus() joins an array into that comma-separated
    // form; BaseClient.get() is unchanged, since a joined string is still
    // just a string.
    const pets = await petClient.findByStatus(['available', 'pending']);

    expect(Array.isArray(pets)).toBe(true);
    const petList = pets as { status?: string }[];
    expect(petList.length).toBeGreaterThan(0);
    expect(petList.every((pet) => pet.status === 'available' || pet.status === 'pending')).toBe(
      true,
    );

    // Confirm this is genuinely a union, not silently just the first
    // requested value (the failure mode of the declared-but-broken
    // collectionFormat: multi) — both requested statuses must appear.
    const statuses = new Set(petList.map((pet) => pet.status));
    expect(statuses.has('available')).toBe(true);
    expect(statuses.has('pending')).toBe(true);
  });
});
