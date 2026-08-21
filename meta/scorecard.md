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
| L3 Clean | Nothing outstanding at error severity for a documented standard |
| L4 Current | Pinned to the current release, owned, and readable by AI tooling |

The rungs and the signals under them live in
[`rules/levels.yml`](https://github.com/newfold-labs/standards/blob/main/rules/levels.yml),
which is the one definition both the documentation and the scorer read.

## Everything found is shown

The board reports every finding the standard produces, not only the ones some
rule has named. The Newfold standard runs about three hundred sniffs; four are
ours and the rest are inherited from WordPress Coding Standards and
PHPCompatibility. Showing only what a rule had named meant showing two things
out of three hundred.

So a rule is **enrichment, not a gate**. It attaches a standard id to a sniff or
a family of them, and a finding with a rule gains a citation you can follow. A
finding without one is still shown; it just has nothing to cite yet, and the gap
between the two counts is the rules backlog rather than a gap in the scan.

A sniff added in a future WPCS release therefore appears on the board with no
change here, and writing a rule adds a citation without ever being what makes a
violation visible.

## A verdict follows the evidence

- **pass** / **fail** — something looked at the code and this is what it said.
- **ineligible** — nothing looked, and this repository could not have looked
  itself: the package is absent, or pinned below the release that introduced
  the rule.
- **unknown** — nothing looked, and there is no reason it could not have.

Note what `ineligible` does not mean. Once the scan has read the code, a
violation is a violation whether or not the repository's own pinned version
could have caught it. The pin is reported in its own column. Withholding a real
finding because their CI would have missed it hides the problem rather than the
version.

Unknown is likewise not false, and a repository is never marked non-compliant
because we failed to reach it.

## Two sources, kept apart

A repository's own report and our central scan are different claims, and the
board says which one a row is showing.

- **reported** — the repository's CI ran the checks and published what it found.
  This is the one that counts: it is the repository adopting the standard.
- **scanned** — we cloned it and ran the checks ourselves. Useful, and true, but
  it is us looking rather than them telling us.

A report always wins over a scan. Being scanned does not earn a level, because
the ladder measures adoption and a central scan is not the repository adopting
anything.

## Severity is reported, not reinterpreted

Our policy is that an error means the code cannot parse and everything else is a
warning. The four Newfold sniffs follow it. The other ~298 carry the severities
WordPress Coding Standards ships, which do not: across the fleet that is 13,991
errors for short array syntax and 7,301 for call spacing, while
`WordPress.Security` findings are warnings.

The board reports what the tools said rather than quietly re-grading it, because
silently overriding severity would hide a real disagreement between our policy
and our ruleset. What it does not do is let that disagreement decide a level:
L3 is gated on findings that cite a documented standard, so a repository is
never held off a rung by a docblock convention nobody agreed to.

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

The sweep prefers to aggregate rather than to lint. A repository that reports its
own findings has already done the work on its own pull requests, and recomputing
that centrally would burn runner time to learn what its CI worked out for free.

It does lint what nobody has reported, because a board that waits for universal
adoption before saying anything says nothing for months. That scan is built to
be cheap enough not to matter and to become redundant on its own.

It reads in three tiers, cheapest first:

1. **Facts, from the API.** Repository metadata and a handful of files —
   `composer.json`, `package.json`, `CODEOWNERS`, `AGENTS.md` — arrive together,
   batched over GraphQL. Nothing is cloned, so a large repository costs what a
   small one does. The whole fleet is a handful of requests.
2. **Reports, from the repositories.** Any repository that runs the shared check
   publishes a `standards-compliance` artifact; the sweep downloads the latest.
3. **A central scan, for everything else.** Every PHP repository is shallow
   cloned and run through the standard: 89 repositories in about 140 seconds, no
   `composer install` anywhere, each checkout deleted as soon as it is scanned so
   disk stays flat. This exists so the board is populated before the fleet has
   adopted anything, and becomes redundant as repositories start reporting.

Findings are capped where they are published, never where they are counted. The
scan produces about 83,000 findings and 25MB, nearly all of it in a few
repositories: the median has 83 and the worst 15,735. Every total on the board is
real; what is trimmed is how many example lines a detail file carries, to 25 per
sniff and 300 per repository.

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

A rule claims one or more sniff prefixes, and the longest prefix wins, so a rule
naming one sniff beats a rule claiming its whole family:

```yaml
config:
  sniffs: [WordPress.Security]     # a family
```

That is what keeps this from becoming a rule file per sniff. One rule can cite a
whole category, and a more precise rule can carve out the part of it that has its
own standard. Writing one changes what a finding cites, never whether it appears.

A new signal means editing `rules/levels.yml` and the scorer that reads it, and
the next sweep rescores every repository against the new model.

To make a repository report, have its CI publish a `standards-compliance`
artifact holding a JSON body with a `findings` array, each finding naming the
`rule` it came from. Until then the repository can still reach L1, and shows as
not reporting rather than as failing.
