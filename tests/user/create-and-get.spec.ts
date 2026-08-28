import { ApiError } from '../../src/api-clients/base-client';
import { buildUser } from '../../src/data/user.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';
import { UserSchema } from '../../src/schemas/user.schema';

test.describe('User API - create and get', () => {
  test('POST /user creates a user and returns a successful ApiResponse', async ({ userClient }) => {
    const payload = buildUser();

    const createResponse = ApiResponseSchema.parse(await userClient.create(payload));

    // Live-verified: the success body's `message` is the created id, as a string.
    expect(createResponse.message).toBe(String(payload.id));
  });

  test('GET /user/{username} returns the just-created user matching the schema', async ({
    userClient,
  }) => {
    const payload = buildUser();
    await userClient.create(payload);

    const user = UserSchema.parse(await userClient.getByUsername(payload.username!));

    expect(user.id).toBe(payload.id);
    expect(user.username).toBe(payload.username);
    expect(user.firstName).toBe(payload.firstName);
    expect(user.lastName).toBe(payload.lastName);
    expect(user.email).toBe(payload.email);
    expect(user.phone).toBe(payload.phone);
    expect(user.userStatus).toBe(payload.userStatus);
  });

  test('GET /user/{username} for a nonexistent username returns 404', async ({ userClient }) => {
    const neverCreatedUsername = buildUser().username!;

    const error = await userClient
      .getByUsername(neverCreatedUsername)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });
});
