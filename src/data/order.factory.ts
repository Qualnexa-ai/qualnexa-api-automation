import { faker } from '@faker-js/faker';

import { safeId } from './safe-id';
import type { Order } from '../schemas/store.schema';

/**
 * Builds a valid `Order` payload for requests, with overridable fields.
 *
 * Always includes explicit `id`/`petId` values (see `safeId()`): live
 * verification against `POST /store/order` confirmed the server ignores a
 * caller-supplied `id` it doesn't like (e.g. negative) and substitutes its
 * own auto-generated one, which can exceed float64 precision. Explicit,
 * safe-integer ids keep create-then-assert tests deterministic.
 */
export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: safeId(),
    petId: safeId(),
    quantity: faker.number.int({ min: 1, max: 10 }),
    shipDate: faker.date.soon({ days: 14 }).toISOString(),
    status: 'placed',
    complete: false,
    ...overrides,
  };
}
