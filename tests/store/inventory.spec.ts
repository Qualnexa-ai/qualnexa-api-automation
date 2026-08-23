import { test, expect } from '../../src/fixtures/api.fixtures';
import { StoreInventorySchema } from '../../src/schemas/store.schema';

test.describe('Store API smoke', () => {
  test('GET /store/inventory returns a status-to-count map matching the schema', async ({
    storeClient,
  }) => {
    const inventory = StoreInventorySchema.parse(await storeClient.getInventory());

    expect(Object.keys(inventory).length).toBeGreaterThan(0);
  });
});
