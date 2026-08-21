---
id: wp-security
title: WordPress security
summary: Authentication, nonces, escaping, sanitization and safe database access
status: active
applies_to: [plugin, theme, module]
tags: [wordpress, security, nonces, escaping, sanitization, xss]
related: [wp-php, wp-performance, general-naming-global-namespaces]
order: 40
enforceable: true
enforced_by: wp-security-checks
---

WordPress powers over 43% of the internet and has a huge surface area for attack
between core and third-party codebases. WordPress also has nearly two decades of
security hardening and the open-source ecosystem is heavily scrutinized for
threat vectors.

## Using proper authentication and permissions checks

### Only execute what's necessary

For both performance and security considerations, admin-only code shouldn't get
instantiated unless `is_user_logged_in() && is_admin()`. Likewise, frontend code
that isn't needed in the admin should confirm `! is_admin()`.

### Check `is_user_logged_in()` AND `current_user_can()`

It is **never enough to check `is_admin()`** in conditional logic. It should
always be paired with `is_user_logged_in()` or better yet `current_user_can()`.

One common issue is giving subscriber or lower-level users access to privileged
data that should be isolated to editors or administrators, or specific users
using `get_current_user_id()`. Some WordPress products use the subscriber tier of
users in unexpected ways, so checking WordPress'
[system of capability strings](https://wordpress.org/support/article/roles-and-capabilities/)
instead of user role levels is considered best practice.

## Using nonces

WordPress uses a time-based nonce system to validate requests and prevent
cross-site request forgery. These are not nonces in the strictest software
concept of true nonces, as
[they're not single use but expire over time, typically 12 hours](https://codex.wordpress.org/WordPress_Nonces).

We expect all WP-API endpoints or Admin Ajax callbacks to have nonce
verification, with very few and highly scrutinized exceptions.

## Late-escaping markup

Cross-site scripting (XSS) mitigation is essential in WordPress codebases.

In PHP, we use WordPress core functions like `esc_attr()`, `esc_html()`,
`esc_url()` and `wp_kses()` to prepare strings for safe output to the DOM.

Escaping should always be done at the last possible opportunity, even if that
means repetitive wrapping of variables and data.

In JavaScript, we typically frown on inserting HTML directly into the DOM, either
from an API response or concatenating variables into strings (i.e.
`'<a href="' + url + '">'`). That means using `.innerHTML` and
`dangerouslySetInnerHTML()` in React are discouraged. The one notable exception
is rendered responses from data in the WordPress REST API on trusted sites. In
lieu of these methods, creation of DOM nodes using `.attr()` and `.text()` is
preferred, or the use of React components.

## Validating input and sanitizing database writes

* We always sanitize data from the PHP magic query/payload variables such as
  `$_GET`, `$_POST` and `$_GLOBAL`.
* We always sanitize data, trim spaces, unsafe markup and encode special
  characters before saving data to a WordPress database.
* We take steps to obfuscate and encrypt sensitive data, but always assume the
  WordPress database isn't a place it's possible to truly store sensitive data
  beyond one-way hashes that cannot be decrypted.

Note on JSON in metadata fields: due to how `update_metadata()` works, JSON
strings cannot be directly saved into meta fields without first passing through
`wp_slash()`. Without prior slashing,
[invalid JSON will be returned](https://wordpress.stackexchange.com/questions/53336/wordpress-is-stripping-escape-backslashes-from-json-strings-in-post-meta).

## We generally avoid new additions to `admin-ajax.php`

Before the WordPress REST API, the Admin Ajax file could be used for
authenticated or unauthenticated requests.

As a general rule with few exceptions, we do not add new Admin Ajax callbacks
when it is possible to register WP-API endpoints.

We also avoid the `no_priv` Admin Ajax hooks unless essential.

## Storing and file-logging HTTP responses and headers

It can be tempting to store an HTTP response in full for caching or debug. Always
assure you aren't accidentally caching API tokens or passwords in cleartext that
would normally be protected.

## Always use $wpdb and $wpdb->prepare() for direct database queries

In general, we lean on WordPress' internal query APIs like `WP_Query`,
`WP_Tax_Query` and `WP_User_Query` for the caching and security built in, even if
a direct query could eke out a moderate performance gain.

When it becomes radically more performant or necessary to write direct SQL
queries, never access the MySQL database directly using the credentials in the
`wp-config.php`.

Instead we use the `$wpdb` global and use `$wpdb->prepare()` to sanitize queries,
or methods like `esc_sql()` and `esc_like()`. `$wpdb->prepare()` is considered
best practice when applicable.

## Beware caching $wpdb, which contains database credentials

It can be tempting to cache a `WP_Query` or `$wpdb` object. Doing so risks
persisting database credentials into a cache store.

## Beware of sensitive data in the browser's localStorage and sessionStorage

As a general rule, browser localStorage should only be used for progressive
enhancement, but when leveraged, avoid storing sensitive tokens, content or user
data in browser data stores.

## wp_safe_redirect and allowed_redirect_hosts filter with exit()

When making a redirect in PHP, we expect the host to be in the
`allowed_redirect_hosts` filter and proper use of `wp_safe_redirect()` paired
with `exit`.

Often, the best way to do this is:

```php
if ( wp_safe_redirect( $resource ) ) {
    exit;
} else {
    new \WP_Error();
}
```
