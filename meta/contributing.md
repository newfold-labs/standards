---
id: meta-contributing
title: Contributing and the RFC process
summary: How to fix a typo, propose a new standard, and resolve disagreement without stalling
status: active
applies_to: [any]
tags: [meta, governance, rfc, contribution, process]
related: [meta-frontmatter-schema, meta-lifecycle, meta-versioning]
order: 20
enforceable: false
---

Two paths in. Which one you need depends on whether anyone could reasonably
disagree with you.

## Path 1: pull request

For anything uncontroversial:

* Typos, broken links, formatting
* Clarifying wording without changing what the standard requires
* Adding an example to an existing standard
* Filling in `enforced_by` once a rule ships

Open a PR. One approving review merges it. The site build validates front matter
and internal links before anything publishes.

## Path 2: RFC

For anything where a reasonable engineer might object:

* Adding a new standard
* Changing what an existing standard requires
* Deprecating or superseding a standard
* Changing the taxonomy, the schema, or this process

Open an issue using the RFC template, then open the PR that implements it and
link the two.

### What an RFC contains

* **What changes**, stated as the rule, not as a discussion.
* **Why**, including what goes wrong today. A standard without a reason behind it
  is a preference.
* **Who it binds**: the `applies_to` set, and roughly how many repositories that
  is.
* **Migration cost**: what existing code violates this, and whether it is worth
  fixing or baselining.
* **Enforceability**: could a check decide this? If yes, sketch the check. If no,
  say so plainly and set `enforceable: false`.

### Comment window

**Five working days** from the moment the RFC is opened. Long enough that people
in every timezone get a working week's chance to see it; short enough that
proposals do not rot.

Silence is consent. If nobody objects inside the window, the RFC is accepted and
the implementing PR can merge with one approving review. Do not wait for
enthusiasm; waiting for unanimous approval is how standards repositories die.

An objection restarts nothing. It just has to be resolved before merge.

### Tie-breaker

If the comment window closes with an unresolved objection, the **WordPress COE
team** decides, and records the reasoning in the RFC thread. Their decision
stands until a new RFC changes it.

This is deliberately a named tie-breaker rather than a vote. A vote on a
technical standard rewards whoever mobilises the most colleagues, and a
standards repository with no way to close an argument accumulates open questions
instead of standards.

## Writing a good standard

* **Lead with the rule.** The reader wants to know what to do. Explain afterwards.
* **Give the reason.** "Rules should have reasons and standards should have
  strategy that drives them" is itself one of our standards.
* **Say what happens if you break it.** A standard whose consequence is nothing
  is a suggestion, and should be filed as one (`enforceable: false`, or a
  recommendation).
* **Prefer an example to a paragraph.** Show the wrong version and the right
  version.
* **Be honest about enforceability.** Marking something `enforceable: true` to
  make it feel weightier just creates a rule nobody can write.

## Before you open the PR

```bash
npm ci
npm run validate
```

That runs the same front matter and link checks CI runs. To preview the site:

```bash
bundle install
bundle exec jekyll serve
```

## Where things go

Put the document in the tier matching how wide it reaches, not the tier that
feels most important:

* Holds no matter what you are building, `general/`
* Binds a technology, `platform/<technology>/`
* Binds a kind of thing we ship, `artifacts/<type>/`
* Needs a human rather than a check, `process/`

If a document would be half standard and half runbook, split it. The predecessor
repository mixed the two and the result was a repository where a quarter of the
content could not be enforced, checked or even meaningfully agreed with.
