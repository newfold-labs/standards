---
id: wp-cli
title: WP-CLI
summary: Running WP-CLI commands safely against installations we do not own
status: draft
applies_to: [plugin, module]
tags: [wordpress, wp-cli, tooling]
related: [wp-php, wp-i18n]
order: 110
enforceable: false
---

WP-CLI is a PHP-based command line interface for interacting with WordPress
installations.

## Running WP-CLI commands

* Always use `--dry-run` to test operations that affect databases.
* Consider using `--prompt` to see all available arguments.
* Use `wp help [command]` for command-specific documentation.

## Custom WP-CLI commands

This section was never written. The source document in how-we-work ended with
this heading and nothing under it, so it is carried here as a draft rather than
presented as a settled standard. See
[what still needs writing](../../meta/migration-map.md#content-still-to-be-written).
