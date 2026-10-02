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

## Theoretical Questions

### 1. Scalability: Imagine the suite has grown to 500 tests. What changes would you make or suggest to the structure?

If the suite grew to 500 tests, the first thing I'd do is **group them by product capability**, instead of having giant specs that do everything. I'd use **typed fixtures** and **shared helpers**, isolate data between tests, and **tag** suites by criticality and runtime. I'd only add **sharding** after measuring how long everything takes, not before. I'd also split **UI and API into separate Playwright projects**, each with its own config, and in CI I'd set up a **matrix per project** to run them in parallel. But all of that only after verifying the tests don't share state and can be safely parallelized.

### 2. Flakiness: If a test is intermittent (sometimes passes, sometimes fails) without code changes, how do you diagnose it and what options do you consider before marking it as skip?

When a test is intermittent, the first thing is to **gather evidence**: compare traces, screenshots, logs, and network signals between the passing and failing runs. Then figure out the root cause: is it an unstable locator, a race condition, shared state between tests, or the environment acting up? What I do is **fix the cause or improve the synchronization**. I use **retries** to **see and measure** the flakiness, not to hide it. And I only mark it as `skip` if there's a **tracked bug, an assigned owner, and a date to revisit it**.

### 3. POM: If the site changes the selector for the "Search" button, how many files in the project would you need to modify? Justify.

**One single file**, if the button locator lives inside the Page Object and the tests call its **action** instead of carrying their own selector. The selector changes once, and the tests only change if the **behavior** or the **public POM API** changes.

### 4. AI assistant — Responsible use: If your AI assistant generates a test that passes on the first try, what do you check before merging it? Tell us about a case where you decided NOT to use the assistant even though you could have.

If a test passes on the first try, I check: that it **validates what it's supposed to validate** (the requirement and the oracle), that the selectors are stable, that it covers negative cases, that it's isolated, that there's no `waitForTimeout` or `force: true`, that it's properly typed, and I look at the **actual trace** from the run. I run the smallest relevant suite and review the diff. What I **don't** delegate to AI is deciding whether a business outcome is correct: that needs product context and evidence.

**Concrete case where I did NOT use AI:** in this same challenge, to define the POM selectors I preferred to inspect the real DOM by hand (including the fight with Select2) instead of letting Copilot invent locators from the URL. Because AI tends to give you selectors that **look** right but don't actually exist (like `#PadOrigen`, which was on a hidden input but wasn't the clickable element). In a challenge judged on criteria, I'd rather verify with my own eyes before writing code.

### 5. Role criteria: What is a Senior QA's responsibility that CANNOT be delegated to an AI assistant? Give concrete examples.

A Senior QA owns the **risk** and the **credibility of the oracle**. For example: deciding whether a payment failure blocks a release, challenging missing acceptance criteria with stakeholders, and clearly communicating **residual risk**. AI can help you **gather evidence**, but the **responsibility** can't be delegated.

### 6. CI/CD: If tests fail every Monday at 3 PM because of a transient network issue in the environment, how would you handle it? Retries? Discard the run? Alert the team?

If tests fail every Monday at 3 PM because of a transient network issue, I preserve **traces and logs** and report the failed run. I use a **bounded retry** only to diagnose the transient issue. If it keeps failing, I **alert the team** (via Slack/Teams from the workflow, or by opening an automatic issue). I distinguish between a **service outage** and a **product regression**, and I re-run only if there's a documented reason. I **don't silently discard the scheduled run**, and I don't turn the test into a `skip` without leaving a trace.
