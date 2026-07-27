---
id: module-structure
title: Module structure
summary: The directory layout every module shares, and what ends up in the distributed zip
status: active
applies_to: [module]
tags: [module, structure, distribution, autoloading]
related: [general-naming-files-directories, plugin-structure, module-development]
order: 10
enforceable: true
---

All Newfold modules should be set up in a similar directory structure. This makes
the files easy to find and simple to target certain files across all modules for
the smallest zip file possible.

For example, we don't need to include source JavaScript files, test files, or
even config files in plugins, since those files aren't used in this context and
only end up taking up space. When a plugin is on hundreds of thousands of sites,
this filesize discrepancy adds up quickly and leads to more bandwidth and hosting
space. Please follow these guidelines and ensure that any module's required files
are included in the final distributed plugin zip.

## `/includes`

PHP files in the module beyond the bootstrap file, and optionally another base
file, should be located in an `/includes` directory. These files should be loaded
with autoloading and properly namespaced.

## `/src` or `/source`

Source JavaScript files should be located in a `/src` or preferably `/source`
directory. According to the plugin-level `.distignore` file, these source
JavaScript files will not be included in the distributed plugin zip. If the
module requires a build step, the compiled JavaScript in the build directory will
be included, but a JavaScript build step will likely lead to an npmjs or
npm.pkg.github package.

## `/static`

Any static files (such as images or CSS) should be placed in a `/static`
directory (also acceptable is `/assets`) to ensure they are included in
distribution zips.
