---
id: general-releases
title: Releases and versioning
summary: Release cadence, semantic versioning, and the tags each branch type may carry
status: active
applies_to: [any]
tags: [releases, semver, tagging]
related: [general-git, process-release-runbook, process-code-review]
order: 100
enforceable: true
---

This document covers what versions mean and how they are tagged. The step by step
of actually running a release is the
[release runbook](../process/release-runbook.md).

## Cadence

* Scheduled releases are issued **on Wednesdays**, approximately every three
  weeks (refer to the release calendar for specific dates).
* **Version semantics:**
  * A scheduled release is typically a **minor** version bump.
  * An out-of-cycle release or hotfix is typically a **patch** version bump.
  * A major initiative update is a **major** release.

## Releases and pre-releases

All production releases for brand plugins should be tagged by the WordPress COE
team. Module releases and brand plugin pre-releases can be tagged by anyone, but
**MUST** be
[marked on GitHub as a pre-release](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository).

Failure to properly name and mark a release as a pre-release can result in the
release being automatically deployed to production.

## Tagging

Release version tags should adhere to [semantic versioning](https://semver.org/)
and only be tagged on the applicable branches:

| Tag | Branch | Examples |
| --- | --- | --- |
| X.Y.Z | `main`, `master`, `trunk` | `1.2.0` |
| X.Y.Z-rc.N | `hotfix/1.2.1` | `1.2.1-rc.1`, `1.2.1-rc.2` |
| X.Y.Z-rc.N | `release/1.2.0` | `1.2.0-rc.1`, `1.2.0-rc.2` |
| X.Y.Z-alpha.N | `develop` | `1.2.2-alpha.1`, `1.2.2-alpha.2` |
| X.Y.Z-beta.N | `develop` | `1.2.2-beta.1`, `1.2.2-beta.2` |

Capital letters represent the numbers that are changeable. Lowercase letters
represent the numbers that are fixed.

**X** = major version number<br/>
**Y** = minor version number<br/>
**Z** = patch version number<br/>
**N** = release candidate, alpha, or beta number

### Notes on versioning

* An alpha release is open to adding new features
* A beta release is open to adding bugfixes
* A release candidate is a stable release that is not ready for production
