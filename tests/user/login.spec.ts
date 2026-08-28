import { buildUser } from '../../src/data/user.factory';
import { test, expect } from '../../src/fixtures/api.fixtures';
import { ApiResponseSchema } from '../../src/schemas/common.schema';

test.describe('User API - login', () => {
  test('GET /user/login succeeds for a test-owned user and returns the documented headers', async ({
    userClient,
  }) => {
    const payload = buildUser();
    await userClient.create(payload);

    const { body, rateLimit, expiresAfter } = await userClient.login(
      payload.username!,
      payload.password!,
    );

    // Live-verified: the message embeds a non-deterministic timestamp, so
    // only the envelope shape is validated, not its exact content.
    ApiResponseSchema.parse(body);

    // Live-verified: X-Rate-Limit and X-Expires-After are the two headers
    // the spec documents on this operation's 200 response.
    expect(rateLimit).not.toBeNull();
    expect(expiresAfter).not.toBeNull();
  });
});
