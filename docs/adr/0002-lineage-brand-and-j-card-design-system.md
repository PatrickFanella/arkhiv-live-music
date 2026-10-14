# ADR 0002: Name the site Lineage and adopt the J-Card design system

## Status

Accepted (October 14, 2026)

## Context

The consumer shipped as "Arkhiv · Live Music" with a functional scaffold and no
selected visual system. Sibling Arkhiv consumers each carry their own product
name and design (Anarchist Archive; Riot Grrrl Zine Archive with its Cut & Paste
design). "Live Music Archive" is the Internet Archive's own name for the etree
collection and cannot serve as this product's name without implying that this
site is that collection. The frontend owns its composition and design; the
shared kit supplies behavior only.

## Decision

- **Name:** Lineage. In taper culture, lineage is the recorded chain from the
  microphone or soundboard to the file you play. The product's distinguishing
  feature is that it keeps source metadata, normalization, corrections and
  editorial history visible, so the name describes the product rather than
  decorating it. The descriptor "live recordings" follows the wordmark.
- **Tagline:** "Live recordings, with their lineage."
- **Design system:** J-Card, named after cassette inserts. Cream paper and ink,
  a red marker accent for actions and counters, a three-color spine stripe
  (red, mustard, teal) as the single decorative motif, monospace for labels,
  dates and track numbers, and a dark "after hours" scheme that follows the
  operating system preference. Fonts are system stacks; no web fonts load.
- Tokens are declared once in `web/src/styles.css` under Tailwind's `@theme`
  so utilities and component rules share them. Copy constants live in
  `web/src/brand.ts`. The reference is `docs/reference/brand.md`.

Alternatives considered: "Soundboard" (generic, and names one source type over
audience recordings), "Tapeshelf" (describes the list view, not the product)
and keeping "Arkhiv Live Music" (names the engine, not the product).

## Consequences

- The repository, package name and Compose project name still say
  `arkhiv-live-music`. Renaming them is a separate operational change.
- The Internet Archive's collection is always credited as the source and
  linked from the masthead and footer; the name Lineage never replaces it.
- Future components must use the tokens rather than literal colors. New
  decoration beyond the stripe needs a documented reason.
- The kit's hooks and request helpers remain the behavior layer; this
  decision changes presentation and copy only.
