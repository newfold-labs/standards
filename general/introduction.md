---
id: general-introduction
title: Introduction
summary: Who we are, why these standards exist, and how they are organised
status: active
applies_to: [any]
tags: [introduction, culture]
related: [general-philosophy, meta-contributing]
order: 10
enforceable: false
---

Newfold Labs is an interdisciplinary product and engineering team at Newfold
Digital creating next-generation solutions that support our customers and our
business.

We believe in blending cutting-edge and long-proven technologies to pragmatically
build innovative solutions for businesses of all sizes, while supporting the
WordPress project and the open web.

## How we work

This public, living document set expresses our coding standards, workflows and
values. As a distributed team, this is an essential way of building our team
culture and expectations.

## The "why"

Rules should have reasons and standards should have strategy that drives them.

Our best practices and standards aim to unlock three big efficiencies:

1. **Uniform directory structure and naming practices** that, once learned, make
   navigating codebases easier and more intuitive.
2. **Fewer bespoke decisions.** By curating new information and abiding by
   standards, we can focus energy on building solutions and not foundations.
3. **Shared templates and tooling** to replicate our best practices and recipes
   for success.

On the other side of the coin, our standards are meant to protect us:

1. **Our codebases run in a wide variety of browsers and environments, in
   millions of configurations and alongside a million variations of other
   software.** Our code has to be more than enterprise-grade, it has to be
   incredibly defensive, considerate and accommodating of the millions of
   configurations possible with WordPress. We never want to break or burden our
   customers' sites, our partners' services or our peers' software.
2. **There are real-world consequences for the online behavior of our software.**
   We painstakingly consider potential impacts to our customers' experience,
   time, reputation, safety, profitability and success. Our software also can
   have dramatic impact on our colleagues in support and professional services;
   we always strive to make it positive.
3. **Being thoughtful about software implementation can save us from burdensome
   maintenance, issue diagnostics and bug patching.** No software is perfect, but
   asking questions, requesting changes on PRs and thinking not only about how we
   want our software to be used, but how it could potentially be abused, makes
   our software better.

Our standards aren't here just for the sake of having them.

And they're not cast in stone.

If a standard is dated or delinquent in addressing a use case, please make an
informed and pragmatic choice on how it should be updated or if special use cases
should be excused. Then document the reasoning and, if necessary, propose the
change. The [contribution process](../meta/contributing.md) covers how.

## How the standards are organised

Standards are filed by how wide their blast radius is. A document lives in
exactly one tier, and its front matter records which artifact types it binds.

| Tier | What it covers |
| --- | --- |
| General | Holds regardless of platform or artifact type: naming, git, testing, releases, frontend, philosophy. |
| Platform | Binds a specific technology across everything we build on it. Today that is WordPress. |
| Artifacts | Binds a specific kind of thing we ship: a plugin, a theme, a module, a worker. |
| Process | How we work together. Coordination and judgement, not lintable rules. |
| Meta | How this repository itself works: the schema, the contribution process, lifecycle. |

We historically split standards into "WordPress" and "non-WordPress" buckets.
That distinction is now expressed more precisely: WordPress-specific expectations
live under Platform, and the general standards apply to everything, including the
Laravel, Gatsby, node, bash and serverless code we maintain.

In WordPress codebases we mostly follow "The WordPress Way" through the WordPress
Coding Standards and Gutenberg project rulesets, with a few exceptions and
additional expectations for our own projects. This reduces context-switching,
increases our ability to hire engineers familiar with WordPress' standards, and
leans on practices and code proven to work in WordPress over time and scale.

## Reading the metadata

Every document carries front matter: a stable `id`, the artifact types it
`applies_to`, a lifecycle `status`, and whether it is `enforceable`. The
`enforceable` flag is the honest dividing line. You can lint a naming
convention. You cannot lint "ask your team lead for access", which is why
process content has its own tier rather than being filed alongside standards
that a check can score you against.

Ids are the contract. A failed check or an AI answer cites the id of the standard
behind it, so ids do not change once published. See
[the front matter schema](../meta/frontmatter-schema.md) and
[lifecycle](../meta/lifecycle.md).
