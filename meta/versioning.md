---
id: meta-versioning
title: Versioning and rollout
summary: How a change to a standard reaches the repositories the standard applies to
status: active
applies_to: [any]
tags: [meta, semver, versioning, governance, rollout]
related: [meta-lifecycle, meta-contributing, meta-rules-format, general-releases]
order: 40
enforceable: false
---

This repository is not versioned. It publishes to GitHub Pages from `main`, so
what the site shows is what the standards say, and there is no tag to pin.

What is versioned is the tooling that enforces them: the
[Newfold PHPCS standard](https://github.com/newfold-labs/wp-php-standards), the
shared ESLint config, and anything else a repository installs. Those are what a
repository pins, so those are where a change becomes something a team can see
coming.

## Why the split

A standard is a description. A check is a thing that runs in your CI at eight in
the morning and decides whether you ship.

Changing the description should be cheap: correct an example, tighten wording,
add a standard nobody checks yet. None of that can break a build, so none of it
needs a release.

Changing the check is different, and that is where semver earns its keep. A
repository pins the config, so a stricter check arrives as a version bump the
team chooses to take, rather than as a red build that appeared overnight in
twenty repositories at once.

That is the whole arrangement. If a standards change could silently break
everyone's CI, nobody would let us change the standards.

## What each bump of an enforcing package means

**Major.** Not backwards compatible. Code that passed before can fail now.

* A new check that reports at `error`
* An existing check promoted from `warning` to `error`
* A check corrected so that it reports cases it used to miss
* A stricter default in the shipped ruleset

**Minor.** New capability that cannot fail anything that passed before.

* A new check that reports at `warning`
* A check relaxed, or a false positive removed
* A dependency range widened

**Patch.** No change to which code passes.

* A reworded message
* Documentation and internal tooling

A check that is more correct than it was still counts as a major. The check
improved, but a repository that was green yesterday can be red today, and the
version number exists to warn about exactly that.

## How a change reaches a repository

1. The standard changes here, and the site shows it immediately.
2. If the standard is enforceable and a check exists or changes, that lands in
   the enforcing package and is released under the rules above.
3. The rule in `rules/` records which package and which release, so a repository
   pinned below it reads as not yet upgraded rather than as failing. See
   [rule definitions](rules-format.md).
4. The repository takes the bump when it chooses to, and compliance reporting
   shows who has and who has not.

Steps 1 and 2 are deliberately separate. A standard can be written before anyone
can check it, and that gap is visible rather than hidden: the document says it is
`enforceable`, and the absence of a rule says no check exists yet.

## Severity is the other half of this

Most new checks should ship as warnings, which makes them a minor rather than a
major and lets them roll out without a coordinated upgrade. `error` is reserved
for code that does not parse. The reasoning lives in
[rule definitions](rules-format.md#severity).
