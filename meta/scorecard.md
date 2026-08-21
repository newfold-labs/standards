---
id: meta-scorecard
title: The scorecard
summary: How the fleet is measured against these standards, what each level means, and what the board deliberately does not claim
status: active
applies_to: [any]
tags: [meta, compliance, enforcement, scorecard, governance]
related: [meta-rules-format, meta-versioning, meta-lifecycle]
order: 55
enforceable: false
---

The [scorecard]({{ '/scorecard.html' | relative_url }}) says where every
repository these standards bind sits against them. It is generated: a scheduled
sweep reads the org, scores each repository, and the site renders the result.
Nothing on it is maintained by hand.

## What it measures

A repository climbs a ladder. Each rung is cumulative, so a repository sits at
the highest rung whose signals hold **and** whose every lower rung also holds.
Reporting the highest satisfied rung on its own would let a repository with AI
context but no ruleset outrank one that lints cleanly.

| Level | Means |
| --- | --- |
| L0 Not adopted | Nothing here enforces a standard yet |
| L1 Configured | The enforcing package is installed, so the checks can run |
| L2 Reporting | The check runs in the repository's own CI and publishes what it found |
| L3 Clean | Nothing outstanding at error severity |
| L4 Current | Pinned to the current release, owned, and readable by AI tooling |

The rungs and the signals under them live in
[`rules/levels.yml`](https://github.com/newfold-labs/standards/blob/main/rules/levels.yml),
which is the one definition both the documentation and the scorer read.

## A check has three outcomes, not two

This is the thing to understand before reading a row.

- **pass** — the check ran and found nothing.
- **fail** — the check ran and found something.
- **ineligible** — the check could not run. The package is not installed, or the
  repository is pinned below the release that introduced the rule.

A rule records the `package` that enforces it and the `introduced_in` release
that added it, so eligibility is answered from `composer.json` alone. See
[the rule format](rules-format.md) for why the version is the package's rather
than this repository's.

Treating ineligible as a failure would invent violations that the owning team
cannot act on. Treating it as a pass would claim a standard is met that was
never tested. It gets its own state and its own neutral colour, and it is not
counted against anyone.

The same care applies to a signal we could not read at all: unknown is not
false, and a repository is never marked non-compliant because the sweep failed
to reach it.

## Pinned, unpinned, behind

The board separates a repository that pins an old version from one that does not
pin at all. `@stable`, `*` and branch aliases install whatever is newest whenever
`composer update` runs. They admit the current release, so a naive reading scores
them as the most up-to-date repositories in the fleet when they are the ones a
release can break without warning.

Rolling a change out as a version bump rather than an overnight CI failure is
the reason the packages are versioned, so an unpinned constraint is reported as
its own state and does not reach L4.

## How the sweep works, and what it costs

The sweep **never runs a linter**. Findings come from the repositories
themselves, which already lint their own pull requests; recomputing that
centrally would cost hours of runner time a night to learn what their CI worked
out for free. What the sweep does is aggregate.

It reads in two tiers:

1. **Facts, from the API.** Repository metadata and a handful of files —
   `composer.json`, `package.json`, `CODEOWNERS`, `AGENTS.md` — arrive together,
   batched over GraphQL. Nothing is cloned, so a large repository costs what a
   small one does. The whole fleet is a handful of requests.
2. **Findings, from the repositories.** Any repository that runs the shared
   check publishes a `standards-compliance` artifact; the sweep downloads the
   latest one. A repository that publishes nothing is not failing, it is not
   reporting, and the board says so.

A repository whose `pushedAt` has not moved since the last sweep is not read
again. In steady state the sweep only reads what changed. The previous
scorecard is the cache, so there is no side-car state to keep in sync, and
changing a rule or the level model invalidates every stored row on its own
through a fingerprint of the policy.

## Where the data lives

The default branch requires a pull request and has no bypass actors, so the
scheduled sweep cannot push to it, and opening a pull request a night that still
needs a human approval is not automation.

So the sweep publishes to a `scorecard-data` branch, which the rulesets do not
cover, and the site build prefers that branch over the snapshot committed to
`main`. The snapshot on `main` is what makes the board render for a fresh clone
and inside pull requests; it is expected to be older than the branch.

Keeping the data off `main` is worth having on its own. A data commit a night
would bury the repository's real history under machine churn.

## Visibility

**The board is public, in full, including private repositories.** This was
decided deliberately and is recorded here because it is not reversible.

`newfold-labs/standards` is a public repository with a public Pages site, and
55% of the repositories in scope are private. Publishing the board names those
repositories and their findings to anyone who looks, and a public git history
keeps them named even if the decision is revisited.

The alternative considered was a public-safe tier, where private repositories
contribute to the rollups but are never named. It was rejected because a row
nobody can see is a row nobody fixes, and more than half the fleet would have
been invisible to exactly the accountability the board exists to create.

Two consequences to keep in mind when adding to the sweep:

- **A new signal is a new disclosure.** Anything read from a private repository
  and rendered on the board becomes public. File paths in findings already are.
- Nothing that reads a secret, a dependency inventory, or the contents of source
  files belongs in a signal without deciding this again.

## Adding to it

A new rule appears on the board automatically once it exists in `rules/` and
names the release that ships its check; no template change is needed. A new
signal means editing `rules/levels.yml` and the scorer that reads it, and the
next sweep rescores every repository against the new model.

To make a repository report, have its CI publish a `standards-compliance`
artifact holding a JSON body with a `findings` array, each finding naming the
`rule` it came from. Until then the repository can still reach L1, and shows as
not reporting rather than as failing.
