---
id: process-release-runbook
title: Release runbook
summary: The step by step a release lead follows, from Jira planning to posting in Teams
status: active
applies_to: [plugin, module]
tags: [releases, runbook, jira, qa, r2]
related: [general-releases, process-code-review, wp-support-matrix]
order: 20
enforceable: false
---

This is the operational runbook. What versions mean and how they are tagged is in
[Releases and versioning](../general/releases.md).

## Release planning (Jira)

We use **Jira releases** to collect work for a release. Tickets have a **Fix
Version** field; attach the upcoming release to it so all work is tracked there.
All work that goes into a release should have a ticket. No release work without a
ticket.

We no longer use release coordination meetings or GitHub milestones for release
planning. Jira releases and Fix Version are the source of truth.

**Cutoff:** The cutoff for "what's in this release" is typically when the release
candidate is created. Exceptions: issues that may cause a P3 event can be pulled
in, and product leads can override what goes into a release.

## Release process and flow

Workflows (**Prepare Release** and the release workflow) are run in the **plugin
repo on GitHub**, under the **Actions** tab.

### Preparing a release

The week before a scheduled release (and ad hoc for out-of-cycle releases), we
prepare the release:

* Run the **Prepare Release** workflow. It handles:
  * Version bump
  * Updates to build files
  * Updates to language files
* For a **normal (scheduled) release**, base the release off the `develop`
  branch.
* For **out-of-cycle releases** (e.g. hotfixes), typically base the release off
  `main`.

### Tests and QA

* **Tests must always pass** for a release.
* Ideally, give the QA team **about a week** to test the release candidate before
  the release goes out.

### Building and publishing

The **release workflow** prepares and packages the release automatically but
**does not push it to customers**. It builds a zip of the plugin and **attaches
it to the GitHub release** once the build completes.

* We use an **R2 storage bucket** on the Newfold WP team Cloudflare account.
  Access and upload details are not documented here (this doc is public); release
  coordinators should know the process or ask team leads for access.
* After the release is built and **manually tested** by the release coordinator
  or deputy:
  1. Manually upload the release zip to the **prod free** bucket.
  2. The release system identifies the plugin and version and makes it available
     at our release endpoint.

So: build, then manual testing by release coordinator or deputy, then manual
upload to prod free bucket, then the release system serves it at the release
endpoint.

### Rollback and hotfixes

As distributed code, we can't really "roll back" a release. Instead we **issue a
hotfix release** (patch version).

If we catch issues **before** the release is placed on R2, we can:

* Delete the release in GitHub and delete the tag.
* Continue working on the release candidate in a new PR. The version is already
  bumped, so we don't need to run Prepare Release again, just open a fresh PR for
  the code changes.

## Release lead checklist

Use this checklist when you are running a release (as release lead). Release lead
(coordinator or deputy) can be any member of the plugin team. Adjust as needed
for your release.

1. **Confirm planning**
   * [ ] Jira release exists for this version.
   * [ ] All work going into the release has tickets with **Fix Version** set to
     this release.
   * [ ] Ensure work from all tickets is release ready.
   * [ ] Module PRs are merged, module releases tagged, and module bumps included
     in the plugin.

2. **Prepare the release (week before scheduled release, or when ready for out-of-cycle)**
   * [ ] Base work off `develop` (scheduled) or `main` (out-of-cycle or hotfix).
   * [ ] Run the **Prepare Release** workflow (version bump, build files, language
     files).
   * [ ] Mark the **draft** PR as ready for review for the tests to run.
   * [ ] Ensure **tests pass**.
   * [ ] If any tests fail, diagnose and fix (in the test suite, or by updating
     and tagging a new module release for flaky or broken tests that weren't
     caught earlier).

3. **Release candidate and QA**
   * [ ] Share release candidate for QA.
   * [ ] Allow QA time to test (ideally a week).
   * [ ] Create a change request for this release (Change Management in Newfold's
     ServiceNow portal).
   * [ ] Address QA tickets.

4. **Build and publish**
   * [ ] Get required approvals on the release candidate PR.
   * [ ] Merge the release candidate PR to `main`.
   * [ ] Tag a GitHub release (use the "Generate release notes" button).
   * [ ] Wait for and watch the **release workflow** to produce the package (it
     does not push to customers).
   * [ ] **Manually test** the built package on a live site, verify no fatal
     issues or missing files.
   * [ ] **Manually upload** the release zip (from the GitHub release assets) to
     the **prod free** R2 bucket (Newfold WP team Cloudflare account). Ask team
     leads for access if needed.
   * [ ] Confirm the release is available at the release endpoint
     (`https://hiive.cloud/workers/release-api/plugins/newfold-labs/...`).

5. **Cleanup and housekeeping**
   * [ ] Merge `main` into `develop` to ensure all release changes are reflected
     there.
   * [ ] Close the release in Jira: update ticket status to closed or move any
     incomplete tickets to the next release.
   * [ ] Mark the change request as complete (ServiceNow).
   * [ ] Post the release in our Teams **Product Delivery** channel.

## Summary flow

1. **Planning:** Tickets have Fix Version set to the upcoming Jira release;
   module work is merged and tagged.
2. **Prepare:** Week before (or ad hoc for out-of-cycle), run the Prepare Release
   workflow from `develop` (or `main` for hotfixes). Mark draft PR ready for
   review, ensure tests pass.
3. **QA:** Share release candidate, create change request, allow QA time (ideally
   a week), address QA tickets.
4. **Release:** Get approvals, merge RC PR to `main`, tag GitHub release, run
   release workflow, manually test the package, upload zip to prod free R2
   bucket, confirm availability at the release endpoint.
5. **Cleanup:** Merge `main` into `develop`, close Jira release, complete change
   request, post in Teams Product Delivery channel.
