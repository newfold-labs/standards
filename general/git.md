---
id: general-git
title: Git and branching
summary: GitFlow, branch naming, and what CI runs at each stage
status: active
applies_to: [any]
tags: [git, branching, gitflow, ci]
related: [general-releases, process-code-review]
order: 90
enforceable: true
---

We use [Git](https://git-scm.com/) to manage our code and use
[GitFlow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
as our workflow. Whenever possible, simply create a branch on the project repo
rather than forking to another repository. This is because there are some
workflows that only run on the main repository (such as build steps and Cypress
cloud test submission). For testing it is important to have these workflows and
artifacts in place. If you do not have proper permission to create a branch on
the repository in question, please request access.

## Branch naming

For each branch type defined by GitFlow, the following branch naming patterns are
acceptable:

| Branch type | Pattern |
| --- | --- |
| main | `main` (preferred)<br/>`master`<br/>`trunk` |
| hotfix | `hotfix/*` - where `*` represents the semantic version number (e.g. `hotfix/1.2.1`) |
| release | `release/*` - where `*` represents the semantic version number (e.g. `release/1.2.0`) |
| develop | `develop` |
| feature | `feature/*` - new feature<br/>`add/*` - new feature<br/>`update/*` - improve an existing feature<br/>`fix/*` - non-urgent bugfixes<br/>`try/*` - experiments<br/><br/>The asterisks can be replaced with a descriptive name, or a ticket number. |

## GitHub Actions

| Stage | Trigger | Actions |
| --- | --- | --- |
| Feature | On push to a feature branch | Run linting and tests. Run a build (plugins and themes only) |
| Develop | On push or PR to the develop branch<br/> On alpha or beta release | Run linting and tests. Run a build (plugins and themes only)<br/> Run linting and the full test matrix. Run a build (plugins and themes only) |
| Release | On push or PR to a release branch<br/> On a release candidate release | Run linting and tests. Run a build (plugins and themes only)<br/> Run linting and the full test matrix. Run a build (plugins and themes only) |
| Hotfix | On push or PR to a hotfix branch<br/> On a release candidate release | Run linting and tests. Run a build (plugins and themes only)<br/> Run linting and the full test matrix. Run a build (plugins and themes only) |
| Main | On push to the main branch | Run linting and full test matrix. Run a build (plugins and themes only) |

Version tagging conventions live in [Releases](releases.md). Who is permitted to
review and release is covered in
[Code review and release restrictions](../process/code-review.md).
