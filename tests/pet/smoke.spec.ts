import { test, expect } from '../../src/fixtures/api.fixtures';
import { PetSchema } from '../../src/schemas/pet.schema';
import { buildPet } from '../../src/data/pet.factory';

test.describe('Pet API smoke', () => {
  test('POST /pet creates a pet matching the request payload and schema', async ({ petClient }) => {
    const payload = buildPet({ name: 'Qualnexa-Smoke-Test-Pet' });
    const created = PetSchema.parse(await petClient.create(payload));

    expect(created.name).toBe(payload.name);
    expect(created.status).toBe(payload.status);
  });

  test('GET /pet/{id} returns the just-created pet matching the schema', async ({ petClient }) => {
    const payload = buildPet();
    const created = PetSchema.parse(await petClient.create(payload));

    // buildPet() always supplies an id, so the created pet is guaranteed to have one.
    const fetched = PetSchema.parse(await petClient.getById(created.id!));
    expect(fetched.name).toBe(created.name);
  });
});
