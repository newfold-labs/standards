---
id: general-naming-global-namespaces
title: Naming in global namespaces
summary: Defensive prefixing for names that land in a namespace we do not control
status: active
applies_to: [any]
tags: [naming, global-namespace, prefixing]
related: [general-naming, general-naming-code, wp-php, wp-assets]
order: 70
enforceable: true
---

Sometimes we need to execute code in a global namespace in PHP or JavaScript, or
key data in databases and caches in environments we don't control.

Common database keys like `api_url`, `plugin_config` or `system_status` could be
set by another codebase, so we need to be defensive with our naming.

## General best practice

* Most constants, variables and methods should receive an `nfd` prefix.
* **This is a global namespace.** Be defensive, clear and courteous. Safety and
  clarity over brevity.
* **Consistently use a product prefix after the company prefix** to aid locating
  code (i.e. searching `nfd_performance_module_` to find all hooks).
* **Avoid jargon and acronyms in handles.** Save it for inline documentation.

### Examples

* `nfd_api_url`
* `nfd_system_status`
* `nfd_brand_config`
* `nfd-brand-widget`
* `nfd_register_modules()`

The notable exception is something well-prefixed where the `nfd` is overly
verbose:

`wp-plugin-bluehost-admin` is a fine asset handle, an `nfd-` prefix is overkill.
