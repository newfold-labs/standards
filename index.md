---
layout: default
title: Newfold Labs Standards
---

# Standards

<p class="lede">
How we build software at Newfold Labs. Standards are filed by how wide their
blast radius is, and every document carries a stable id that checks and AI
answers cite, so a failure points at the exact standard behind it.
</p>

This index and the navigation are generated from document metadata. Nothing on
this page is hand-maintained.

{% for s in site.sections %}
{%- assign docs = site.pages
      | where: "section", s.key
      | where_exp: "d", "d.status != 'deprecated' and d.status != 'superseded'"
      | sort: "order" -%}
{%- if docs.size > 0 %}
## {{ s.title }}

{{ s.blurb }}

{%- assign groups = s.groups | default: nil -%}
{%- unless groups -%}{%- assign groups = docs | map: "group" | compact | uniq -%}{%- endunless -%}
{%- if groups.size == 0 %}

<ul class="card-grid">
{%- for doc in docs %}
  <li class="card">
    <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
    <p>{{ doc.summary }}</p>
  </li>
{%- endfor %}
</ul>
{%- else -%}
{%- for g in groups %}
{%- assign in_group = docs | where: "group", g -%}
{%- if in_group.size > 0 %}

### {{ g }}

<ul class="card-grid">
{%- for doc in in_group %}
  <li class="card">
    <a href="{{ doc.url | relative_url }}">{{ doc.title }}</a>
    <p>{{ doc.summary }}</p>
  </li>
{%- endfor %}
</ul>
{%- endif -%}
{%- endfor -%}
{%- endif -%}
{%- endif -%}
{% endfor %}

## By artifact type

Tagging every document with `applies_to` is what makes it possible to pull just
the standards binding one kind of repository. Documents marked `any` apply to all
of them and are listed under each.

{% for type in site.artifact_types %}
### {{ type.title }}
{% for s in site.sections %}
{%- assign matching = site.pages
      | where: "section", s.key
      | where_exp: "d", "d.status != 'deprecated' and d.status != 'superseded'"
      | where_exp: "d", "d.applies_to contains type.key or d.applies_to contains 'any'"
      | sort: "order" -%}
{%- if matching.size > 0 %}
**{{ s.title }}** &mdash;
{% for doc in matching -%}
[{{ doc.title }}]({{ doc.url | relative_url }}){% unless forloop.last %}, {% endunless %}
{%- endfor %}
{% endif -%}
{% endfor %}
{% endfor %}
