# API Behavior Notes — Swagger Petstore

This document indexes the real, **live-verified** deviations between
`openapi/petstore.swagger.json` and the actual behavior of
`https://petstore.swagger.io/v2`, discovered while building this repository's
test coverage (Days 1–20 of the Qualnexa AI-assisted test-generation
exercise). It exists because that knowledge was previously scattered across
individual code comments in 14+ spec files with no single index — see the
Day 21 hardening discovery for why this was worth centralizing.

**How to use this document:** before writing a new test against an operation
covered here, read its entry first. Every claim below was confirmed against
the live API, not inferred from the spec — see [`CLAUDE.md`](../CLAUDE.md)
and [`AI-TEST-GENERATION.md`](AI-TEST-GENERATION.md) for the process that
produced these findings. Nothing here should be treated as permanent or
guaranteed — this is a shared public third-party sandbox that can change; if
a future session's live verification contradicts an entry here, trust the
live result and update this file.

## Cross-cutting patterns

These hold across every resource, not just one operation:

1. **Declared `required` fields are not enforced.** Omitting a spec-required
   field (`Pet.name`/`photoUrls`, `POST /user/login`'s `password`, etc.)
   never produces a validation error — the server accepts it and defaults
   the field itself.
2. **Declared `security` is not enforced anywhere.** `api_key` and
   `petstore_auth` are declared on several operations; every one of them was
   tested with no auth headers, a bogus key, and a valid-looking key, with
   identical results each time. There is no real authentication or
   authorization on this API.
3. **Success responses are frequently undocumented.** The spec often
   declares only error codes (or `default`) for an operation that in
   practice returns a real, deterministic `200`. Confirmed on: `POST /pet`,
   `PUT /pet`, `DELETE /pet/{petId}`, `POST /pet/{petId}` (form update),
   `POST /pet/{petId}/uploadImage`, `POST /user`, `PUT /user/{username}`,
   `DELETE /user/{username}`.
4. **Non-integer path ids leak a raw Java stack trace.** `GET/DELETE
/pet/{petId}`, `GET/DELETE /store/order/{orderId}` all return `404` with
   `message: "java.lang.NumberFormatException: For input string: \"...\""`
   instead of the documented `400` — an implementation detail leaking into
   the error body, not a clean validation error.
5. **`PUT` operations upsert rather than requiring an existing resource.**
   `PUT /pet` and `PUT /user/{username}` both create the resource if the
   target doesn't exist, returning `200`, not the documented `404`. (Notably,
   `POST /pet/{petId}` — the form-update operation — does **not** do this;
   it correctly `404`s on a nonexistent pet. Don't assume upsert semantics
   apply to every "update" operation.)
6. **The `ApiResponse` envelope's `message` field is inconsistently keyed.**
   `POST`/`PUT /pet`, `POST /user`, `PUT /user/{username}`, `DELETE
/pet/{petId}`, `DELETE /store/order/{orderId}` all key `message` by the
   numeric **id**. `DELETE /user/{username}` is the one exception — its
   `message` is the **username**. Don't assume this is uniform when writing
   a new delete test.
7. **The shared public dataset is genuinely dirty and mutable.** `GET
/store/inventory` and `GET /pet/findByStatus` return real, uncurated data
   from every consumer of this public demo (junk keys like `"totvs"`,
   `"Vendido"`, `"домашн..."`; pets missing spec-required fields like
   `name`/`photoUrls`). Never assert exact counts, exact membership, or run
   a strict schema `.parse()` over the full shared response — use test-owned
   data or structural-only assertions instead.

## Pet resource

| Operation                         | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /pet`                       | Undocumented `200` (spec declares only `405`). Declared-required `name`/`photoUrls` and the `status` enum are not enforced — even `{}` succeeds. An id-less create can return a server-generated id of `9223372036854775807` (int64 max) — a float64-precision trap; factories always send an explicit safe id (`safeId()`).                                                                                                                                                                                                                      |
| `PUT /pet`                        | Undocumented `200` returning the full updated `Pet` object (unlike most other undocumented successes, which return the `ApiResponse` envelope). Upserts on a nonexistent id — see cross-cutting #5.                                                                                                                                                                                                                                                                                                                                               |
| `DELETE /pet/{petId}`             | Undocumented `200` + `ApiResponse` (`message` = id). Nonexistent id → `404`, empty body. Non-integer id → `404` with a leaked exception (cross-cutting #4).                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /pet/{petId}`                | Nonexistent id → `404` with a proper JSON `ApiResponse` body (unlike delete's empty body). Non-integer id → `404` with a leaked exception.                                                                                                                                                                                                                                                                                                                                                                                                        |
| `GET /pet/findByStatus`           | The declared `collectionFormat: multi` (repeated `status=` query keys) does **not** work — only the first occurrence is honored, the rest are silently dropped. A **comma-separated single value** (`status=a,b`) works correctly as an OR filter, an encoding the spec doesn't declare at all. Invalid enum value or a missing (declared-required) `status` param both return `200` + `[]`, not the documented `400`.                                                                                                                            |
| `GET /pet/findByTags`             | Spec-marked `deprecated: true`. Live-verified to return `0` results for every input tested, including the spec's own suggested example values (`tag1`, `tag2`, `tag3`) — there is currently no reachable data to test against on the live server, independent of the deprecation. **Not automated; do not automate.**                                                                                                                                                                                                                             |
| `POST /pet/{petId}/uploadImage`   | Undocumented `200` + `ApiResponse`; the `message` deterministically echoes the submitted `additionalMetadata` and the uploaded byte count. Has **no observable effect** on the `Pet` resource — `photoUrls` is unchanged after upload. Omitting the declared-optional `file` field crashes with an undocumented `500` (HTML error page, not JSON) — a real, reproducible server defect, regression-guarded by `tests/pet/upload-image.spec.ts`. No referential check against a real `petId` — uploading against a nonexistent pet still succeeds. |
| `POST /pet/{petId}` (form update) | Undocumented `200` + `ApiResponse` (`message` = id). This is a genuine **partial update** — only `name`/`status` (whichever are sent) change; `category`/`photoUrls`/`tags`/`id` are provably untouched. Unlike `PUT /pet`, this operation does **not** upsert — a nonexistent `petId` returns `404` (`message: "not found"`). An empty form body is a graceful no-op `200`, not an error (contrast with `uploadImage`'s crash on a comparably-optional missing field).                                                                           |

## Store / Order resource

| Operation                       | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /store/inventory`          | Declares `security: [api_key]`; not enforced (cross-cutting #2). Response is genuinely shared/dirty data (cross-cutting #7).                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /store/order`             | The server reformats `shipDate`'s string representation on round-trip (a sent `"...Z"` suffix comes back as an equivalent `"...+0000"` offset — same instant, different string) — compare by parsed timestamp, not raw string equality. An empty `{}` body succeeds (`200`) with server-defaulted fields (`petId: 0`, `complete: false`). A type-mismatched field (`quantity` as a string) returns an undocumented `500`, not the declared `400` — a real, reproducible defect, regression-guarded by `tests/store/place-order.spec.ts`. |
| `GET /store/order/{orderId}`    | The spec's description ("try ids 1–10 for a valid response") is **stale/unreliable** — live-verified some ids in that range `404` while others return unrelated data belonging to other public consumers. The declared `minimum: 1`/`maximum: 10` constraint is not enforced. **Never rely on ids 1–10 as test data** — always create-then-read your own order.                                                                                                                                                                          |
| `DELETE /store/order/{orderId}` | Undocumented `200` + `ApiResponse` (`message` = id). A "double delete" and a "never existed" id are indistinguishable — both `404`, empty body.                                                                                                                                                                                                                                                                                                                                                                                          |

## User / Auth resource

| Operation                 | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /user`              | Undocumented `200` + `ApiResponse` (`message` = id). `{}` succeeds, defaulting `id` to `0` (unlike `Pet`'s huge auto-generated id — the same precision-trap risk doesn't manifest the same way here, but an explicit id is still sent for determinism).                                                                                                                                                                                                                |
| `GET /user/{username}`    | `password` is returned in **cleartext** on this public demo — expected for a toy API, not a pattern to reuse. Nonexistent username → `404`.                                                                                                                                                                                                                                                                                                                            |
| `PUT /user/{username}`    | Undocumented `200` + `ApiResponse` (`message` = id) — **not** the updated `User` object (contrast with `PUT /pet`, which does echo the updated resource). Verify an update via a follow-up `GET`, not the `PUT` response itself. Upserts on a nonexistent username (cross-cutting #5).                                                                                                                                                                                 |
| `DELETE /user/{username}` | Undocumented `200` + `ApiResponse`, but `message` is the **username**, not the id — the one exception to cross-cutting #6. Nonexistent username → `404`, empty body.                                                                                                                                                                                                                                                                                                   |
| `GET /user/login`         | Accepts **any** username/password combination, including credentials that were never created — there is no real authentication on this API (cross-cutting #2). Even omitting the declared-required `password` query param still succeeds. Returns the two documented headers (`X-Rate-Limit`, `X-Expires-After`) reliably; no `Set-Cookie` or any other session artifact is ever set. The response `message` embeds a live timestamp — never assert its exact content. |
| `GET /user/logout`        | Fully stateless — works identically with or without a prior login call, and there is no session/cookie/token for it to invalidate. Not automated (no observable behavior to assert beyond "returns 200").                                                                                                                                                                                                                                                              |

## Documented, reproducible server defects (regression-guarded)

| Defect                                                                                         | Test                              |
| ---------------------------------------------------------------------------------------------- | --------------------------------- |
| `POST /store/order` with a type-mismatched field → `500` instead of the declared `400`         | `tests/store/place-order.spec.ts` |
| `POST /pet/{petId}/uploadImage` without `file` → `500`, despite `file` being declared optional | `tests/pet/upload-image.spec.ts`  |

## Known-unreliable example data — do not use as test fixtures

- Order ids `1`–`10` (the spec description's suggested "valid" range for `GET/DELETE /store/order/{orderId}`).
- Username `user1` (the spec description's suggested test username).
- Tags `tag1`, `tag2`, `tag3` (the spec description's suggested test tags for `findByTags`).
- Any exact key/count/value assertion against `GET /store/inventory` or `GET /pet/findByStatus`.
