import { ApiError } from '../../src/api-clients/base-client';
import { buildPet } from '../../src/data/pet.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';
import { PetSchema } from '../../src/schemas/pet.schema';

test.describe('Pet API - upload image', () => {
  test('POST /pet/{petId}/uploadImage succeeds with a file and additionalMetadata, and does not change the pet', async ({
    petClient,
  }) => {
    const created = PetSchema.parse(await petClient.create(buildPet()));

    const metadata = 'qualnexa-test-upload';
    const fileContent = 'qualnexa-in-memory-test-file-content';
    const fileBytes = Buffer.byteLength(fileContent);

    // buildPet() always supplies an id, so the created pet is guaranteed to have one.
    const uploadResponse = ApiResponseSchema.parse(
      await petClient.uploadImage(created.id!, {
        file: {
          name: 'qualnexa-test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(fileContent),
        },
        additionalMetadata: metadata,
      }),
    );

    // Live-verified: the message deterministically echoes the metadata value
    // and the uploaded byte count — both of which we control here.
    expect(uploadResponse.message).toContain(metadata);
    expect(uploadResponse.message).toContain(`${fileBytes} bytes`);

    // Live-verified: the upload has no observable effect on the Pet resource.
    const fetched = PetSchema.parse(await petClient.getById(created.id!));
    expect(fetched.photoUrls).toEqual(created.photoUrls);
  });

  test('POST /pet/{petId}/uploadImage without a file returns 500', async ({ petClient }) => {
    const created = PetSchema.parse(await petClient.create(buildPet()));

    // Live-verified: the OpenAPI contract declares `file` optional, but
    // omitting it crashes the server with a 500 — this documents that real,
    // reproducible defect rather than inventing a graceful failure.
    const error = await petClient
      .uploadImage(created.id!, { additionalMetadata: 'qualnexa-missing-file-check' })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });
});
