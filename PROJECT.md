# Qualnexa — Project Status & Resume Point

**Read this file first when returning to this project — especially when returning
with a first real customer.** It is the single handoff document tying together
32 days of internal MVP development and the discovery framework prepared for
the next phase. Everything in it is drawn from actual repository state, not
memory or aspiration.

Last updated: 2026-08-30, at `HEAD = 7e04fac` (clean, synced with `origin/main`).

---

## 1. What this project is

Qualnexa's first product thesis: an AI-assisted API test automation framework,
built and proven against a public reference API (Swagger Petstore) before
being pointed at any real customer's API. "AI-assisted" has a precise,
deliberately narrow meaning here — see §4.

Two layers exist:

- **API automation layer** (Days 1–23): Playwright + `APIRequestContext`
  clients, Zod schemas, Faker factories, testing the live Petstore API.
- **Deterministic AI-assisted QA pipeline** (Days 24–31): a chain of pure,
  local, network-free functions that reason about that API's OpenAPI contract
  and this repository's own accumulated evidence.

Full architecture, component table, CLI usage, and real example output:
[`docs/QUALNEXA-MVP-v1.md`](docs/QUALNEXA-MVP-v1.md). Read that document for
_how it's built_. This document is for _what to do next_.

## 2. Current status: MVP v1 — COMPLETE WITH CONDITIONS

The internal development roadmap (Days 1–32) is **CLOSED**. Do not resume it
as "Day 33." The next phase is customer-driven, not calendar-driven (see §6).

```
git:            clean, HEAD 7e04fac == origin/main
tests:          95/95 passing (npx playwright test --list / npm test)
typecheck:      clean
lint:           clean
format:check:   clean
```

### Customer readiness (from Day 32's closure assessment)

| Level                                    | Status                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Internal demo                            | **READY**                                                                                                                  |
| Technical demo to a prospective customer | **READY WITH CONDITIONS** (must be framed honestly as a public-demo-API showcase; a second real spec has never been tried) |
| First controlled customer pilot          | **NOT READY** (see gaps below)                                                                                             |
| Production customer deployment           | **NOT READY**                                                                                                              |

**Do not describe this as production-ready SaaS to anyone.**

## 3. Pipeline stages (what's actually built)

| Stage                                    | Module                                                         | Proven output (Petstore)                                                                             |
| ---------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Contract Model                           | `src/contract/`                                                | 20 operations, 6 definitions                                                                         |
| Drift Engine                             | `src/drift/`                                                   | 25 findings (10 status-code, 9 security-not-enforced, 3 required-field, 2 enum, 1 collection-format) |
| Negative Test Intelligence               | `src/negative-tests/`                                          | 9 candidates (2 accepted, 2 deferred, 5 rejected — each with a cited reason)                         |
| AI Test Planner                          | `src/ai-test-planner/`                                         | 9 plan items (2 MUST, 2 OPTIONAL, 5 REJECT)                                                          |
| Test Generator                           | `src/test-generator/`                                          | 4 proposals (1 implementable, 2 needed a real client capability, 1 correctly deferred)               |
| Capability Resolution + Executable Tests | `src/api-clients/base-client.ts`, `tests/pet/`, `tests/store/` | 2 small backward-compatible client additions; 3 of 4 proposals became real, committed, passing tests |
| Quality Intelligence Report              | `src/quality-report/`                                          | Aggregates all of the above + a caller-supplied test-execution count                                 |
| MVP Integration                          | `tests/integration/full-pipeline.spec.ts`                      | Proves the handoffs between stages, not just each stage alone                                        |

Every stage follows the same shape: a Zod schema, a hand-curated data file
where judgment is required, a pure assembler with a `...FromCachedSources()`
wrapper, and a local test file that fails loudly on any stale reference.

## 4. What "AI" means here — restate this every time, to everyone

**Deterministic pipeline processing + structured evidence + human/session-authored
reasoning and judgment fields.** There is no LLM, no ML model, no API SDK, and
no network call anywhere in `src/contract/`, `src/drift/`, `src/negative-tests/`,
`src/ai-test-planner/`, `src/test-generator/`, or `src/quality-report/` —
verified by inspecting every import in those directories. Never call this
system autonomous. If a future LLM capability is ever proposed, it is a
separate product decision requiring its own evidence and approval — never add
one just to make Qualnexa look more "AI."

## 5. Known limitations (do not hide these from a prospect)

1. Contract Model proven against exactly **one** spec (Petstore, Swagger 2.0).
2. **OpenAPI 3.x is not supported** — the loader's types are written directly
   against Swagger 2.0 shapes.
3. No multi-customer workspace/data isolation exists — every curated dataset
   is one flat file scoped to Petstore.
4. No real customer credential/data handling exists or has ever been needed.
5. No production deployment, monitoring, alerting, or SLA infrastructure.
6. No multi-tenant architecture.
7. No customer-specific security/data-retention policy exists yet.
8. Curation (evidence, seeds, annotations, notes) is human/session-authored
   by design — permanent, not a gap to close.
9. No dashboard — output is typed objects and Playwright HTML/JSON reports.
10. No customer-onboarding tooling — onboarding a new spec today is a manual,
    engineer-driven exercise.

## 6. Roadmap closure

Days 21–32 are closed. **Do not create Day 33/34/35 automatically.** The next
phase is:

```
QUALNEXA CUSTOMER 1
Customer discovery → Problem validation → Artifact/spec assessment →
Technical demonstration → Pilot definition → Controlled pilot →
Measure results → Customer feedback → Product decision → Iteration
  (only where justified by real evidence)
```

Future engineering work must be triggered by a real customer problem, real
customer evidence, a validated product requirement, a security requirement, a
pilot requirement, or measurable feedback — never by "it might be useful."

## 7. Resume instructions — when a first customer shows up

Start at **Phase 1 (Customer discovery)**, not at architecture or code. Use
the framework already prepared:

- **Ideal first-customer profile**: small-to-medium REST API, Swagger 2.0 /
  OpenAPI 2.0 spec, suspected contract-vs-reality drift pain, sandbox/staging
  access available, comfortable with an expert-assisted (not self-service)
  engagement.
- **Target problem**: "We have an OpenAPI spec, but we don't know where our
  live API disagrees with it, or which negative test cases are worth writing
  versus noise."
- **Discovery questions to answer with real evidence** (not assumptions):
  their API/ecosystem, their spec (version + size), current testing
  process/tools, current pain, how negative tests are chosen today, manual
  effort involved, defects that escape today, what evidence they can safely
  share, what would count as measurable value, what would justify a pilot.
- **Minimum required artifact**: their OpenAPI/Swagger spec. Sandbox access
  is needed only once live-evidence verification begins, not for the first
  contract-model pass.
- **Before touching the Contract Model for a real spec**: run the
  compatibility classification first — OpenAPI version, operation/definition
  count, auth scheme, parameter patterns, `collectionFormat` usage, schema-ref
  shapes, deprecated flags, unusual constructs — and classify each as
  SUPPORTED / PARTIALLY SUPPORTED / UNPROVEN / UNSUPPORTED /
  REQUIRES CLIENT CAPABILITY / REQUIRES SCHEMA CHANGE / REQUIRES PRODUCT
  CHANGE. OpenAPI 3.x lands as UNSUPPORTED until proven otherwise.
- **Security defaults absent explicit customer answers**: never commit a
  customer's spec or any of their data to this repository; treat any API
  response as potentially sensitive; sandbox/staging only, never production,
  until explicitly authorized otherwise.
- **Demo flow**: lead with the customer's stated problem, not a diagram. Show
  real pipeline output (Petstore, today) clearly separated from what's
  illustrative of their case. State the limitations in §5 out loud, unprompted.
  Close by asking directly whether this addresses a real problem for them.
- **Pilot gate**: do not call anything a "pilot" from a demo alone. A pilot
  needs a real stated problem, an authorized artifact, a defined scope, named
  success criteria, a matched security/data agreement, defined inputs/outputs,
  explicit approval checkpoints, and a stop/rollback condition — produce a
  Customer Pilot Readiness Checklist and get explicit approval before running
  one.
- **Every feature request the customer raises**: classify it first — existing
  capability / config change / small customer-specific implementation /
  reusable product capability / security requirement / infrastructure
  requirement / major architectural change / not justified yet — and never
  implement anything beyond what's explicitly approved for exactly that
  reason.
- **Final outcome classification** at the end of the engagement: SUCCESS /
  PARTIAL SUCCESS / NOT READY / NOT A FIT / NO DECISION. Never force SUCCESS.

## 8. Working discipline to preserve

Every one of the 32 days that built this followed the same discipline —
preserve it for Customer 1 too:

Discovery (live verification, no code) → Proposal → explicit approval →
Implementation → Verification (typecheck, lint, format:check, test list,
full test run, independent re-run of anything new) → diff/status review →
commit only after explicit approval → push only after explicit approval →
stop and wait.

Never treat "continue," "looks good," "yes," or "okay" as permission to
expand scope beyond what was explicitly approved. If scope is ambiguous, stop
and ask.

## 9. Related documents

- [`docs/QUALNEXA-MVP-v1.md`](docs/QUALNEXA-MVP-v1.md) — full architecture,
  component table, CLI usage, real example output, security posture, future
  roadmap, code-quality review.
- [`docs/API-BEHAVIOR-NOTES.md`](docs/API-BEHAVIOR-NOTES.md) — every
  live-verified spec-vs-behavior finding on the Petstore API.
- [`docs/TEST-DATA-POLICY.md`](docs/TEST-DATA-POLICY.md) — test-data
  ownership/cleanup policy.
- [`CLAUDE.md`](CLAUDE.md) — approved technology decisions and architecture
  principles governing this repository.
