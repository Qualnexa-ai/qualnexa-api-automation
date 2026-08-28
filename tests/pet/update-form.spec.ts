import { buildPet } from '../../src/data/pet.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';
import { PetSchema } from '../../src/schemas/pet.schema';

test.describe('Pet API - form update', () => {
  test('POST /pet/{petId} updates name and status via form data, leaving other fields untouched', async ({
    petClient,
  }) => {
    const created = PetSchema.parse(
      await petClient.create(
        buildPet({
          category: { id: 5, name: 'qualnexa-category' },
          photoUrls: ['http://example.com/a.jpg', 'http://example.com/b.jpg'],
          tags: [{ id: 9, name: 'qualnexa-tag' }],
        }),
      ),
    );

    const newName = 'Qualnexa-Form-Updated-Name';
    const newStatus = 'sold';

    const updateResponse = ApiResponseSchema.parse(
      await petClient.updateWithForm(created.id!, { name: newName, status: newStatus }),
    );

    // Live-verified: the success body's `message` is the updated id, as a
    // string — same envelope shape as PUT /pet, not the updated Pet object.
    expect(updateResponse.message).toBe(String(created.id));

    // Live-verified: this is a genuine partial update — only name/status
    // change; category, photoUrls, and tags are provably left untouched.
    const fetched = PetSchema.parse(await petClient.getById(created.id!));

    expect(fetched.id).toBe(created.id);
    expect(fetched.name).toBe(newName);
    expect(fetched.status).toBe(newStatus);
    expect(fetched.category).toEqual(created.category);
    expect(fetched.photoUrls).toEqual(created.photoUrls);
    expect(fetched.tags).toEqual(created.tags);
  });
});
