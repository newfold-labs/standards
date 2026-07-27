---
id: meta-resources
title: Resources
summary: Standards guides, WordPress handbooks and references we lean on
status: active
applies_to: [any]
tags: [meta, resources, reference, links]
related: [general-introduction, general-philosophy]
order: 70
enforceable: false
---

## Standards guides

These are some engineering standards in the greater WordPress ecosystem we like:

* [10up/Engineering-Best-Practices](https://10up.github.io/Engineering-Best-Practices/)
* [WPVIP Technical Reference](https://docs.wpvip.com/technical-references/)
* [Human Made Engineering Handbook](https://engineering.hmn.md/)
* [inpsyde/php-coding-standards](https://github.com/inpsyde/php-coding-standards)
* [WordPress The Right Way](https://www.wptherightway.org/)

## Official WordPress handbooks and resources

* [Gutenberg Storybook](https://wordpress.github.io/gutenberg/)
* [Plugin Handbook](https://developer.wordpress.org/plugins/)
* [Theme Handbook](https://developer.wordpress.org/themes/)
* [HTTP API](https://developer.wordpress.org/plugins/http-api/)
* [REST API Handbook](https://developer.wordpress.org/rest-api/)
* [$wpdb API](https://developer.wordpress.org/reference/classes/wpdb/)
* [Block Editor Handbook](https://developer.wordpress.org/block-editor/) _(Gutenberg project)_
* [@wordpress/scripts](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-scripts/) build tooling
* [@wordpress/data](https://developer.wordpress.org/block-editor/reference-guides/packages/packages-data/) library
* [@wordpress/components](https://wordpress.github.io/gutenberg/?path=/story/playground-block-editor--default) reference
* [Dashicons Reference](https://developer.wordpress.org/resource/dashicons/) | [@wordpress/icons Library](https://wordpress.github.io/gutenberg/?path=/story/icons-icon--library)
* [Conditional Tags](https://codex.wordpress.org/Conditional_Tags)
* [Determining Directories and URLs](https://codex.wordpress.org/Determining_Plugin_and_Content_Directories)
* [PHP Global Variables](https://codex.wordpress.org/Global_Variables)
* [Internationalization (i18n)](https://codex.wordpress.org/I18n_for_WordPress_Developers)
* [Accessibility Handbook (a11y)](https://make.wordpress.org/accessibility/handbook/)
* [WordPress TV](https://wordpress.tv/)
* [Learn WordPress](https://learn.wordpress.org/)

## Helpful guides, articles and references

* Understanding WordPress' directory structure
* [Understanding WordPress' Heartbeat API](https://pippinsplugins.com/using-the-wordpress-heartbeat-api/)
* [Understanding WordPress Rewrite API](https://carlalexander.ca/wordpress-adventurous-rewrite-api/)
* [Understanding @wordpress/data Redux-like stores](https://unfoldingneurons.com/series/practical-overview-of-wp-data)
* [Understanding WordPress SlotFills in JavaScript UIs](https://nickdiego.com/a-primer-on-wordpress-slotfill-technology/)
* [Understanding Full Site Editing and block themes](https://fullsiteediting.com)
* [Generate WP boilerplate code generator](https://generatewp.com/)
* [YouMightNotNeedjQuery.com](https://youmightnotneedjquery.com/)
* [Locutus.io/php](https://locutus.io/php/)

## On leveraging Stack Overflow, the WordPress Codex and search-sourced solutions

Stack Overflow, the Codex and solutions found on blogs are often excellent
starting points to learn and develop solutions. However, many solutions aren't
written to consider enterprise needs, high-traffic sites or large-scale
environments, so we discourage direct copying of code and adding `@see`
references to solutions.

When integrating someone else's solution, please consider the following:

* Are other developers on the thread pointing out edge cases, performance
  concerns or other issues the original author didn't code for?
* Will this scale in a high-traffic environment? Can performance be better
  addressed through caching or storing data that's resource-intensive to
  generate?
* Are there enough filters and actions for modification? Perhaps add some.
* Are variable names and function names clear? Please clarify them for our
  purposes.
* Is this functionality "right-sized"? Perhaps break large procedural functions
  into helpers.
* Does the author properly sanitize and validate user input while late-escaping
  output?
* Does this solution leverage language features where WordPress provides helpers
  to handle compatibility (i.e. `wp_json_encode()`, Filesystem API, DateTime
  solutions, etc)?
