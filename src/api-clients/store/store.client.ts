import type { APIRequestContext } from '@playwright/test';

import { BaseClient } from '../base-client';

/** Client for the Swagger Petstore `/store` resource. */
export class StoreClient extends BaseClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async getInventory(): Promise<unknown> {
    const response = await this.get('store/inventory');
    return response.json();
  }
}
