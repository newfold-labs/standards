---
layout: default
title: Newfold Labs Standards
---

# Newfold Labs Standards

How we build software at Newfold Labs.

Standards are filed by how wide their blast radius is: **general** ones hold
everywhere, **platform** ones bind a technology, **artifact** ones bind a kind
of thing we ship, and **process** covers how we work together. Every document
carries an id that checks and AI answers cite, so a failed check points at the
exact standard behind it.

This index is generated from front matter. Nothing below is hand-maintained.

{% for s in site.sections %}
{%- assign docs = site.pages
      | where: "section", s.key
      | where_exp: "d", "d.status != 'deprecated' and d.status != 'superseded'"
      | sort: "order" -%}
{%- if docs.size > 0 %}
## {{ s.title }}

{{ s.blurb }}

{%- assign groups = docs | map: "group" | compact | uniq -%}
{%- if groups.size == 0 %}

{% for doc in docs -%}
- [{{ doc.title }}]({{ doc.url | relative_url }}) &mdash; {{ doc.summary }}
{% endfor -%}
{%- else -%}
{%- for g in groups %}

### {{ g }}

{% assign in_group = docs | where: "group", g -%}
{% for doc in in_group -%}
- [{{ doc.title }}]({{ doc.url | relative_url }}) &mdash; {{ doc.summary }}
{% endfor -%}
{%- endfor -%}
{%- endif -%}
{%- endif -%}
{% endfor %}

## By artifact type

The whole point of tagging every document with `applies_to` is being able to
pull just the standards that bind one kind of repository. Documents marked
`any` apply to all of them and are listed under each.

{% for type in site.artifact_types %}
### {{ type.title }}
{% for s in site.sections %}
{%- assign matching = site.pages
      | where: "section", s.key
      | where_exp: "d", "d.status != 'deprecated' and d.status != 'superseded'"
      | where_exp: "d", "d.applies_to contains type.key or d.applies_to contains 'any'"
      | sort: "order" -%}
{%- if matching.size > 0 %}
{{ s.title }}:

{% for doc in matching -%}
- [{{ doc.title }}]({{ doc.url | relative_url }})
{% endfor -%}
{%- endif -%}
{% endfor %}
{% endfor %}
