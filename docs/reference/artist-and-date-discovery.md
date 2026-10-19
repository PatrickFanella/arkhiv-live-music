# Artist pages and historical date browsing

Lineage has artist pages with cached MusicBrainz facts, a sourced Wikipedia
introduction, an attributed photograph and the artist's recordings. The concert
calendar supports a single year, an inclusive year range, or all years. A single
year uses weekday columns. Ranges and all years group dates by day of the month.
Counts describe recordings; multiple recordings may document one concert.

On this day starts with the visitor's local month and day. Another month/day can
be selected, including February 29. Results are grouped newest year first with
keyset pagination. Incomplete or invalid source dates do not enter the calendar
or anniversary list. Existing recording playback uses the shared resolver.

All views retain their artist, month/day, year range and cursor in URL queries.
Artist pages reuse the existing artist query, so deployed root routing and
historical recording links remain compatible. Exclusions apply to artist counts,
calendar counts and recording results. Selecting a calendar day preserves the
artist and selected year range.

## Engine and provider ownership

The shared Arkhiv engine owns `source_discovery` module 1, the read APIs, artist
profiles and exact retained provider responses. Artist identity is an explicitly
reviewed MusicBrainz ID bound to a source artist name. No provider search or
metadata fetching runs when a visitor opens a page. An unlinked artist still
has its recordings and a clear missing-biography state.

MusicBrainz provides identity and structured facts. Verified MusicBrainz links
lead to Wikidata and the corresponding English Wikipedia page. Wikimedia Commons
image metadata supplies credits and a license. A photo without attribution is
omitted. Existing curated photographs remain independent in `artist-images.ts`.

The operator helper caches metadata for seven days, serializes outbound requests,
uses an identifying User-Agent, and preserves provider cooldowns. It retains raw
JSON bytes with timestamps. It never fetches recording audio or image binaries.
Enrichment does not overwrite source recording metadata or editorial corrections.

## Compatibility and review

The consumer keeps its published core/viewer pins. The new views check
`source_discovery` capability and show an update notice on older cores, instead
of sending filters an old engine might ignore. Normal browsing remains usable.
Use the development-core Compose override with the canonical Arkhiv feature
checkout to qualify both sides. A published core release, matching receipt and
reviewed consumer adoption are required before deploying these views normally.

Verification: consumer `make verify`; shared-engine `make verify` with a
disposable PostgreSQL database; provider-helper fixture tests; browser checks of
artist attribution, year modes, date selection, back navigation and narrow layout.
Provider response bundles, database state and build artifacts remain outside Git.

Sources: [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API),
[rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting),
[Wikimedia REST API](https://www.mediawiki.org/wiki/Wikimedia_REST_API).
