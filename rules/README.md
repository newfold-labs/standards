# Rule definitions

Machine-readable definitions linking a standard to the check that enforces it.

This directory is **excluded from the Jekyll build** (see `exclude` in
`_config.yml`). A YAML file opening with `---` is indistinguishable from a Jekyll
page whose front matter is the whole file, so Jekyll would parse a rule body as
metadata and publish an empty page.

It is deliberately empty of real rules. The format is fixed here so that the work
of writing the lint configs has something to write against; populating it is
separate work.

The documented format lives at
[meta/rules-format.md](../meta/rules-format.md), which is the version that
renders on the site. `_template.yml` in this directory is a copyable starting
point.

## Adding a rule

1. Copy `_template.yml`.
2. Point `standard` at the `id` of an existing document whose `enforceable` is
   `true`. A rule against a `process/` document means one of the two is filed
   wrong.
3. Set `enforced_by` in that document's front matter to your rule's `id`.
4. Bump the **major** version. A new rule means a repository that passed before
   can fail now.
