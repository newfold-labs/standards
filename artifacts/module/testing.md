---
id: module-testing
title: Module testing
summary: Playwright conventions that let a module's tests run from any brand plugin
status: active
applies_to: [module]
tags: [module, testing, playwright, e2e]
related: [general-testing, module-development, plugin-structure]
order: 30
enforceable: true
---

Every module must include end-to-end Playwright tests. Tests live in
`tests/playwright/` inside the module. Brand plugins (for example
[wp-plugin-bluehost](https://github.com/newfold-labs/wp-plugin-bluehost),
[wp-plugin-hostgator](https://github.com/newfold-labs/wp-plugin-hostgator)) discover
and run module tests through their Playwright configuration, so module functionality
is verified in PRs and before releases.

## E2E tests are required

End-to-end tests are a **requirement for every module**. A module without Playwright
tests is incomplete.

When you add or change code that affects the plugin app or admin interface, include
accompanying e2e tests in the same change. This applies to:

- New pages, routes, or navigation
- UI components users interact with (buttons, toggles, modals, forms)
- User-visible behavior driven by capabilities or settings
- REST API flows that surface in the plugin UI

PHPUnit unit tests cover PHP logic; Playwright tests cover what users and integrators
actually see in WordPress admin.

Before tagging a module release, run the brand plugin's e2e suite locally and confirm
your module's specs pass. This avoids a chain of module releases solely to fix
failing plugin CI.

## Test layout

| Path | Purpose |
|------|---------|
| `tests/playwright/specs/` | Spec files (`*.spec.js` or `*.spec.mjs`) |
| `tests/playwright/fixtures/` | JSON fixtures for API mocks and test data |
| `tests/playwright/helpers/` | Module-specific helpers (re-exports plugin helpers + module utilities) |
| `tests/playwright/project-overrides.json` | Optional per-module Playwright project overrides (see `wp-module-adam` for a timeout example) |

Good reference modules:

- **wp-module-global-ctb** — marketplace intercepts, CTB modal flows, fixtures
- **wp-module-staging** — API mocking, selectors, multi-environment staging UI
- **wp-module-help-center** — brand-specific expectations, capability setup, a11y checks

## How brand plugins run module tests

Each brand plugin owns a root `playwright.config.mjs` and a `tests/playwright/helpers/`
directory. The config:

1. Sets environment variables such as `PLUGIN_DIR`, `PLUGIN_ID`, and WordPress
   credentials.
2. Starts `wp-env` locally (or relies on CI to provide the environment).
3. Discovers module test directories via
   `.github/scripts/generate-playwright-projects.mjs`, which scans `composer.local.json`
   path repositories and `vendor/newfold-labs/wp-module-*` for
   `tests/playwright/specs/`.
4. Registers each discovered module as a separate Playwright project so specs run in
   isolation.

From a brand plugin root:

```bash
npm run test:e2e          # alias for test:playwright
npm run test:playwright   # npx playwright test
npm run test:playwright:update-projects  # regenerate playwright-projects.json
```

## CI workflows

Playwright is wired into GitHub Actions at both the brand plugin and module level.
These workflows use `wp-env` for the WordPress environment and `npx playwright test`
for the test runner.

### Brand plugin workflows

Each brand plugin (for example `wp-plugin-bluehost`, `wp-plugin-hostgator`) defines
workflows under `.github/workflows/`:

| Workflow | File | When it runs | What it does |
|----------|------|--------------|--------------|
| **E2E / Playwright Tests** | `playwright-tests.yml` | Push to `main` / `develop`, PRs, manual | Builds a distribution copy of the plugin, starts `wp-env` with default PHP and WordPress versions from `.wp-env.json`, and runs the **full** Playwright suite — plugin specs plus every discovered module project. |
| **Playwright Test Matrix** | `playwright-matrix.yml` | PRs, manual | Runs the full Playwright suite across the **supported PHP and WordPress version matrix** (PHP 7.4–8.4; WordPress 6.8, 6.9, 7.0). Each combination is a separate job; a summary job consolidates results. Dependabot PRs that do not touch `newfold-labs` packages may skip the matrix. |
| **Playwright Tests in WordPress Beta** | `playwright-tests-beta.yml` | Weekly schedule, manual | Runs the full suite against the current WordPress beta release to catch upstream compatibility issues early. |

Plugin workflows build the plugin the same way a release would (Composer production
install, `npm run build`, rsync via `.distinclude` / `.distignore`), load it into
`wp-env` via `.wp-env.override.json`, then discover and run module projects through
`generate-playwright-projects.mjs`.

### Module workflows

Modules with Playwright tests include
`.github/workflows/brand-plugin-test-playwright.yml`. On module PRs, this calls the
shared reusable workflow
[`module-plugin-test-playwright.yml`](https://github.com/newfold-labs/workflows/blob/main/.github/workflows/module-plugin-test-playwright.yml)
in the `newfold-labs/workflows` repository.

The module workflow:

1. Checks out the brand plugin (typically `newfold-labs/wp-plugin-bluehost` on
   `main`; some modules also test against `develop`).
2. Reinstalls the **module from the PR branch** into `vendor/newfold-labs/` via
   `composer reinstall`, so CI tests your changes before they are tagged.
3. Builds the module (if it has a `package.json` build step) and the plugin.
4. Starts `wp-env` with the built plugin and runs Playwright in two stages:
   - **Module tests first** — `npm run test:playwright -- --project="<module-repo>"`
     (for example `newfold-labs/wp-module-staging`) so failures in your specs surface
     quickly.
   - **Full suite** — `npm run test:playwright` runs plugin specs and **all other
     module projects** to catch regressions where your change breaks another module's
     tests or shared plugin behavior.

The reusable workflow accepts an `only-module-tests` input to skip the full-suite
stage when you only need isolated module coverage. By default, both stages run so
module changes are validated in the same combined environment a brand plugin PR uses.

Some modules test against multiple plugin branches (for example `main` and
`develop`) via separate jobs in their `brand-plugin-test-playwright.yml`.

## Write tests any brand can run

Do not hard-code a brand slug in URLs or expectations when the value is
environment-specific. Use environment variables set by the plugin's Playwright config:

```javascript
const pluginId = process.env.PLUGIN_ID || 'bluehost';

await page.goto(`/wp-admin/admin.php?page=${pluginId}#/settings`);
```

`PLUGIN_ID` is set in each brand plugin's `playwright.config.mjs` (for example
`bluehost`, `hostgator`). Module helpers typically read it once and export a
`pluginId` constant.

For brand-specific content (help text, account names, domains), define expectations
per `PLUGIN_ID` in the module helper or spec — see
`wp-module-help-center` for an example.

If additional environment variables are needed, add them to the brand plugin's
`playwright.config.mjs`. Module-specific overrides can also live in
`tests/playwright/project-overrides.json` at the module root.

## Plugin-based helpers

Brand plugins provide shared helpers at `tests/playwright/helpers/`. Modules import
these at runtime via `PLUGIN_DIR` (set by Playwright config) rather than copying
helper code into each module.

Plugin helper modules (in each brand plugin):

| Helper | File | Use for |
|--------|------|---------|
| `auth` | `auth.mjs` | WordPress login, admin navigation |
| `wordpress` | `wordpress.mjs` | WP-CLI, options, permalinks, REST |
| `newfold` | `newfold.mjs` | Capabilities, coming soon, WooCommerce, plugin navigation |
| `a11y` | `a11y.mjs` | Accessibility checks (`@axe-core/playwright`) |
| `utils` | `utils.mjs` | Logging, scrolling, notifications |

Central export: `tests/playwright/helpers/index.mjs`.

### Importing plugin helpers from a module

Module helpers follow a consistent pattern: resolve the plugin root from
`process.env.PLUGIN_DIR`, dynamically import the plugin's `index.mjs`, re-export
plugin helpers, and add module-specific utilities:

```javascript
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const pluginDir = process.env.PLUGIN_DIR || process.cwd();
const helpersUrl = pathToFileURL(
  join(pluginDir, 'tests/playwright/helpers/index.mjs')
).href;
const { auth, wordpress, newfold, a11y, utils } = await import(helpersUrl);

export const pluginId = process.env.PLUGIN_ID || 'bluehost';
export { auth, wordpress, newfold, a11y, utils };

// Module-specific helpers below...
```

Specs import from the module's `../helpers` (or `../helpers/index.mjs`) so they get
both plugin and module helpers in one place:

```javascript
import { test, expect } from '@playwright/test';
import { auth, newfold, pluginId } from '../helpers/index.mjs';

test.describe('My Module', () => {
  test.beforeEach(async ({ page }) => {
    await auth.loginToWordPress(page);
    await newfold.setCapability({ canAccessMyFeature: true });
    await page.goto(`/wp-admin/admin.php?page=${pluginId}#/my-route`);
  });

  test('shows the feature', async ({ page }) => {
    await expect(page.locator('.my-module-widget')).toBeVisible();
  });
});
```

### Fixtures and API mocking

Use `tests/playwright/fixtures/` for JSON response bodies. Intercept REST routes with
`page.route()` in module helpers — see `wp-module-staging` for staging API mocks and
`wp-module-global-ctb` for marketplace and CTB intercepts.

## Why tests live in the module

Tests used to live entirely in each brand plugin, which duplicated the same specs
across Bluehost, HostGator, and other brands. When a module test needed a fix, every
plugin copy had to be updated.

Moving tests into the module keeps them next to the code they verify and lets any
brand plugin run them through a single shared helper layer. The long-term goal is
module-level CI workflows that run e2e tests before tagging a release.

## Legacy: Cypress tests

Cypress is **legacy and no longer supported** for module or plugin e2e testing. Brand
plugins no longer load or run Cypress specs in CI.

If a module still has Cypress tests under `tests/cypress/` (typically
`tests/cypress/integration/`), they must be migrated to Playwright under
`tests/playwright/`. Do not add new Cypress tests or extend existing ones.

When migrating:

- Move specs to `tests/playwright/specs/` with a `*.spec.js` or `*.spec.mjs` name.
- Replace `Cypress.env('pluginId')` with `process.env.PLUGIN_ID`.
- Replace Cypress commands and intercepts with Playwright locators, `expect`, and
  `page.route()`.
- Import shared helpers from the brand plugin via the module helper pattern above
  instead of Cypress-specific utilities.

Remove Cypress config, dependencies, and the old `tests/cypress/` directory once the
Playwright specs cover the same behavior.

## Learning resources

- [Playwright documentation](https://playwright.dev/docs/intro) — getting started,
  locators, assertions, and debugging
- [Playwright test configuration](https://playwright.dev/docs/test-configuration) —
  projects, timeouts, reporters
- [Playwright API mocking](https://playwright.dev/docs/mock) — `page.route()` for
  REST intercepts
- [@wordpress/e2e-test-utils-playwright](https://github.com/WordPress/gutenberg/tree/trunk/packages/e2e-test-utils-playwright) —
  WordPress admin utilities used by plugin `auth.mjs`

General testing expectations — including what makes a good assertion — are in
[Testing](../../general/testing.md).
