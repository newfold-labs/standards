---
id: meta-lifecycle
title: Standard lifecycle
summary: What draft, active, deprecated and superseded mean, and why nothing is ever deleted
status: active
applies_to: [any]
tags: [meta, lifecycle, governance, deprecation]
related: [meta-frontmatter-schema, meta-contributing, meta-versioning]
order: 30
enforceable: false
---

A standard moves through states rather than appearing and vanishing. The `status`
field records where it is.

| Status | Meaning | In nav? | Binds new work? |
| --- | --- | --- | --- |
| `draft` | Proposed or partially written. Under discussion. | yes, banner shown | no |
| `active` | Settled. This is the standard. | yes | yes |
| `deprecated` | No longer the standard, with no direct replacement. | no | no |
| `superseded` | Replaced by another document, named in `superseded_by`. | no | no, follow the replacement |

## Nothing is deleted

Deprecated and superseded documents stay in the repository and stay reachable at
their original URL. They drop out of the nav, out of the generated index and out
of retrieval defaults, but a link written two years ago still resolves and a
reader landing on one sees a banner telling them where to go instead.

This matters because ids are cited. A check that failed last quarter, a scorecard
entry, an AI answer or a code comment may all reference a standard by id. Deleting
the document turns every one of those citations into a dead end.

## Moving a standard through the states

**Draft to active.** Through the [contribution process](contributing.md). A draft
that nobody has argued about is not the same as an agreed standard, so drafts do
not bind work and no check should score against them.

**Active to deprecated.** When we stop expecting the practice but have nothing to
put in its place. Set `status: deprecated` and add a short note at the top of the
body saying why and when. If a rule enforced it, that rule must be retired in the
same change or the next ruleset release, otherwise CI keeps failing repositories
for a standard we no longer hold.

**Active to superseded.** When another document takes over. Set
`status: superseded` and `superseded_by: <new-id>`. The replacement must exist;
CI fails otherwise. Prefer this over deprecation whenever there is a successor,
because the reader gets sent somewhere useful.

**Renaming.** An id never changes. Renaming a standard is a supersede: create the
new document with the new id, mark the old one superseded, and point at it.

## Effect on enforcement

Deprecating an `enforceable` standard retires the check that enforced it, which
is a change to the enforcing package rather than to this repository. Retiring a
check cannot fail a repository that passed before, so it is a minor release; the
rule is removed from `rules/` in the same change. See
[versioning and rollout](versioning.md).
