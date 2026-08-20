---
id: general-naming-files-directories
title: Naming files and directories
summary: Directory and filename conventions, and where they bend to a framework's expectations
status: active
applies_to: [any]
tags: [naming, files, directories, psr-4]
related: [general-naming, general-naming-projects, plugin-structure, module-structure]
order: 50
enforceable: true
---

Some software expects or relies on certain directory structures and filenames
(like `/src` in Gatsby, `webpack.config.js` in the root for wp-scripts, etc),
while others aren't prescriptive or reliant on specific naming and location.

As a result, naming is pretty conditional, but we have some general preferences
and more specific practices.

## General

### Avoid abbreviations like `/inc`, `/src` and `/bin`

We generally prefer `/includes`, `/source` and `/scripts`. The notable exception
is common technology acronyms like `/css` or `/js` instead of
`/cascading-style-sheets`, `/stylesheets` or `/javascript`.

### While Composer PSR-4 autoloading is case-insensitive, directory structures should reflect namespace capitalization

While `/includes/admin/Menu.php` works fine for `\NewfoldLabs\WP\Module\Admin\Menu()`
with proper root-mapping to `/includes`, `/includes/Admin/Menu.php` is preferred.

## WordPress

While we generally follow "the WordPress way", for PSR-4 autoloaded files we
don't use the `class-{name}.php` prefix common in WordPress Core.

Per-artifact directory layouts have their own documents:

* [Plugin structure](../artifacts/plugin/structure.md) for brand plugins
* [Module structure](../artifacts/module/structure.md) for modules
