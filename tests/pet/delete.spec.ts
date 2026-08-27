import { ApiError } from '../../src/api-clients/base-client';
import { buildPet } from '../../src/data/pet.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';
import { PetSchema } from '../../src/schemas/pet.schema';

test.describe('Pet API - delete pet', () => {
  test('DELETE /pet/{petId} removes a just-created pet, and the deletion persists', async ({
    petClient,
  }) => {
    const created = PetSchema.parse(await petClient.create(buildPet()));

    // buildPet() always supplies an id, so the created pet is guaranteed to have one.
    const deleteResponse = ApiResponseSchema.parse(await petClient.deleteById(created.id!));

    // Live-verified: the success body's `message` is the deleted id, as a string.
    expect(deleteResponse.message).toBe(String(created.id));

    // Live-verified: the deletion is immediately visible — no caching delay.
    const error = await petClient.getById(created.id!).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });

  test('DELETE /pet/{petId} for a nonexistent pet returns 404', async ({ petClient }) => {
    const neverCreatedId = buildPet().id!;

    const error = await petClient.deleteById(neverCreatedId).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
