import type { APIRequestContext } from '@playwright/test';

import { BaseClient } from '../base-client';
import type { Pet, PetStatus } from '../../schemas/pet.schema';

/** Client for the Swagger Petstore `/pet` resource. */
export class PetClient extends BaseClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  // Note: this hits Petstore's shared public sandbox, which accumulates
  // real-world junk data from every consumer of the demo API — it is not a
  // reliable source of schema-conformant data. Prefer create() + getById()
  // for anything that needs to assert response shape.
  async findByStatus(status: PetStatus): Promise<unknown> {
    // No leading slash: paths must be relative to `baseURL` (which ends in
    // `/`) so the URL() merge keeps the base path (e.g. `/v2`) intact.
    const response = await this.get('pet/findByStatus', { status });
    return response.json();
  }

  async getById(id: number): Promise<unknown> {
    const response = await this.get(`pet/${id}`);
    return response.json();
  }

  async create(pet: Pet): Promise<unknown> {
    const response = await this.post('pet', pet);
    return response.json();
  }
}
