import { test as base } from '@playwright/test';

import { PetClient } from '../api-clients/pet/pet.client';
import { StoreClient } from '../api-clients/store/store.client';
import { UserClient } from '../api-clients/user/user.client';

interface ApiFixtures {
  petClient: PetClient;
  storeClient: StoreClient;
  userClient: UserClient;
}

/**
 * Extends Playwright's `test` with ready-to-use API client fixtures. Test
 * files import `test`/`expect` from here instead of `@playwright/test`
 * directly, so new clients only need to be wired up in one place.
 */
export const test = base.extend<ApiFixtures>({
  petClient: async ({ request }, use) => {
    await use(new PetClient(request));
  },
  storeClient: async ({ request }, use) => {
    await use(new StoreClient(request));
  },
  userClient: async ({ request }, use) => {
    await use(new UserClient(request));
  },
});

export { expect } from '@playwright/test';
