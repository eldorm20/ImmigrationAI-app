# QA: Running automated Playwright checks

This document explains how to run the Playwright QA tests added to the repository.

Prerequisites
- Node 18+ and npm installed
- From repo root run `npm ci` to install dependencies
- (Optional) If you want to execute UI tests with browsers: `npx playwright install --with-deps`

Running tests locally (PowerShell)

Run the full suite:
```powershell
npx playwright test
```

Run a single spec:
```powershell
npx playwright test tests/e2e/login-ui.spec.ts
```


CI notes:
- The repository includes a GitHub Actions workflow at `.github/workflows/playwright.yml` that runs on `push`, `pull_request`, and can be triggered manually via `workflow_dispatch`.
- The workflow saves reports as artifacts (`playwright-report/` and `test-results/results.xml`) so you can download and inspect the HTML report and JUnit XML after the run.

To trigger CI manually from the GitHub UI: open the Actions tab → select "Playwright E2E Tests" → Run workflow → choose branch and run.

CI
The repository contains a GitHub Actions workflow at `.github/workflows/playwright.yml` that runs the tests on `push`/`pull_request` to `main`.

Notes & Safety
- Tests are designed to be non-destructive: they primarily navigate, validate UI, and attempt authentication. Contact form submission is disabled by default (requires `ALLOW_SUBMIT=1`).
- Avoid running destructive workflows against production accounts unless you have explicit permission and a recovery plan.
