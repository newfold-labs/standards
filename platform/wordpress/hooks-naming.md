---
id: wp-hooks-naming
title: Hook naming
summary: The newfold/context/type/name convention for custom action and filter hooks
status: active
applies_to: [plugin, theme, module]
tags: [wordpress, hooks, naming, actions, filters]
related: [wp-hooks, general-naming, general-naming-global-namespaces]
order: 70
enforceable: true
enforced_by: wp-hooks-naming-hook-name-format
---

A consistent naming convention for hooks is crucial when developing WordPress
themes or plugins to ensure readability and maintainability. Below is a
standardized approach to naming action and filter hooks tailored to Newfold
Digital's development practices.

## Naming conventions

### General structure

* **Prefix:** All hooks begin with a `newfold/` vendor prefix to ensure
  uniqueness and prevent conflicts with WordPress core or other plugins.
* **Context:** Follows the prefix and describes the context in which it is used.
  Any hook in a module should use the module name in slug format. If a hook is
  specific to a plugin, the plugin brand name should be used in slug format. Use
  your best judgment in any other context. For example, if the module name is
  "Help Center", the context should be `help-center`.
* **Type:** Specify whether it is an `action` or a `filter`.
* **Identifier:** A descriptive name that indicates what the hook does.

### Actions

**General form:** `newfold/[context]/action/[actionName]`

**Action name:** Action names should always use camel case and should always
start with a lowercase letter. The following scenarios may also apply when
creating an action name:

* **Timing prefix:** Actions are tied to specific events in WordPress, but
  sometimes we want to do things just before, just after, or during an event. In
  these cases, use the following conventions:
  * **Before** - If firing an action before an event happens, use the `before`
    prefix. Example: `beforeSave`.
  * **During** - If firing an action during an event, use the `on` prefix.
    Example: `onSave`.
  * **After** - If firing an action after an event happens, use the `after`
    prefix. Example: `afterSave`.
* **Value context:** Sometimes we might create dynamic action hooks that surface
  a value as part of the name. In such cases, we should use a `:` followed by the
  dynamic value. For example, if you have a `registerPostType` hook, you might
  also dynamically append the post type name to make extending functionality for
  a single post type easier. Example: `registerPostType:page`.

**Examples:**

* `newfold/settings/action/beforeSave`
* `newfold/settings/action/onSave`
* `newfold/settings/action/afterSave`
* `newfold/settings/action/onRenderTemplate`
* `newfold/settings/action/onRenderTemplate:my-template`

### Filters

**General form:** `newfold/[context]/filter/[filterName]`

**Filter name:** Filter names should always use camel case and should always
start with a lowercase letter. The following scenarios may also apply when
creating a filter name:

* **Action:**
  * **Get** - Indicates that a filter is applied to a fetched value. Example:
    `getTemplate`.
  * **Set** - Indicates that a filter is applied to a value being updated.
    Example: `setTemplate`.
  * **Other** - In some scenarios, another verb may make more sense. Examples:
    `validateInput`, `sanitizeOutput`.
* **Booleans:** Any filter where a boolean is expected should use one of these
  prefixes:
  * **Should** - Use when a filter determines if an event should occur. Example:
    `shouldRender`.
  * **Is** - Use when a filter otherwise returns a boolean. Examples:
    `isAuthorized`, `isValid`.
* **Context:**
  * **Default** - Use when filtering a default value. Example: `defaultTemplate`.
  * **Pre** - Use when the filter forcefully overrides or short-circuits logic to
    get a value. Example: `preGetTemplate`.

**Purpose-specific naming:** Filters should have names that clearly reflect the
value they modify or the decision they influence.

**Examples:**

* `newfold/settings/filter/getTemplate`
* `newfold/settings/filter/setTemplate`
* `newfold/settings/filter/validateInput`
* `newfold/settings/filter/sanitizeOutput`
* `newfold/settings/filter/shouldRender`
* `newfold/settings/filter/isAuthorized`
* `newfold/settings/filter/isValid`
* `newfold/settings/filter/defaultTemplate`
* `newfold/settings/filter/preGetTemplate`

## Usage guidelines

* **Descriptiveness:** Choose names that convey the purpose of the hook clearly
  and are understandable at a glance.
* **Consistency:** Maintain consistent structure across the project to simplify
  the learning curve for new developers and aid in codebase maintenance.
* **Documentation:** Document each hook thoroughly, including where it is applied
  and what parameters it passes or expects.

This naming convention provides clarity and aligns with best practices, ensuring
that all developers, regardless of their familiarity with the project, can
understand and use the hooks efficiently.
