import { z } from 'zod';

/**
 * `User` per the OpenAPI spec (definitions.User) — no `required` array, so
 * every field is optional, the same pattern already established for `Order`.
 *
 * Live-verified: on this public demo, `password` round-trips in cleartext on
 * `GET /user/{username}` — expected for a toy API, not a pattern to carry
 * over to a real user-data endpoint. No `email` format validation is applied
 * here either: the spec declares `email` as a plain `string`, and live
 * verification never exercised any server-side format enforcement, so this
 * schema doesn't invent one.
 */
export const UserSchema = z.object({
  id: z.number().int().optional(),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  phone: z.string().optional(),
  userStatus: z.number().int().optional(),
});

export type User = z.infer<typeof UserSchema>;
