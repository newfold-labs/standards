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

This section was never written. It is tracked as an open issue against this
repository.
