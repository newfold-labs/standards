---
id: meta-migration-map
title: Migration map from how-we-work
summary: Where every page of the old repository ended up, and what changed on the way
status: active
applies_to: [any]
tags: [meta, migration, how-we-work, history]
related: [meta-frontmatter-schema, meta-lifecycle]
order: 60
enforceable: false
---

This repository replaces
[newfold-labs/how-we-work](https://github.com/newfold-labs/how-we-work), which
was 33 flat markdown files numbered by reading order.

how-we-work is not archived. It keeps publishing a redirect shim so old URLs
still resolve, because GitHub does not redirect project Pages URLs across
repositories and `jekyll-redirect-from` only covers path changes inside a single
site.

## Where everything went

| Old file | New location |
| --- | --- |
| `README.md` | Generated index |
| `0-SCRATCH.md` | Not migrated, converted to issues |
| `1-intro.md` | [general/introduction.md](../general/introduction.md) |
| `2-standards.md` | Merged into [general/introduction.md](../general/introduction.md) |
| `3-naming.md` | [general/naming.md](../general/naming.md) |
| `3.1-projects.md` | [general/naming-projects.md](../general/naming-projects.md) |
| `3.2-files-directories.md` | Split, see below |
| `3.3-code.md` | [general/naming-code.md](../general/naming-code.md) |
| `3.4-global-namespaces.md` | [general/naming-global-namespaces.md](../general/naming-global-namespaces.md) |
| `3.5-naming-wp-hooks.md` | [platform/wordpress/hooks-naming.md](../platform/wordpress/hooks-naming.md) |
| `4-frontend-best-practices.md` | [general/frontend.md](../general/frontend.md) |
| `5-wordpress.md` | [platform/wordpress/support-matrix.md](../platform/wordpress/support-matrix.md) |
| `5.1-wordpress-assets.md` | [platform/wordpress/assets.md](../platform/wordpress/assets.md) |
| `5.2-wordpress-hooks.md` | [platform/wordpress/hooks.md](../platform/wordpress/hooks.md) |
| `5.3-wordpress-php.md` | [platform/wordpress/php.md](../platform/wordpress/php.md) |
| `5.4-wordpress-js.md` | [platform/wordpress/javascript.md](../platform/wordpress/javascript.md) |
| `5.5-wordpress-security.md` | [platform/wordpress/security.md](../platform/wordpress/security.md) |
| `5.6-wordpress-interfaces.md` | [platform/wordpress/interfaces.md](../platform/wordpress/interfaces.md) |
| `5.7-wordpress-editor-and-blocks.md` | Not migrated, the file was empty. Tracked as an issue |
| `5.8-wordpress-performance.md` | [platform/wordpress/performance.md](../platform/wordpress/performance.md) |
| `5.9-wp-i18n.md` | [platform/wordpress/i18n.md](../platform/wordpress/i18n.md) |
| `5.10-wp-cli.md` | [platform/wordpress/wp-cli.md](../platform/wordpress/wp-cli.md) |
| `5.11-tools-services.md` | [platform/wordpress/tools-services.md](../platform/wordpress/tools-services.md) |
| `5.12-crowdin-translation-workflow.md` | [process/translations-crowdin.md](../process/translations-crowdin.md) |
| `5.13-ai-translation-workflow-documentation.md` | [process/translations-ai.md](../process/translations-ai.md) |
| `6-laravel.md` | Did not exist. Deleted in 2022, still linked from the old README |
| `7-philosophy.md` | [general/philosophy.md](../general/philosophy.md) |
| `8-resources.md` | [meta/resources.md](resources.md) |
| `9-version-control.md` | Split, see below |
| `9.1-org-teams.md` | [process/org-teams.md](../process/org-teams.md) |
| `9.2-tokens.md` | [process/tokens.md](../process/tokens.md) |
| `10-releases.md` | Split, see below |
| `11-module-development.md` | [artifacts/module/development.md](../artifacts/module/development.md) |
| `12-tests.md` | Split, see below |
| `13-architectural-review.md` | [process/architectural-review.md](../process/architectural-review.md) |
| `14-cloudflare-workers.md` | [artifacts/worker/cloudflare-workers.md](../artifacts/worker/cloudflare-workers.md) |

## Documents that were split

Roughly a quarter of the old content was process rather than standards. Mixing
the two meant the repository had no way to express that "ask your team lead for
access" is not something a check can score you against.

**`3.2-files-directories.md`**

* General file and directory rules, plus the WordPress `class-` prefix note, to
  [general/naming-files-directories.md](../general/naming-files-directories.md)
* Brand Plugins section to
  [artifacts/plugin/structure.md](../artifacts/plugin/structure.md)
* Modules section to
  [artifacts/module/structure.md](../artifacts/module/structure.md)

**`9-version-control.md`**

* GitFlow, branch naming and the CI stage table to
  [general/git.md](../general/git.md)
* Tagging, semver and pre-release conventions to
  [general/releases.md](../general/releases.md)
* Code review and release restrictions to
  [process/code-review.md](../process/code-review.md)

**`10-releases.md`**

* Cadence and version semantics to [general/releases.md](../general/releases.md)
* Compatibility, which duplicated `5-wordpress.md`, merged into
  [platform/wordpress/support-matrix.md](../platform/wordpress/support-matrix.md)
* Jira planning, release flow, rollback and the release lead checklist to
  [process/release-runbook.md](../process/release-runbook.md)

**`12-tests.md`**

* Test types and assertion guidance to
  [general/testing.md](../general/testing.md)
* Module Cypress conventions to
  [artifacts/module/testing.md](../artifacts/module/testing.md)

## What changed in the content

Migration was not a straight copy. Beyond adding front matter to all 43 resulting
documents and merging the six existing title-only blocks:

**Broken links fixed.** The old README linked to `6-laravel.md`, deleted in 2022.
`11-module-development.md` linked to a misspelled `13-architectural-reveiw.md`.
The table of contents omitted `3.5-naming-wp-hooks.md` and
`14-cloudflare-workers.md` entirely. Internal links and their anchors are now
validated in CI, so this class of rot cannot come back.

**Liquid-hostile code samples fenced.** The AI translation workflow document
contains GitHub Actions expressions using {% raw %}`${{ ... }}`{% endraw %}. On the old site Liquid
evaluated those as template variables and rendered them empty, so the published
page showed a broken snippet. They are now wrapped in
{% raw %}`{% raw %}`{% endraw %} tags.

**Spelling and grammar corrected** throughout, without changing what any standard
requires.

**Line-number deep links removed.** Several links pointed at specific line ranges
in plugin and module source (`#L266-L269`). Line numbers drift, so these now
point at the file.

**Two truncated sentences.** `5.5-wordpress-security.md` ended a section
mid-sentence at "It can be tempting to cache a `WP_Query` or `$wpdb`"; it now
completes the thought about persisting database credentials.
`4-frontend-best-practices.md` had a bullet cut off at "Long-running operations
without reliable way to predic", which was dropped rather than guessed at.

**`5.10-wp-cli.md` marked draft.** It ends with an empty "Custom WP-CLI Commands"
heading. Rather than migrate an unfinished document as though it were settled, it
carries `status: draft` and an issue tracks writing it.

**Theme standards stubbed.** No theme-specific content ever existed.
[artifacts/theme/structure.md](../artifacts/theme/structure.md) is a draft stub
listing what needs writing, so every artifact type has a home.
