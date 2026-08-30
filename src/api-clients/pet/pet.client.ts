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
  async findByStatus(status: PetStatus | PetStatus[]): Promise<unknown> {
    // No leading slash: paths must be relative to `baseURL` (which ends in
    // `/`) so the URL() merge keeps the base path (e.g. `/v2`) intact.
    //
    // The declared collectionFormat: multi (repeated status= keys) is
    // live-verified NOT to work (Day 7) — only the first value is honored.
    // A comma-separated single value does work as an undocumented OR
    // filter, so an array is joined into one string here rather than
    // widening BaseClient.get()'s params type to send repeated keys.
    const statusParam = Array.isArray(status) ? status.join(',') : status;
    const response = await this.get('pet/findByStatus', { status: statusParam });
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

  async update(pet: Pet): Promise<unknown> {
    const response = await this.put('pet', pet);
    return response.json();
  }

  async deleteById(id: number): Promise<unknown> {
    const response = await this.delete(`pet/${id}`);
    return response.json();
  }

  // `file` stays optional here, matching the OpenAPI contract's own
  // declaration — even though live verification found omitting it causes a
  // server-side 500. Keeping it optional lets that documented defect be
  // exercised through this client rather than bypassing it.
  async uploadImage(
    petId: number,
    options: {
      file?: { name: string; mimeType: string; buffer: Buffer };
      additionalMetadata?: string;
    } = {},
  ): Promise<unknown> {
    const multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }> =
      {};

    if (options.file) {
      multipart.file = options.file;
    }
    if (options.additionalMetadata !== undefined) {
      multipart.additionalMetadata = options.additionalMetadata;
    }

    const response = await this.postMultipart(`pet/${petId}/uploadImage`, multipart);
    return response.json();
  }

  async updateWithForm(
    petId: number,
    fields: { name?: string; status?: string },
  ): Promise<unknown> {
    const form: Record<string, string> = {};

    if (fields.name !== undefined) {
      form.name = fields.name;
    }
    if (fields.status !== undefined) {
      form.status = fields.status;
    }

    const response = await this.postForm(`pet/${petId}`, form);
    return response.json();
  }
}
