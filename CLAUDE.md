# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Qualnexa's first MVP product: an AI-assisted API test automation framework. This repository currently
demonstrates the pattern against a public demo API (Swagger Petstore) before the AI-generation phase
and multi-client productization happen.

## Approved technology decisions

- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 24 LTS — do not downgrade to Node 20/22; `.nvmrc` pins `24`
- **Test framework:** Playwright Test
- **API testing:** Playwright `APIRequestContext` (no browsers — this is API-only testing, so
  `playwright install` is never required; do not add browser projects to `playwright.config.ts`)
- **Schema validation:** Zod — the single source of truth for both runtime response validation and
  inferred TS types (`src/schemas/`)
- **Test data:** `@faker-js/faker`
- **Reporting:** Playwright's built-in HTML (`reports/html`) and JSON (`reports/results.json`)
  reporters — no third-party reporter (e.g. Allure) unless a real need arises
- **Repository shape:** single package, no monorepo. Extraction into a shared `@qualnexa/*` package
  is deferred until a second consuming project actually exists (YAGNI)
- **Pre-commit hooks:** intentionally skipped for MVP (no Husky/lint-staged) — CI is the quality gate
- **Secrets:** `.env` is gitignored; `.env.example` is the committed template. Config defaults
  (e.g. the Petstore `BASE_URL`) are safe to default in `config/env.ts` since they're not secrets
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — installs deps, typechecks, lints, runs tests,
  uploads the `reports/` artifact

## Architecture principle

**The reusable automation engine is kept separate from API/client-specific code.** Concretely:

- `config/` — typed, env-driven configuration (Zod-validated). Nothing API-specific.
- `src/api-clients/` — thin wrappers over `APIRequestContext`, one subfolder per API resource
  (e.g. `pet/`). All HTTP calls go through `BaseClient` (`src/api-clients/base-client.ts`), which
  handles response-ok checking and raises `ApiError` with status + body on failure. **Test files
  must never call `request.get/post` directly** — always go through a client.
- `src/schemas/` — Zod schemas per resource; also the source of inferred TS types (e.g. `Pet`).
- `src/data/` — Faker-backed factory functions that build valid request payloads with overridable
  fields.
- `src/fixtures/api.fixtures.ts` — extends Playwright's `test` with ready-to-use client fixtures
  (e.g. `petClient`). Test files import `test`/`expect` from here, not from `@playwright/test`
  directly, so wiring a new client happens in exactly one place.
- `tests/` — spec files organized by resource, mirroring `src/api-clients/`. Specs should stay
  "dumb": call a client, apply a factory, assert against a schema. This is deliberate — it's what
  will make specs a safe target for AI-assisted generation in a future phase (not implemented yet).

When adding a new API resource, the pattern is: schema → client → factory (if needed) → fixture →
spec. Follow the `pet/` example end-to-end.

## AI-assisted test generation

**Implemented and available** — see [`docs/AI-TEST-GENERATION.md`](docs/AI-TEST-GENERATION.md) for
the full contract. In short: the cached OpenAPI spec (`openapi/petstore.swagger.json`) is the
preferred source of truth for what to generate; one operation is generated per run, in schema →
client → factory → fixture → spec order; specs are schema-first (`Schema.parse(...)`) and
deterministic (create-then-read-own-data, not assertions over shared/global state); an ESLint rule
scoped to `tests/**/*.spec.ts` blocks raw `request.get/post/...` calls in specs as a hard CI gate,
not just a review guideline; nothing is auto-committed. The `store/` resource
(`src/schemas/store.schema.ts`, `src/api-clients/store/`, `tests/store/inventory.spec.ts`) is the
worked reference example alongside `pet/`.

## Commands

```bash
npm install          # install dependencies
npm test              # run the full test suite (playwright test)
npx playwright test --list        # discover tests without running them
npx playwright test tests/pet/smoke.spec.ts   # run a single spec file
npm run test:report   # open the last HTML report
npm run typecheck     # tsc --noEmit
npm run lint           # eslint .
npm run lint:fix
npm run format          # prettier --write .
npm run format:check
```

Environment: copy `.env.example` to `.env` to override `BASE_URL`/`API_TIMEOUT_MS` locally; both
have safe defaults (Swagger Petstore) so the suite runs out of the box without a `.env` file.

## Explicitly deferred (not yet implemented)

- A fully automated generation pipeline (a script/service calling an LLM API to generate files
  without a human driving the session). The current capability is a human-in-the-loop playbook
  (see above) — deliberately, to keep output reviewable/deterministic and avoid adding an LLM SDK
  dependency before the manual workflow has proven out on more than one resource.
- Multi-environment config files (`config/env/<name>.env`) — deferred until a second real
  environment exists; today `config/env.ts` reads directly from `process.env`/`.env`.
- Extraction into a shared `@qualnexa/api-test-core` package and a project-scaffolding CLI (future
  productization phase).
