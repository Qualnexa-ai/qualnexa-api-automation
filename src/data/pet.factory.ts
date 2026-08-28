import { faker } from '@faker-js/faker';

import { safeId } from './safe-id';
import type { Pet } from '../schemas/pet.schema';

/**
 * Builds a valid `Pet` payload for requests, with overridable fields.
 *
 * Always includes an explicit `id` (see `safeId()`) — a pet created without
 * one can come back with an id that doesn't actually resolve via
 * `GET /pet/{id}`.
 *
 * `name` is always Qualnexa-prefixed, matching `buildUser()`'s `username`
 * convention — this is a shared public sandbox, so tagging what this suite
 * creates keeps it identifiable at a glance (see docs/TEST-DATA-POLICY.md).
 */
export function buildPet(overrides: Partial<Pet> = {}): Pet {
  return {
    id: safeId(),
    name: `Qualnexa-${faker.animal.dog()}`,
    photoUrls: [faker.image.url()],
    status: 'available',
    ...overrides,
  };
}
