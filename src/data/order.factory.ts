import { faker } from '@faker-js/faker';

import type { Order } from '../schemas/store.schema';

/**
 * Builds a valid `Order` payload for requests, with overridable fields.
 *
 * Always includes an `id` within the JS safe-integer range: like `pet.id`,
 * `Order.id` is `int64`, and live verification against `POST /store/order`
 * confirmed the server ignores a caller-supplied `id` it doesn't like (e.g.
 * negative) and substitutes its own auto-generated one, which can exceed
 * float64 precision. Always sending an explicit, safe-integer `id` keeps
 * create-then-assert tests deterministic.
 */
export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: faker.number.int({ min: 1, max: 2_147_483_647 }),
    petId: faker.number.int({ min: 1, max: 2_147_483_647 }),
    quantity: faker.number.int({ min: 1, max: 10 }),
    shipDate: faker.date.soon({ days: 14 }).toISOString(),
    status: 'placed',
    complete: false,
    ...overrides,
  };
}
