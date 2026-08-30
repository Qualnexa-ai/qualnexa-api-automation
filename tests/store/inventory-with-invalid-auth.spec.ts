import { test, expect } from '../../src/fixtures/api.fixtures';
import { StoreInventorySchema } from '../../src/schemas/store.schema';

test.describe('Store API - inventory with invalid auth', () => {
  test('GET /store/inventory succeeds even with a deliberately invalid auth header configured', async ({
    storeClientWithInvalidAuth,
  }) => {
    // GET /store/inventory declares an `api_key` security requirement.
    // Live-verified (Days 5, 16, 22) that this is never enforced — this
    // test exercises the Day 29 opt-in auth-header override to prove it
    // deliberately, with an obviously fake value, rather than relying only
    // on the passive evidence that every other test never sends one at all.
    const inventory = StoreInventorySchema.parse(await storeClientWithInvalidAuth.getInventory());

    expect(Object.keys(inventory).length).toBeGreaterThan(0);
  });
});
