# Lineage brand and J-Card design system

Decision record: [ADR 0002](../adr/0002-lineage-brand-and-j-card-design-system.md).
Source of truth for tokens: `web/src/styles.css` (`@theme` block). Copy
constants: `web/src/brand.ts`. Favicon: `web/public/favicon.svg`.

## Name and voice

| Item | Value |
|---|---|
| Product name | Lineage |
| Wordmark | `LINEAGE` in monospace, 0.22em tracking, followed by `live recordings` |
| Tagline | Live recordings, with their lineage. |
| Source credit | Internet Archive's Live Music Archive, linked in masthead and footer |
| Built on | Arkhiv (engine) and `@subcult/archive-viewer` (kit) |

Write like a tape-trade list: short, factual, specific. Name the venue, the
date, the source chain. Never promise availability the source does not
guarantee; counts are observations. Eyebrow labels use sentence case in the
markup and are uppercased by CSS. Use "recording" for an item, "track" for a
file, "taper" for the person, "source" for the chain.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--color-paper` | `#f4efe4` | `#15130f` | page background |
| `--color-paper-deep` | `#eae3d2` | `#1f1c17` | cards, hover rows, notes |
| `--color-paper-raised` | `#fbf8f1` | `#26221c` | inputs, secondary buttons |
| `--color-ink` | `#1c1915` | `#efe8d8` | text, strong rules, player bar |
| `--color-ink-soft` | `#5b544a` | `#b3a892` | secondary text, labels |
| `--color-ink-faint` | `#8d8371` | `#7f7563` | placeholders |
| `--color-rule` | `#cfc6b2` | `#3a3528` | hairlines |
| `--color-rule-strong` | `#8d8371` | `#6b6251` | input borders, dashed rules |
| `--color-marker` | `#c43a24` | `#e0573f` | primary action, counters, alerts |
| `--color-marker-deep` | `#a12d1a` | `#c43a24` | primary hover |
| `--color-on-marker` | `#fbf8f1` | `#15130f` | text on marker |
| `--color-stripe-red/mustard/teal` | `#c43a24` / `#e0a52d` / `#2f6b8f` | same | spine stripe only |
| `--color-focus` | `#2f6b8f` | `#6fb0d1` | focus ring |

The dark scheme follows `prefers-color-scheme`; there is no in-app toggle.
WCAG contrast computed from the hex values above (light / dark): ink on paper
15.3 / 15.2, ink-soft on paper 6.5 / 7.9, on-marker on marker 5.0 / 5.0, marker on
paper 4.6 / 5.0. `--color-ink-faint` on raised paper is 3.5 and is used for
placeholders only.

## Type

| Token | Stack | Use |
|---|---|---|
| `--font-sans` | Helvetica Neue, Helvetica, Arial, Liberation Sans | body, headings |
| `--font-mono` | IBM Plex Mono, SFMono-Regular, Cascadia Mono, Menlo, Consolas, Liberation Mono | wordmark, eyebrows, labels, dates, counters, status |

No web fonts are loaded. Headline: 700 weight, tight leading, negative
tracking, maximum 28 characters per line. Labels: 0.72rem, uppercase,
0.08–0.14em tracking.

## Density

Lineage is laid out like a music player: dense rows, small controls and short
vertical gaps. The root size is 93.75% of the reader's own default, so zoom and
text-size settings still apply. Buttons and fields are about 2.1rem tall with a
fine pointer and 2.75rem on touch screens.

## Components

- **Stripes:** 6px three-color bar at the top of the page, the left edge of
  the recording panel and the top of the player. Do not use it elsewhere.
- **Layout:** masthead, page and footer share one content column
  (`min(1440px, 100% - 2 × gutter)`), so their left and right edges align.
- **Navigation:** laid out like a music player. From 1024px wide the masthead is
  a fixed sidebar: wordmark, the five views (Browse recordings, Search
  recordings, Explore the collection, Concert calendar, On this day) with stroke
  icons, the eight artists with the most recordings, and the source credit at
  the foot. The current view is ink-filled. Between 651px and 1023px it is a
  top bar whose navigation wraps to its own row and scrolls sideways. At 650px
  and below the views become a fixed tab bar with icons and short labels
  (Browse, Search, Explore, Calendar, On this day); the full label stays the
  link's accessible name. The player keeps clear of both.
- **Search card:** `paper-deep` surface, primary `Find shows` button, dashed
  rule above the filter disclosure. The disclosure opens when a filter it
  holds is applied. Outside the home view the card is compact.
- **On this day row:** on the unfiltered home view, between the search card and
  the collection directory, a horizontally scrolling row of square covers for
  recordings made on today's month and day, one per artist, newest first (up to
  ten), with the total and a **See all** link to the On this day view. A card
  opens the recording panel. The row needs the source-discovery module and is
  left out when the read fails or finds nothing.
- **Generated covers:** when a recording has no artwork and its artist no
  image, a J-card cover stands in: the stripe across the top, the date in
  monospace and the artist in bold. Its tone (marker, mustard, teal, ink,
  deep paper or deep marker, each with text at 4.5:1 or better) comes from the
  artist's name, so an artist always gets the same card. Covers 72px and
  smaller show only the artist's first letter or digit, skipping a leading
  "The".
- **Collection directory:** separate `paper-raised` disclosure below the
  search card, open on the unfiltered home view below 1024px (wider windows
  list the top artists in the sidebar, so it starts closed there). It previews 12
  suggestions, or 6 at the 480px single-column breakpoint.
- **Tape shelf:** heading with monospace count and share link, removable
  filter chips below, then a 2px ink rule, hairline rows, red monospace
  counter, monospace date on the right, arrow nudges on hover. When the list
  is at least 860px wide each row is one line, with artist, title and place as
  columns and long text cut short (the title keeps a tooltip). Narrower lists
  stack them, and on small screens the date moves under the place line.
  Above the rows, **Filter this page** narrows the loaded page (every word must
  match the artist, recording, venue, place or date; case and accents are
  ignored), and the column headings sort it: first click ascending (dates
  newest first), second reversed, third back to catalog order. Row numbers keep
  their catalog position. **Order** sorts the whole catalog through the
  engine: catalog order, or newest first, which leaves out recordings without
  a complete date. The deployed engine offers no other catalog-wide order.
- **Footer:** credits left, monospace import status right. Zero counts are
  omitted.
- **Recording panel:** right-side dialog with the stripe on its left edge and
  a sticky header holding the label and close button;
  definition list with uppercase monospace terms; track list with red
  monospace index and monospace length.
- **Player:** fixed ink bar with stripe on top, outlined paper buttons.
- **Buttons:** `primary` is marker-filled; default is paper with ink border and
  inverts on hover; `quiet` has no border.
- **Notices and alerts:** `paper-deep` block with a 4px marker left edge.

Focus rings are 3px `--color-focus` with 3px offset on every interactive
element. Transitions are disabled under `prefers-reduced-motion`.

## Assets

`web/public/favicon.svg` is the mark: three stripes and a short ink line on
paper. There is no raster logo yet; export one from the SVG if a platform
needs it.
