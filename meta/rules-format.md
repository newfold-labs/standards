---
id: meta-rules-format
title: Rule definitions
summary: The shape of the machine-readable rules that connect a standard to a check
status: draft
applies_to: [any]
tags: [meta, rules, enforcement, machine-readable]
related: [meta-frontmatter-schema, meta-versioning]
order: 50
enforceable: false
---

`rules/` holds machine-readable definitions linking a standard to the thing that
checks it. A document says it is `enforceable`; a rule says how.

The directory is deliberately empty of real rules for now. Populating it, and
building the lint configs that consume it, is separate work. This document fixes
the shape so that work has something to write against.

## Why rules/ is excluded from the site

`rules/` is listed in `exclude` in `_config.yml`. A YAML file that opens with
`---` looks exactly like a Jekyll page with front matter and nothing else, so
Jekyll would parse the rule body as metadata and publish an empty page. Excluding
the directory avoids that entirely.

The consequence worth knowing: rules are not browsable on the site. They are
consumed by tooling, and the standard they enforce is the readable artifact.

## Shape

```yaml
id: wp-security-nonce-verification
standard: wp-security
title: REST and Ajax callbacks verify a nonce
severity: error
engine: phpcs
config:
  sniff: Newfold.Security.NonceVerification
applies_to: [plugin, theme, module]
introduced_in: 1.0.0
```

| Field | Notes |
| --- | --- |
| `id` | Unique rule id. What a failing check reports. |
| `standard` | The `id` of the document this enforces. Must exist. |
| `title` | What the rule checks, phrased as the passing condition. |
| `severity` | `error` or `warning`. Warnings do not fail a build. |
| `engine` | `phpcs`, `eslint`, `structure`, and so on. |
| `config` | Engine-specific payload. |
| `applies_to` | Same vocabulary as document front matter. |
| `introduced_in` | The repository version that added the rule, for baselining. |

The reverse link lives on the document: once a rule exists, set `enforced_by` in
the standard's front matter to the rule's `id`.

## Adding a rule

A new rule against an existing standard is a **major** version bump: a repository
that passed before can fail now. See [versioning](versioning.md).

A rule may only reference a standard whose `enforceable` is `true`. Writing a
rule against a `process/` document means either the rule is wrong, or the
document was filed in the wrong tier.
