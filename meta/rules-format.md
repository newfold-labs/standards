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

A standard gets a rule when a check for it exists, so most `enforceable: true`
documents still have none. That gap is the backlog, and it is meant to be
visible.

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
severity: warning
engine: phpcs
config:
  sniff: Newfold.Security.NonceVerification
applies_to: [plugin, theme, module]
package: newfold-labs/wp-php-standards
introduced_in: 2.1.0
```

| Field | Notes |
| --- | --- |
| `id` | Unique rule id. What a failing check reports. |
| `standard` | The `id` of the document this enforces. Must exist. |
| `title` | What the rule checks, phrased as the passing condition. |
| `severity` | `warning`, unless the code cannot parse. See below. |
| `engine` | `phpcs`, `eslint`, `structure`, and so on. |
| `config` | Engine-specific payload. |
| `applies_to` | Same vocabulary as document front matter. |
| `package` | The package whose release ships the check. |
| `introduced_in` | The release of `package` that first shipped it. |

The reverse link lives on the document: once a rule exists, set `enforced_by` in
the standard's front matter to the rule's `id`.

## Severity

`error` is for code that does not parse. A union type on a codebase targeting
PHP 7 takes the whole file down, so nothing else about that file matters and
there is no argument to have.

Everything else is a `warning`. A hook named against the convention still fires;
a namespace against the convention still loads. Reporting them stops a repository
from drifting further without stopping it from shipping, and some of them cannot
be fixed at all: a module that re-fires a WordPress hook has to fire it under the
name core gave it.

This is not leniency. A convention we have only just started checking would
otherwise turn every repository red on the day it lands, and a board that is red
everywhere tells nobody anything. A rule can be promoted later, in the ruleset
that consumes it, once the fleet has caught up.

## Why the version is the package's, not this repository's

`package` and `introduced_in` name the release that ships the check, not a
version of this repository. This repository is not versioned or tagged: it
publishes to GitHub Pages, and the site always tracks `main`.

What a repository actually pins is the lint config, so that is the version worth
recording. It also separates two results a compliance check must never confuse:

* a repository that runs the check and fails it
* a repository pinned below `introduced_in`, which does not have the check at all

The second is not a violation. It is a repository that has not upgraded yet, and
reporting it as a failure would ask a team to fix something their toolchain
cannot even see.

## Adding a rule

Set `package` and `introduced_in` to the release that ships the check. Write the
rule when that release exists, not before: a rule pointing at a check nobody can
run yet says a standard is enforced when it is not.

A rule may only reference a standard whose `enforceable` is `true`. Writing a
rule against a `process/` document means either the rule is wrong, or the
document was filed in the wrong tier.
