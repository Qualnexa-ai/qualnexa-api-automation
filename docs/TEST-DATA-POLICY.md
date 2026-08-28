# Test Data Policy

This document states, explicitly, how this repository generates, owns, and
(mostly deliberately) doesn't clean up its test data — based on the actual
behavior of the suite as of Day 23, not aspiration. If a future change makes
any part of this inaccurate, update this file alongside it.

## Ownership: every test creates its own data

Every test in this suite creates the resource it needs before acting on it —
`create()` then `getById()`/`update()`/`deleteById()`/etc. — and asserts only
against what it created. **No test depends on another test's leftover data**,
and no test depends on any pre-existing data on the shared public Petstore
sandbox (the two exceptions, `GET /store/inventory` and
`GET /pet/findByStatus`, deliberately restrict themselves to structural
assertions — see [`API-BEHAVIOR-NOTES.md`](API-BEHAVIOR-NOTES.md) — precisely
because that data isn't test-owned). This makes the suite safe to run in
parallel, in any order, and repeatedly, without coordination between tests.

## Identifying what this suite owns

Because Petstore is a shared public sandbox with real-world data from every
consumer of the demo API, test-owned data is tagged so it's identifiable:

- **Ids**: every factory (`buildPet`, `buildOrder`, `buildUser`) uses
  `safeId()` for an explicit, JS-safe-integer id, rather than letting the
  server auto-generate one — both for determinism (a create-then-read/update/
  delete chain needs a stable id) and so ids stay within a predictable range.
- **Names/usernames**: `buildUser()`'s `username` is always
  `qualnexa-<random>`, and `buildPet()`'s `name` is always
  `Qualnexa-<random animal name>` — both avoid the OpenAPI spec's stale
  example values (`user1`, etc. — see `API-BEHAVIOR-NOTES.md`'s "known
  unreliable example data") and make this suite's own data recognizable if
  anyone inspects the shared sandbox.
- **`Order`** has no equivalent free-text field to tag this way; its
  ownership marker is its `safeId()`-generated `id`/`petId`, which is all
  that's structurally available on that resource.

## Cleanup: intentional, not comprehensive

Only the tests whose actual purpose is exercising a delete operation clean up
after themselves — `tests/pet/delete.spec.ts`, `tests/store/delete-order.spec.ts`,
`tests/user/delete.spec.ts` — because for those tests, deleting the
just-created resource (and confirming it's gone) **is the behavior under
test**, not incidental housekeeping.

Every other test (`smoke`, `update`, `update-form`, `upload-image`,
`get-order`, `place-order`, `create-and-get`, `login`, etc.) creates a
resource and leaves it behind on the shared sandbox permanently. This is
**deliberate, not an oversight**:

- No test's correctness depends on the absence of prior test-owned data —
  every create uses a fresh, unique id/name, so leftover data from earlier
  runs never causes a false pass or false failure.
- The only cost of not cleaning up is cosmetic clutter on a public demo
  sandbox that already contains far more third-party data than this suite
  could ever add (see `API-BEHAVIOR-NOTES.md`'s cross-cutting finding on the
  shared dataset).
- Building generic cleanup-tracking infrastructure (a fixture that records
  everything a test created and tears it down afterward, regardless of the
  test's actual purpose) would add real complexity to solve a problem that
  doesn't currently exist — see "Deliberately deferred" below.

## Deliberately deferred, not overlooked

Two capabilities were explicitly considered during the Day 23 review and
rejected as unjustified **today**, not ruled out forever:

- **A database-backed test-data service** (a persistent store tracking
  created records, ownership, and cleanup state across runs). Nothing in
  this suite's current scale or failure modes needs it — every test's data
  lifecycle is fully self-contained already.
- **A multi-environment configuration model** (`dev`/`staging`/`preprod`/
  `production`). There is exactly one target today (the public Petstore
  sandbox) — this mirrors [`CLAUDE.md`](../CLAUDE.md)'s own "Explicitly
  deferred" section, which states the same conclusion for the same reason:
  no second real environment exists yet.

Both should be revisited only when concrete evidence — a real second
environment, or a real test-reliability problem caused by leftover data —
justifies the added complexity, not before.
