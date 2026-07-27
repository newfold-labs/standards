---
id: general-naming-code
title: Naming code
summary: How to name variables, keys and identifiers so related names group and grow predictably
status: active
applies_to: [any]
tags: [naming, code]
related: [general-naming, general-naming-global-namespaces]
order: 60
enforceable: false
---

## Start generic, narrow to specific

By starting our names with generic ideas and narrowing to more specific, it's
easier to add adjacent code and ideas that follow the same pattern.

* `nfd-bluehost-widget-account` is better than `bluehost-account-widget`
* `nfd-module-data-helper-admin` is better than `data-module-admin-helper`

## Prefer specific to vague

Specificity creates a natural growth path without needing to rename or rekey
overly generic keys.

* `nf_account_data` is better than `nf_account`
* `nf_plugin_updates_cache` is better than `nf_plugins`

## Use singular equivalent to plural in loops

By using the singular variant of a plural, it becomes clear what comes from what.
It's also preferred to avoid using data types as names; please put those in
documentation.

| ❌ Avoid                | ✅ Preferred |
| ----------------------- | ------------ |
| `for post in items`     | `for post in posts` |
| `for single in posts`   | `for post in posts` |
| `for object in objects` | `for user in users` |
