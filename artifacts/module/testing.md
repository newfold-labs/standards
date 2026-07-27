---
id: module-testing
title: Module testing
summary: Cypress conventions that let a module's tests run from any brand plugin
status: active
applies_to: [module]
tags: [module, testing, cypress, e2e]
related: [general-testing, module-development, plugin-structure]
order: 30
enforceable: true
---

Each module should include end-to-end Cypress tests. The tests should be located
in the directory `tests/cypress/integration/`. Brand plugins will load tests for
each module in that plugin via the Cypress configuration and can test module
functionality in PRs and when publishing releases.

## Write tests that any brand can run

Tests should reference Cypress environment variables for things like paths which
expect the brand. For instance,
`'/wp-admin/admin.php?page=bluehost#/settings'` would become
`'/wp-admin/admin.php?page=' + Cypress.env('pluginId') + '#/settings'`, making it
implementable in any brand plugin.

If additional environment variables are needed, they can be added to the
`cypress.config.js` file in the plugins for now. If these need to be located
within the module, we can work out a way to load them dynamically as well.

For more examples, please refer to the CTB or Staging modules, both of which have
been updated to include tests and even demonstrate how to use fixtures.

## Why tests live in the module

This marks a departure from the previous practice where all tests were located in
the plugin. The reason for this change is to relocate the tests into the module,
bringing the code closer to the corresponding code being tested. This also helps
eliminate duplication of test files, since each test was duplicated in every
brand plugin. When a test needed to be modified in a module, it required updating
the test in each plugin. This adjustment allows the tests to be situated nearer
to the code they are intended to assess and reduces the duplication of test
files.

Furthermore, this change brings us closer to the long-term goal of having
workflows within the module to run tests before tagging a release. For the time
being, it's important to ensure that tests pass locally before tagging a release,
so we avoid a series of module releases solely to achieve passing tests in the
plugin.

General testing expectations, including what makes a good assertion, are in
[Testing](../../general/testing.md).
