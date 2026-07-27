# Newfold Labs Standards

How we build software at Newfold Labs.

**Read them at [newfold-labs.github.io/standards](https://newfold-labs.github.io/standards/).**

This repository replaces
[how-we-work](https://github.com/newfold-labs/how-we-work). Old URLs still
resolve; see [the migration map](meta/migration-map.md) for where each page went.

## Layout

```
general/            Standards that hold regardless of platform or artifact type
platform/
  wordpress/        Standards binding a technology
artifacts/
  plugin/ theme/    Standards binding a kind of thing we ship
  module/ worker/
process/            How we work together, not lintable
meta/               Schema, contribution process, lifecycle, versioning
rules/              Machine-readable rule definitions (excluded from the site)
schema/             JSON Schema for document front matter
scripts/            Validation run in CI
```

Every document carries front matter with a stable `id`, the artifact types it
`applies_to`, a lifecycle `status`, and whether it is `enforceable`. Checks and
AI answers cite the `id`, so a failure points at the exact standard behind it.

The nav, the index and `llms.txt` are all generated from that metadata. Nothing
is hand-maintained.

## Contributing

Typos and clarifications go straight to a PR. Anything that changes what a
standard requires goes through the RFC process first. See
[meta/contributing.md](meta/contributing.md).

## Working on the site

Validation, the same checks CI runs:

```bash
npm ci
npm run validate
```

Build and preview:

```bash
bundle install
bundle exec jekyll serve
```

The site is built by `.github/workflows/pages.yml` rather than the classic
GitHub Pages branch build, because front matter has to be validated before
Jekyll runs. Pull requests build without deploying; `main` deploys.
