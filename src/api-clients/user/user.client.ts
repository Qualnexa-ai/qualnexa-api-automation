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

  async update(user: User): Promise<unknown> {
    const response = await this.put(`user/${user.username}`, user);
    return response.json();
  }

  async deleteByUsername(username: string): Promise<unknown> {
    const response = await this.delete(`user/${username}`);
    return response.json();
  }

  // Unlike every other method here, GET /user/login's contract includes
  // response headers (X-Rate-Limit, X-Expires-After), not just a body — so
  // this is the one method that returns more than response.json(). It stays
  // scoped to just the two documented header values, not the raw response.
  async login(
    username: string,
    password: string,
  ): Promise<{ body: unknown; rateLimit: string | null; expiresAfter: string | null }> {
    const response = await this.get('user/login', { username, password });
    return {
      body: await response.json(),
      rateLimit: response.headers()['x-rate-limit'] ?? null,
      expiresAfter: response.headers()['x-expires-after'] ?? null,
    };
  }
}
