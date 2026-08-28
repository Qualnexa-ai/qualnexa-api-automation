import type { APIRequestContext } from '@playwright/test';

import { BaseClient } from '../base-client';
import type { User } from '../../schemas/user.schema';

/** Client for the Swagger Petstore `/user` resource. */
export class UserClient extends BaseClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async create(user: User): Promise<unknown> {
    const response = await this.post('user', user);
    return response.json();
  }

  async getByUsername(username: string): Promise<unknown> {
    const response = await this.get(`user/${username}`);
    return response.json();
  }
}
