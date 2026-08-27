import { buildPet } from '../../src/data/pet.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { PetSchema } from '../../src/schemas/pet.schema';

test.describe('Pet API - update pet', () => {
  test('PUT /pet updates name and status, and the change persists on re-fetch', async ({
    petClient,
  }) => {
    const created = PetSchema.parse(await petClient.create(buildPet()));

    // buildPet() always supplies an id, so the created pet is guaranteed to have one.
    const updatedPayload = buildPet({
      id: created.id,
      photoUrls: created.photoUrls,
      name: 'Qualnexa-Updated-Pet',
      status: 'sold',
    });

    const updated = PetSchema.parse(await petClient.update(updatedPayload));

    expect(updated.id).toBe(created.id);
    expect(updated.name).toBe(updatedPayload.name);
    expect(updated.status).toBe(updatedPayload.status);

    // Live-verified: PUT /pet's change is immediately visible on re-fetch, with
    // no caching/eventual-consistency delay.
    const fetched = PetSchema.parse(await petClient.getById(created.id!));

    expect(fetched.name).toBe(updatedPayload.name);
    expect(fetched.status).toBe(updatedPayload.status);
  });
});
