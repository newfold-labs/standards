---
id: plugin-structure
title: Plugin structure
summary: How a brand plugin is laid out, and why distribution files decide the layout
status: active
applies_to: [plugin]
tags: [plugin, structure, distribution, distignore]
related: [general-naming-files-directories, module-structure, wp-php]
order: 10
enforceable: true
---

Brand plugins are the `wp-plugin-*` repositories whose sole purpose is serving a
single brand, such as `wp-plugin-bluehost`.

## Distribution files drive the layout

We have the plugins set up with `.distignore` and `.distinclude` files which
expect certain file organizations. We want our distribution files to be as small
as possible but also contain any required files. Following a standard folder
structure across our modules will ensure that we have files in proper places for
this.

To understand these rules, please refer to these files in the plugin. They are
followed for all build steps locally and via GitHub workflows. For example, any
tokens must be ignored in the distributed files and build files for security
reasons, so in the `.distignore` file we ignore all hidden dot files with the
line `./*`.

## Main plugin file

The main plugin file name must mirror the directory name, and application
scaffolding belongs in `bootstrap.php` rather than the main file. Both are
covered in [WordPress PHP](../../platform/wordpress/php.md).

## Modules inside plugins

Modules are installed as Composer dependencies of a brand plugin and follow their
own layout. See [module structure](../module/structure.md).
