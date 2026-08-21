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

{%- assign live = site.pages
      | where_exp: "d", "d.id"
      | where_exp: "d", "d.status != 'deprecated' and d.status != 'superseded'" -%}

<a class="atlas-cta" href="{{ '/atlas.html' | relative_url }}">
  <span class="atlas-cta__icon" aria-hidden="true">
    <svg viewBox="0 0 16 16" width="18" height="18" focusable="false"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.25"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1.25"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1.25"/><rect x="9" y="9" width="5.5" height="5.5" rx="1.25"/></svg>
  </span>
  <span class="atlas-cta__text">
    <b>Open the atlas</b>
    Browse all {{ live.size }} standards a folder at a time, and see what links to what.
  </span>
  <span class="atlas-cta__go" aria-hidden="true">
    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L11.19 8.75H2.75a.75.75 0 0 1 0-1.5h8.44L8.22 4.03a.75.75 0 0 1 0-1.06Z"/></svg>
  </span>
</a>

{%- assign board = site.data.scorecard -%}
{%- if board -%}
<a class="atlas-cta" href="{{ '/scorecard.html' | relative_url }}">
  <span class="atlas-cta__icon" aria-hidden="true">
    <svg viewBox="0 0 16 16" width="18" height="18" focusable="false"><path d="M8 1a7 7 0 0 1 6.06 10.512.75.75 0 0 1-1.298-.75A5.5 5.5 0 1 0 3.238 10.76a.75.75 0 1 1-1.298.752A7 7 0 0 1 8 1Zm2.72 3.72a.75.75 0 0 1 1.133.977l-2.09 3.04a1.75 1.75 0 1 1-1.17-1.17l2.09-3.04a.784.784 0 0 1 .037-.043ZM8 8.75a.25.25 0 1 0 0 .5.25.25 0 0 0 0-.5Z"/></svg>
  </span>
  <span class="atlas-cta__text">
    <b>Open the scorecard</b>
    See where all {{ board.summary.repos }} repositories sit against these standards, and which checks each one can run.
  </span>
  <span class="atlas-cta__go" aria-hidden="true">
    <svg viewBox="0 0 16 16" width="14" height="14" focusable="false"><path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L11.19 8.75H2.75a.75.75 0 0 1 0-1.5h8.44L8.22 4.03a.75.75 0 0 1 0-1.06Z"/></svg>
  </span>
</a>
{%- endif -%}

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
