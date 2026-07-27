---
id: wp-hooks
title: WordPress hooks
summary: When to add custom actions and filters, and how to pick arguments and priorities
status: active
applies_to: [plugin, theme, module]
tags: [wordpress, hooks, actions, filters]
related: [wp-hooks-naming, wp-php, wp-interfaces]
order: 60
enforceable: true
---

Custom action and filter hooks are critical to robust WordPress products.

Via `do_action()` and `apply_filters()` in PHP, developers can extend, limit and
modify WordPress core and other third-party codebases running in a WordPress
environment.

Naming conventions for these hooks are covered in
[hook naming](hooks-naming.md).

## Code that should often have a custom filter

* `WP_Query` arguments
* HTTP API option configs
* PHP data inlined in the DOM for scripts
* Data and configs that external codebases may want to modify

## Code that should often have a custom action

* Preflight and postflight actions in a codebase (i.e. installation)
* PHP interfaces can be built using actions (i.e. `app_below_header`, `app_body`,
  `app_below_footer`)

## More than one variable? Use a single array argument

WordPress supports more than one attribute in hooks, however remembering the
order of these positional arguments can get challenging even with good inline and
supporting documentation. So if there's more than one piece of data, we prefer an
associative array with keys and values to multiple positional arguments, so we
only need to remember keys, not order.

## Hook priority for execution timing

WordPress uses an integer-based priority system with the default being 10. Most
core uses max out at 100.

* Use increments of 5 to set hook timing, the big exception being between 0 and
  10.
* Don't use `PHP_INT_MAX` or super-late, "multi-nine" priorities like `999999`.
* If more than three zeroes, incrementation like `12345` is preferred to `10000`
  for legibility. Try to stay below 200 unless you are overcoming a third-party
  product.

## It's frowned upon to use anonymous methods or closures in hook callbacks

Anonymous functions defeat the purpose of hooks in that they're a royal nuisance
to remove using `remove_action()` or `remove_filter()`.

Except in the rare case where the explicit intention is to make it difficult to
remove a hook, callbacks should always be a named function or class that can be
declared in other codebases for removal.

## Hook diagnostic

The
[list of available WordPress actions](https://codex.wordpress.org/Plugin_API/Action_Reference)
can vary by site because third-party plugins can add their own. Hooks are
executed in a runtime sequence. Not all hooks are available to plugins and
themes, some hooks are WordPress Admin-only, some hooks have dynamic names, etc.

Best practice is to use a developer tool like
[Query Monitor](https://wordpress.org/plugins/query-monitor/) to inspect
available hooks and attached methods. If code isn't executing, Query Monitor can
tell you with certainty if it is getting registered.

If you're troubleshooting hooks make sure:

* Your registration method is executing. Is the file being executed, is the
  method being executed?
* You're not trying to tap into a hook too late.
* You're not trying to attach a protected or private method as a hook callback.
