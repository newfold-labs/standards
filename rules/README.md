# Rule definitions

Machine-readable definitions linking a standard to the check that enforces it.

This directory is **excluded from the Jekyll build** (see `exclude` in
`_config.yml`). A YAML file opening with `---` is indistinguishable from a Jekyll
page whose front matter is the whole file, so Jekyll would parse a rule body as
metadata and publish an empty page.

The rules here cover the standards that the Newfold PHPCS standard already
checks. Most `enforceable: true` documents still have no rule, which is the
backlog rather than an oversight: a standard gets a rule when a check for it
exists.

The documented format lives at
[meta/rules-format.md](../meta/rules-format.md), which is the version that
renders on the site. `_template.yml` in this directory is a copyable starting
point.

`levels.yml` is not a rule. It holds the maturity ladder the scorecard scores
repositories against, and the signals each rung is measured from, in the one
place both the documentation and the scorer read. See
[meta/scorecard.md](../meta/scorecard.md).

## Adding a rule

1. Copy `_template.yml`.
2. Point `standard` at the `id` of an existing document whose `enforceable` is
   `true`. A rule against a `process/` document means one of the two is filed
   wrong.
3. Set `enforced_by` in that document's front matter to your rule's `id`.
4. Set `package` and `introduced_in` to the release that ships the check. Write
   the rule once that release exists: a rule pointing at a check nobody can run
   yet says a standard is enforced when it is not.

The rule appears on the scorecard from the next sweep. Nothing else needs
editing: the board reads whatever is in this directory, and the sweep rescores
every repository whenever these files change.
