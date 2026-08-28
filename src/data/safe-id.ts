import { faker } from '@faker-js/faker';

/**
 * A random id within the JS safe-integer range, used by every factory
 * (`buildPet`, `buildOrder`, `buildUser`) so create-then-assert tests stay
 * deterministic. Petstore's `id` fields are `int64`; an auto-generated one
 * can exceed float64 precision (live-verified, e.g. `POST /pet` with no id
 * returns `9223372036854775807`), so factories always send an explicit,
 * safe-integer id rather than letting the server generate one.
 */
export function safeId(): number {
  return faker.number.int({ min: 1, max: 2_147_483_647 });
}
