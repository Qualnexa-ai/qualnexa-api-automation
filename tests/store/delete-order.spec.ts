import { ApiError } from '../../src/api-clients/base-client';
import { buildOrder } from '../../src/data/order.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';

test.describe('Store API - delete order', () => {
  test('DELETE /store/order/{orderId} removes a just-created order, and the deletion persists', async ({
    storeClient,
  }) => {
    const payload = buildOrder();
    await storeClient.placeOrder(payload);

    // buildOrder() always supplies an id, so the created order is guaranteed to have one.
    const deleteResponse = ApiResponseSchema.parse(await storeClient.deleteById(payload.id!));

    // Live-verified: the success body's `message` is the deleted id, as a string.
    expect(deleteResponse.message).toBe(String(payload.id));

    // Live-verified: the deletion is immediately visible — no caching delay.
    const error = await storeClient.getOrderById(payload.id!).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });

  test('DELETE /store/order/{orderId} for a nonexistent order returns 404', async ({
    storeClient,
  }) => {
    const neverCreatedId = buildOrder().id!;

    const error = await storeClient.deleteById(neverCreatedId).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
