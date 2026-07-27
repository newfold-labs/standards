---
id: general-testing
title: Testing
summary: The kinds of tests we write, who writes them, and what a good assertion looks like
status: active
applies_to: [any]
tags: [testing, phpunit, cypress]
related: [module-testing, process-code-review]
order: 110
enforceable: true
---

## Types of testing

### Unit tests

We utilize PHPUnit for unit testing. Where applicable, unit tests should be
written for all new code, or updated for existing code, by the team developing
the functionality or making the change.

### Component tests

Cypress should be used for component-based testing of React components. Where
applicable, component tests should be written for all new code, or updated for
existing code, by the team developing the functionality or making the change.

### End-to-end tests

Cypress should be used for end-to-end testing of the WordPress environment. Where
applicable, end-to-end tests should be written for all new code, or updated for
existing code, by the team developing the functionality or making the change.

Modules carry their own end-to-end tests. See
[module testing](../artifacts/module/testing.md) for the conventions that make a
module's tests runnable from any brand plugin.

Where possible, new features and bug fixes should include a test to verify the
feature or fix and ensure that the feature or fix remains functional.

## Best practices

When writing end-to-end tests, test functionality not code. For example, "this
page is the color I expect and all text is visible", NOT "this page has the CSS
class I expect".
