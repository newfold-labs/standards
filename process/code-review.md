---
id: process-code-review
title: Code review and release restrictions
summary: Who reviews what, who is allowed to release, and the bar a PR must clear to merge
status: active
applies_to: [any]
tags: [code-review, governance, releases, pull-requests]
related: [general-git, general-releases, process-architectural-review, process-release-runbook]
order: 10
enforceable: false
---

* All teams will handle code reviews and releases internally for any repositories
  they are responsible for.
* All teams can request a code review from the WordPress COE team at any time.
* All teams are expected to request an
  [architectural review](architectural-review.md) from the WordPress COE team in
  the early stages of any new development.
* All code merged into the `develop` branch of any repository must be done as a
  pull request which is to be reviewed by at least one other member from the same
  team.
* All releases on the `main` branch for **brand plugins** must be handled by the
  WordPress COE team.
* All releases on the `main` branch for **modules** must be handled by the team
  that owns the module.
* All **pre-releases** on the `develop`, `release/*`, or `hotfix/*` branches can
  be done by anyone on any repository as long as the proper conventions are
  followed.
* Tests should be written for all new code, or updated for existing code, by the
  team developing the functionality or making the change.

## Merge bar

No pull requests are to be merged until it has:

* At least one code review
* All tests pass
* Linting passes
* Tests are written for any new features or code changes

Tagging conventions and what each version number means are covered in
[Releases and versioning](../general/releases.md).
