import { faker } from '@faker-js/faker';

import { safeId } from './safe-id';
import type { User } from '../schemas/user.schema';

/**
 * Builds a valid `User` payload for requests, with overridable fields.
 *
 * `username` is always a randomly-suffixed, Qualnexa-prefixed value rather
 * than relying on the spec description's example ("Use user1 for testing")
 * or Faker's own username generator alone — this is a shared public sandbox,
 * so a fixed/predictable username risks colliding with data left behind by
 * other consumers or prior runs.
 */
export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: safeId(),
    username: `qualnexa-${faker.string.alphanumeric({ length: 10, casing: 'lower' })}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    phone: faker.phone.number(),
    userStatus: 1,
    ...overrides,
  };
}
