# Beilox QA Automation Challenge

Playwright + TypeScript automation for the Central de Pasajes reference website and the public SWAPI.tech API.

## Requirements

- Node.js 20 or newer
- npm
- Chromium (installed with the Playwright command below)

## Setup and commands

```powershell
npm ci
npx playwright install chromium
Copy-Item .env.example .env
```

`.env` contains only configurable base URLs; no credentials are required for these public test targets. It is ignored by Git. The checked-in `.env.example` is safe to copy and edit.

```powershell
npm test
npm run test:ui
npm run test:ui:headed
npm run test:api
npm run typecheck
```

`npm test` runs both Playwright projects. `test:ui:headed` opens Chromium so the browser flow can be observed. The API happy-path tests write the latest response bodies to `tests/api/snapshots/{people,planets,films}.json`.

The base URLs can be overridden with `BASE_URL` and `SWAPI_BASE_URL`. The Playwright configuration normalizes the trailing slash on `SWAPI_BASE_URL`, since API test paths are relative to it.

## Coverage

### UI

The UI suite uses the live Central de Pasajes site as a reference. Its scenarios cover:

- A valid Retiro → Ezeiza search, its results URL, and the exact `30 Oct` date element.
- A valid Lago Puelo → Retiro search with no services and the site's no-results message.
- Required-field validation when searching without a destination or date.
- Browser back navigation from results to the search form.

The site is third-party and production-facing, so its availability, data, and markup can change independently of this project. The no-results case relies on the currently observed availability for its route/date and should be revisited if the provider's schedule changes.

### API

For each of `/people`, `/planets`, and `/films`, the suite checks:

- A successful `/{resource}/1` response: HTTP 200, AJV schema, and response time below 5 seconds. The happy-path body is written as JSON.
- A missing numeric ID and a malformed ID: HTTP 404, error-envelope AJV schema, and response time below 5 seconds.

The live API currently returns 404 for both invalid-ID cases rather than 400. The negative-response schema accepts either `message` or the observed `messsage` spelling; the latter is currently returned for a missing planet. This keeps the assertion aligned with the actual public service response rather than silently assuming a corrected contract.

## Project structure

```text
.github/workflows/playwright.yml    Scheduled and manually triggered CI
src/api/schemas.ts                  AJV schemas and response validation
src/fixtures/test.fixture.ts        Custom fixture that injects HomePage
src/pages/HomePage.ts               UI selectors and page actions
tests/api/swapi.api.spec.ts         API success/error cases and JSON snapshots
tests/api/snapshots/                Generated happy-path response bodies
tests/ui/search.spec.ts             UI scenarios and assertions
playwright.config.ts                Separate UI and API projects
```

The `ui` and `api` Playwright projects have independent test directories and base URLs. The UI tests receive `HomePage` from a `test.extend` fixture. Selectors and UI interactions stay in the page object; the spec owns scenario orchestration and assertions. TypeScript strict mode is enabled.

## CI schedule and scaling

`.github/workflows/playwright.yml` runs every Monday at `18:00 UTC`, which is `15:00` in Argentina (GMT-3), and can also be started with `workflow_dispatch`. GitHub Actions cron uses UTC. The job installs Node dependencies and Chromium, type-checks, runs both Playwright projects, and uploads the generated API JSON bodies as an artifact. No secrets are needed for these public targets.

If the suite grows substantially, I would keep UI and API as separate jobs/projects, shard the UI suite across workers or runners, and use a matrix for browser/API subsets where coverage warrants the extra runtime. I'd first measure the slowest tests and stabilize test data before adding parallelism. Credentials for future authenticated environments should be stored as GitHub Actions secrets and exposed only to the job/step that needs them; non-sensitive URLs belong in variables. Traces, screenshots, and reports should be retained on failure, while retries remain diagnostic rather than hiding recurring failures.

## AI assistant and MCP usage

- **Playwright MCP:** used against the reference site to inspect the live Select2 fields, calendar, result-date element, form validation, and no-results flow before fixing selectors and asserting observed behavior.
- **GitHub MCP Server:** used to search GitHub for SWAPI-related repositories as a cross-check for available implementation references. The results were not a first-party API contract, so they were not treated as an oracle; API assertions are based on responses observed from `swapi.tech` itself.
- **Where I did not delegate to AI:** I did not accept a generated expectation for “no results” or an API error status without exercising the real service. I checked the route, date, status, and response shape before encoding those assertions, because the test oracle is a QA decision.
- **Useful MCP not used here:** a Jira MCP would be useful in day-to-day QA to open or update a defect from a failed run, linking the Playwright trace, screenshot, environment, and reproducible test name. No Jira MCP or project credentials were available for this challenge.

The assistant helped with exploration and implementation, but the assertions, external-service assumptions, and CI schedule must still be reviewed against the challenge and current behavior before merge.

## Theory questions

1. **Scalability (500 tests):** Keep tests grouped by product capability, not by one giant spec; share typed fixtures and domain helpers, isolate data, and tag suites by runtime/criticality. Add sharding only after measuring runtime and verify parallel safety first.
2. **Flakiness:** Compare traces, screenshots, logs, and environment/network signals across pass/fail runs; identify whether the cause is an unstable locator, race, shared state, or dependency outage. Fix the cause or improve synchronization; use bounded retries to expose and measure intermittency, not to mask it. Skip only with a tracked defect, owner, and revisit date.
3. **POM:** One file, if the button locator is encapsulated in the relevant page object and tests call its action instead of carrying their own selector. The selector changes once; tests should change only if behavior or the public page-object API changes.
4. **Responsible AI use:** Check the requirement and oracle, selector stability, negative cases, isolation, waits, types, and the actual trace/result; run the smallest relevant suite and review the diff. I would not delegate the final decision about whether a business outcome is correct to AI; that needs product context and evidence.
5. **Senior QA responsibility:** Own risk-based coverage and the credibility of the test oracle. For example, decide whether a payment failure blocks release, challenge missing acceptance criteria with stakeholders, and communicate residual risk; an assistant can help gather evidence but cannot own that accountability.
6. **Transient CI network failure:** Preserve traces/logs and report the failed run. Use a small bounded retry for transient diagnosis, then alert the team if it remains failing; distinguish service outage from a product regression and rerun only with a recorded reason. Do not silently discard the scheduled result or turn the test into a skip.
