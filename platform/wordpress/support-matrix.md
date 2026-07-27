---
id: wp-support-matrix
title: WordPress support matrix
summary: The WordPress, PHP and browser versions our products must work on
status: active
applies_to: [plugin, theme, module]
tags: [wordpress, compatibility, php, browsers, support]
related: [wp-php, general-releases, process-release-runbook]
order: 10
enforceable: true
---

We're proud to help millions of customers get online with WordPress.

## Minimum supported versions

_Last updated: March 2026._

### WordPress core

We officially support the last three major releases of WordPress in our products.
We always strive for more and expect products to gracefully degrade whenever
possible, prompting users to update.

_Major releases of WordPress are 6.7, 6.8, 6.9, not WordPress 4.x or WordPress
5.x._

### Browser support

We follow the `@wordpress/browserslist-config`. We do not support any version of
Internet Explorer.

Generally we support:

* Browsers with >1% usage.
* Last 2 Firefox, Safari, iOS, Edge and Opera versions.
* Last 1 Android, Chrome Android versions.

### PHP

WordPress provides recommendations and minimums.

As of March 2026, [WordPress recommends](https://wordpress.org/about/requirements/)
PHP 8.3 or greater. The minimum supported version is PHP 7.4.

We currently support two point releases below WordPress' recommendation. All our
products must work 100% two point releases below the recommendation.

We expect our code to execute error-free in any minimum version WordPress
supports. However, we do not expect our products to be fully functional or even
functional with PHP 5.x. Reduced functionality or throwing up an upgrade screen
are both acceptable if faced with writing PHP 5.x-7.1 compatible code.

## Release compatibility

Every production release is held to this matrix:

* All production code must be compatible with the three latest WordPress
  versions.
* All production code must be compatible with the latest PHP version and any PHP
  version with more than 5% usage
  [per the WordPress stats page](https://wordpress.org/about/stats/#php_versions).

## Why the matrix looks like this

There's enterprise WordPress, and then there's enterprise shared WordPress
hosting.

We run into many of the security and performance requirements of
enterprise-grade WordPress in our products, while uniquely needing to be
resilient, efficient and considerate of the fact they run in millions of
different configurations for a wide spectrum of customers.

In most enterprise WordPress environments, engineers can exercise tight,
end-to-end control over the server, site configuration and available features.

In enterprise shared hosting, we need to keep customers safe and fast, while
giving them as much control as we can. Even in our managed server environments,
we often can't get prescriptive about WordPress plugins or themes.

So we need to balance smart defaults and recommendations to help users who don't
know their technical requirements, with flexibility and control for users who do.
