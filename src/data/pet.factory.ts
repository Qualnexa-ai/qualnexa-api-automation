import { faker } from '@faker-js/faker';

import type { Pet } from '../schemas/pet.schema';

/**
 * Builds a valid `Pet` payload for requests, with overridable fields.
 *
 * Always includes an `id` within the JS safe-integer range: Petstore's `id`
 * is `int64`, and an auto-generated one can exceed float64 precision, so a
 * pet created without an explicit id can come back with an id that doesn't
 * actually resolve via GET /pet/{id}.
 */
export function buildPet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: faker.number.int({ min: 1, max: 2_147_483_647 }),
    name: faker.animal.dog(),
    photoUrls: [faker.image.url()],
    status: 'available',
    ...overrides,
  };
}
