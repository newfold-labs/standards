---
id: theme-structure
title: Theme structure
summary: Placeholder for theme standards, which have never been written down
status: draft
applies_to: [theme]
tags: [theme, structure]
related: [plugin-structure, module-structure, general-naming-files-directories]
order: 10
enforceable: false
---

We ship `wp-theme-*` repositories, but no theme-specific standards were ever
written. This document exists so the artifact tier is complete and so there is a
single obvious place for that content to land.

Until it is written, themes are bound by everything that is not artifact
specific:

* The [general](../../general/naming.md) standards, in full
* The [WordPress platform](../../platform/wordpress/php.md) standards, in full
* [Naming files and directories](../../general/naming-files-directories.md) for
  layout, including the PSR-4 casing rule and the preference for unabbreviated
  directory names

What is missing and needs writing:

* Where theme PHP lives relative to `functions.php`, and how `bootstrap.php`
  applies to a theme
* `theme.json` conventions and how far we lean on full-site editing
* Block theme versus classic theme expectations
* Which parts of the plugin distribution rules (`.distignore` and friends) carry
  over

Writing this is tracked as an open issue against this repository.
