import { ApiError } from '../../src/api-clients/base-client';
import { buildOrder } from '../../src/data/order.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { OrderSchema } from '../../src/schemas/store.schema';

test.describe('Store API - get order', () => {
  test('GET /store/order/{orderId} returns the just-created order matching the schema', async ({
    storeClient,
  }) => {
    const payload = buildOrder();
    await storeClient.placeOrder(payload);

    const order = OrderSchema.parse(await storeClient.getOrderById(payload.id!));

    expect(order.id).toBe(payload.id);
    expect(order.petId).toBe(payload.petId);
    expect(order.quantity).toBe(payload.quantity);
    expect(order.status).toBe(payload.status);
    expect(order.complete).toBe(payload.complete);
    // The server reformats shipDate's string representation (live-verified,
    // same as the POST /store/order tests), so compare the instant rather
    // than the raw string.
    expect(new Date(order.shipDate ?? '').getTime()).toBe(
      new Date(payload.shipDate ?? '').getTime(),
    );
  });

  test('GET /store/order/{orderId} for a nonexistent order returns 404', async ({
    storeClient,
  }) => {
    const neverCreatedId = buildOrder().id!;

    const error = await storeClient.getOrderById(neverCreatedId).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
