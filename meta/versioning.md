---
id: meta-versioning
title: Versioning this repository
summary: What a major, minor and patch release of the standards themselves mean
status: active
applies_to: [any]
tags: [meta, semver, versioning, governance]
related: [meta-lifecycle, meta-contributing, general-releases]
order: 40
enforceable: false
---

This repository is versioned with [semantic versioning](https://semver.org/), the
same as everything else we ship. That is not ceremony: derived lint configs are
consumed at pinned versions, so "the standards changed" has to be something a
consuming repository can see coming.

## What each bump means

**Major.** A repository that passed before could fail now.

* A new `enforceable: true` standard
* An existing standard made stricter
* A standard deprecated or superseded, since a rule enforcing it must retire
* A change to the front matter schema that invalidates existing documents
* A change to the taxonomy that moves documents between tiers

**Minor.** New material that binds nothing retroactively.

* A new `enforceable: false` standard
* A new document in `process/` or `meta/`
* A standard relaxed, so anything passing before still passes
* New optional front matter fields

**Patch.** No change to what any standard requires.

* Typos, formatting, dead link fixes
* Clarified wording with the same meaning
* Site build and tooling changes
* Filling in `enforced_by` for a rule that already shipped

## Why majors matter downstream

Ruleset releases are gated on major versions here. A repository pins a version of
the derived PHPCS ruleset or ESLint config, so a standards change rolls out as a
version bump the repository chooses to take, rather than as a CI failure that
appears overnight in twenty repositories at once.

That is the whole reason this repository is versioned at all. If a standards
change could silently break everyone's CI, nobody would let us change the
standards.

## Release process

Tag on `main` after the implementing PR merges. The tag is the release; there is
no build artifact to publish, since the site deploys from `main` on every push.

Because the site always tracks `main`, the published documentation is always
ahead of or equal to the newest tag. The tag exists so consumers of the derived
configs have something to pin, not to describe what the site shows.
