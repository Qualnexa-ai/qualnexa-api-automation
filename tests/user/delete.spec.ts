import { ApiError } from '../../src/api-clients/base-client';
import { buildUser } from '../../src/data/user.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';

test.describe('User API - delete user', () => {
  test('DELETE /user/{username} removes a just-created user, and the deletion persists', async ({
    userClient,
  }) => {
    const payload = buildUser();
    await userClient.create(payload);

    const deleteResponse = ApiResponseSchema.parse(
      await userClient.deleteByUsername(payload.username!),
    );

    // Live-verified: unlike Pet/Order deletes (id-keyed message), the User
    // delete envelope's `message` is the deleted username.
    expect(deleteResponse.message).toBe(payload.username);

    // Live-verified: the deletion is immediately visible — no caching delay.
    const error = await userClient
      .getByUsername(payload.username!)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
