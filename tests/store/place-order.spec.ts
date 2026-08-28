import { ApiError } from '../../src/api-clients/base-client';
import { buildOrder } from '../../src/data/order.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { OrderSchema } from '../../src/schemas/store.schema';
import type { Order } from '../../src/schemas/store.schema';

test.describe('Store API - place order', () => {
  test('POST /store/order creates an order matching the request payload and response schema', async ({
    storeClient,
  }) => {
    const payload = buildOrder();

    const order = OrderSchema.parse(await storeClient.placeOrder(payload));

    expect(order.id).toBe(payload.id);
    expect(order.petId).toBe(payload.petId);
    expect(order.quantity).toBe(payload.quantity);
    expect(order.status).toBe(payload.status);
    expect(order.complete).toBe(payload.complete);
    // The server reformats shipDate's string representation (live-verified:
    // a sent "...Z" suffix comes back as an equivalent "+0000" offset), so
    // compare the instant in time rather than the raw string.
    expect(new Date(order.shipDate ?? '').getTime()).toBe(
      new Date(payload.shipDate ?? '').getTime(),
    );
  });

  test('POST /store/order accepts a minimal payload and matches the response schema', async ({
    storeClient,
  }) => {
    // Per the OpenAPI contract (definitions.Order has no `required` array)
    // and live verification, every Order property is optional — the server
    // accepts an empty body and defaults the unset fields itself rather than
    // rejecting it. Assert the specific live-verified defaults, not just
    // that parsing succeeded.
    //
    // `id` is validated separately from the rest of the schema here: with no
    // id supplied, the server assigns its own — live-verified to sometimes
    // exceed Number.MAX_SAFE_INTEGER (the same int64/float64 precision trap
    // documented for Pet's id-less create in docs/API-BEHAVIOR-NOTES.md).
    // OrderSchema.id is correctly tightened to `.int()`, so this test omits
    // `id` from the parse rather than weakening that schema for every other
    // caller — the exact id value isn't what this test is verifying.
    const order = OrderSchema.omit({ id: true }).parse(await storeClient.placeOrder({}));

    expect(order.petId).toBe(0);
    expect(order.complete).toBe(false);
  });

  test('POST /store/order rejects a type-mismatched field with a 500 response', async ({
    storeClient,
  }) => {
    // `quantity` is declared as an integer by the OpenAPI contract; sending a
    // string was live-verified to produce a 500, not a clean 400 — this test
    // documents that verified behavior rather than an invented one. The cast
    // is scoped to this one call: StoreClient.placeOrder stays typed to
    // `Order` for every other caller, and this is the only test that needs
    // to deliberately violate that contract.
    const payload = { ...buildOrder(), quantity: 'not-a-number' } as unknown as Order;

    const error = await storeClient.placeOrder(payload).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});
