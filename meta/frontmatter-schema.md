---
id: meta-frontmatter-schema
title: Front matter schema
summary: Every field a standards document carries, what it means, and what CI checks
status: active
applies_to: [any]
tags: [meta, schema, metadata, frontmatter]
related: [meta-lifecycle, meta-contributing, meta-rules-format]
order: 10
enforceable: true
enforced_by: schema/frontmatter.schema.json
---

Every markdown document under `general/`, `platform/`, `artifacts/`, `process/`
and `meta/` opens with a YAML front matter block. The nav, the index and
`llms.txt` are all generated from it, and a repository check cites the `id` of
the standard it failed.

The machine-readable definition is
[`schema/frontmatter.schema.json`](https://newfold-labs.github.io/standards/schema/frontmatter.schema.json),
published alongside this site so other repositories can fetch it. This page is
the prose version of the same thing; if they disagree, the JSON Schema wins.

## Example

```yaml
---
id: wp-security
title: WordPress security
summary: Authentication, nonces, escaping, sanitization and safe database access
status: active
applies_to: [plugin, theme, module]
tags: [wordpress, security, nonces, escaping]
related: [wp-php, wp-performance]
order: 40
enforceable: true
enforced_by: wp-security-nonce-verification
---
```

## Fields

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `id` | yes | string | Stable unique identifier, lowercase kebab-case. |
| `title` | yes | string | Shown in nav, index and as the page heading. |
| `summary` | yes | string | One sentence, no trailing period. |
| `status` | yes | enum | `draft`, `active`, `deprecated` or `superseded`. |
| `applies_to` | yes | array | One or more of `any`, `plugin`, `theme`, `module`, `worker`, `service`. |
| `enforceable` | yes | boolean | Whether a machine could plausibly check this. |
| `tags` | no | array | Lowercase kebab-case topic tags, for retrieval. |
| `related` | no | array | Ids of related documents. Validated to exist. |
| `order` | no by schema, yes in practice | integer | Sort position within the section. CI fails without one. |
| `enforced_by` | no | string | The `id` of the rule in `rules/`, once one exists. |
| `superseded_by` | conditional | string | Required when `status` is `superseded`. |

`section`, `group` and `layout` also appear on every rendered page, but they are
injected by `_config.yml` defaults from the document's directory. Setting them in
a document is rejected by validation, because then the file and the config can
disagree about where a document belongs.

### `id`

The contract. A failed check, a scorecard entry and an AI answer all cite the id
of the standard behind them, so **an id never changes once published**. Renaming
a standard means marking the old one `superseded` and pointing `superseded_by` at
the new one.

Ids are globally unique across the repository, not just within a section. CI
fails on a collision.

### `summary`

Carries the whole weight of the generated index, the nav tooltip and the
`llms.txt` entry. Write it as a sentence fragment describing what the document
governs, not what kind of document it is. "Authentication, nonces, escaping,
sanitization and safe database access" beats "This document covers security".

### `applies_to`

What makes it possible to pull only the standards binding one kind of repository.
`any` means every artifact type we ship and is the common case for `general/` and
`process/` documents.

### `enforceable`

The honest dividing line, and the reason `process/` exists as its own tier. Set
it `true` when a linter, a CI check or a structural inspection could plausibly
decide whether a repository conforms, even if no such check exists yet. Set it
`false` when conformance needs a human, as with philosophy, judgement calls and
anything that ends in "ask your team lead".

`enforced_by` is filled in when a rule actually exists. Until then, an
`enforceable: true` document with no `enforced_by` renders as "yes, no automated
check yet", which is exactly the backlog we want visible. Setting `enforced_by`
on an `enforceable: false` document fails validation.

## Validation

`npm run validate` runs two checks, and CI runs them before the site is built.
Invalid front matter fails the build rather than publishing a broken page.

`validate:frontmatter` checks each document against the JSON Schema, then the
things a per-document schema cannot see:

* ids are unique across the repository
* every `related` id resolves to a real document, and no document lists itself
* `superseded_by` resolves to a real document
* every document sets an `order`, and no two documents in the same section and
  group share one

`validate:links` resolves every relative markdown link, including its `#anchor`,
against the actual heading structure of the target file. The predecessor
repository shipped a link to a file deleted in 2022 and a link to a misspelled
filename; nothing caught either.
