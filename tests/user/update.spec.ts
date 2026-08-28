import { buildUser } from '../../src/data/user.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';
import { UserSchema } from '../../src/schemas/user.schema';

test.describe('User API - update user', () => {
  test('PUT /user/{username} updates fields, and the change persists on re-fetch', async ({
    userClient,
  }) => {
    const created = buildUser();
    await userClient.create(created);

    const updatedPayload = buildUser({
      id: created.id,
      username: created.username,
      firstName: 'Qualnexa-Updated-FirstName',
      lastName: 'Qualnexa-Updated-LastName',
      userStatus: 2,
    });

    const updateResponse = ApiResponseSchema.parse(await userClient.update(updatedPayload));

    // Live-verified: PUT's success body is the same id-keyed ApiResponse
    // envelope as POST /user, not the updated User object — persistence is
    // confirmed via a follow-up GET below, not this response.
    expect(updateResponse.message).toBe(String(created.id));

    // Live-verified: the change is immediately visible — no caching delay.
    const fetched = UserSchema.parse(await userClient.getByUsername(created.username!));

    expect(fetched.firstName).toBe(updatedPayload.firstName);
    expect(fetched.lastName).toBe(updatedPayload.lastName);
    expect(fetched.userStatus).toBe(updatedPayload.userStatus);
  });
});
