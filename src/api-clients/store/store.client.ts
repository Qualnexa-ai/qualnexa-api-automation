import type { APIRequestContext } from '@playwright/test';

import { BaseClient } from '../base-client';
import type { Order } from '../../schemas/store.schema';

/** Client for the Swagger Petstore `/store` resource. */
export class StoreClient extends BaseClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async getInventory(): Promise<unknown> {
    const response = await this.get('store/inventory');
    return response.json();
  }

  async placeOrder(data: Order): Promise<unknown> {
    const response = await this.post('store/order', data);
    return response.json();
  }
}
