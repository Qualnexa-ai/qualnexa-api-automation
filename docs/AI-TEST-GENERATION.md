# AI-Assisted Test Generation

This document is the contract an AI agent (or a human) follows to add new API test coverage to
this repository. It is a **playbook**, not a script — generation happens inside a normal Claude
Code (or equivalent) session, following this procedure, with every output reviewed and approved
by a human before it's committed. There is no separate generation tool or LLM API integration in
this repository; the AI doing the generating is whichever agent is driving the session, and this
document is what keeps its output consistent, safe, and reviewable regardless of who runs it or
when.

See [`CLAUDE.md`](../CLAUDE.md) for the overall architecture this generation targets.

## 1. OpenAPI/spec-driven input

The target API's OpenAPI/Swagger definition is the source of truth for what to generate —
preferred over inferring behavior from prose, examples, or guesswork.

- The spec is cached in-repo at `openapi/petstore.swagger.json`, not fetched live on every
  generation run. A stale-but-versioned spec is more useful than a live one that could change
  between the moment code is generated and the moment it's reviewed — reproducibility matters
  more than freshness here.
- Refreshing the cached spec is a separate, explicit, human-approved step (re-fetch, diff against
  the previous version, review what changed), never an implicit side effect of generating tests.
- Each generation run targets **one specific operation or resource** read from the spec (e.g.
  `GET /store/inventory`) — never "generate coverage for the whole spec" in one pass. Small,
  reviewable diffs only.

## 2. Generation order

Always in this order, and only the layers the operation actually needs:

1. **Schema** (`src/schemas/<resource>.schema.ts`) — a Zod schema for the response shape, derived
   from the spec's `responses`/`definitions`. Skip if a schema for this shape already exists.
2. **Client** (`src/api-clients/<resource>/<resource>.client.ts`) — a method on a class extending
   `BaseClient`, named after what it does (`getInventory`, `findByStatus`), calling
   `this.get(...)`/`this.post(...)` with a **relative path with no leading slash** (see
   `base-client.ts` / existing clients for why — `baseURL` already carries the API's base path).
   Create the client file if the resource has none yet.
3. **Data factory** (`src/data/<resource>.factory.ts`) — only if the operation takes a request
   body. Faker-backed, matching the pattern in `pet.factory.ts` (including: always send an
   explicit numeric `id` on create, to avoid int64/float64 precision loss on Petstore's
   auto-generated ids).
4. **Fixture** (`src/fixtures/api.fixtures.ts`) — one new entry, only if step 2 introduced a new
   client class.
5. **Spec** (`tests/<resource>/<name>.spec.ts`) — written **last**, after everything above
   exists. See §4.

Writing the spec last is what makes the "no raw HTTP in specs" rule (§5) trivially satisfiable —
by the time the spec is generated, a client method already exists to call.

## 3. Schema-first assertions

Response validation goes through the Zod schema, not ad hoc field-by-field checks:

- Prefer `SomeSchema.parse(response)` in specs — it throws a descriptive `ZodError` on mismatch,
  which is a clear, single-point test failure. (`.safeParse()` + manual conditional branching is
  avoidable in most cases and trips `eslint-plugin-playwright`'s `no-conditional-expect`/
  `no-conditional-in-test` rules — prefer `.parse()` unless the test specifically needs to inspect
  the schema failure.)
- The schema is the single source of truth for both the runtime check and the TS type
  (`z.infer<typeof Schema>`) — don't hand-write a parallel interface next to it.

## 4. Test spec structure

Specs stay thin. A generated spec should contain, and only contain:

- Fixture destructuring (`{ petClient }`, `{ storeClient }`, ...) from
  `src/fixtures/api.fixtures.ts`
- Calls to client methods
- Calls to data factories, when a payload is needed
- Assertions — schema `.parse()` calls and/or direct field checks on already-validated data

A spec must never contain: base URLs, header construction, status-code branching, retry/timeout
logic, or environment/config lookups. All of that belongs in `BaseClient`/`config/env.ts`, which
already exist and are not the generator's concern.

## 5. Forbidden: raw HTTP/auth/config logic in specs

Generated (and hand-written) specs must not call Playwright's raw `request` fixture directly, and
must not read `config/env.ts` or `process.env` directly. This is enforced two ways:

- **Structurally**, by generation order (§2) — the spec is written against an existing client
  method, so there's no reason to reach for `request` directly.
- **Automatically**, by an ESLint rule scoped to `tests/**/*.spec.ts`
  (`eslint.config.mjs`) that flags destructuring the `request` fixture or calling
  `request.get/post/put/delete/patch/head/fetch(...)`. This is a hard CI gate, not just a review
  guideline — `npm run lint` fails if a generated spec bypasses the client layer.

## 6. Deterministic test generation

Generated tests must produce the same pass/fail outcome on every run, independent of what other
consumers of a shared public API happen to be doing at the same time:

- Prefer **create → read your own data**, not "read whatever's already there." Petstore's shared
  endpoints (e.g. `findByStatus`) accumulate real, sometimes schema-violating junk from every
  consumer of the demo API — asserting schema conformance over that data is not deterministic.
  Asserting over data the test itself just created is.
- When an endpoint is inherently read-only/shared and can't be scoped to data the test owns (e.g.
  `GET /store/inventory`, whose _values_ fluctuate with global usage), assert on **structure**
  (shape, types, "at least one entry"), not on specific values.
- Faker-generated input is fine (and expected) for request payloads; assertions should check that
  the response echoes what was sent, not assert against literal random values independently
  computed a second time.

## 7. Human review before commit

The workflow never auto-commits or auto-pushes. Every generation run ends with:

1. `npm run typecheck` — must pass
2. `npm run lint` — must pass, including the rule in §5
3. `npx playwright test --list` — confirms the new spec is discovered
4. `npm test` (or a scoped run of just the new spec) against the live target API — confirms the
   generated test actually passes, not just compiles
5. A diff shown to, and approved by, a human — same review cadence as any other change in this
   repository

Only after explicit approval does the change get committed (and only pushed if separately asked).

## Worked example

`GET /store/inventory` (see `openapi/petstore.swagger.json`, `paths./store.inventory.get`) is the
reference example this playbook was validated against:

- `src/schemas/store.schema.ts` — `StoreInventorySchema`, a `z.record(string, number)` (the spec
  declares `additionalProperties: integer`, not a fixed set of keys)
- `src/api-clients/store/store.client.ts` — `StoreClient.getInventory()`
- `src/fixtures/api.fixtures.ts` — added the `storeClient` fixture entry
- No factory — the operation takes no request body
- `tests/store/inventory.spec.ts` — one test, asserting the response parses as the schema and has
  at least one entry (deterministic structural check; the actual counts are shared, fluctuating
  state and not something a test should assert exact values against)
