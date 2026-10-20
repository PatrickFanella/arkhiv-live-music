# Lineage

Live recordings, with their lineage. A Live Music Archive consumer with a shared Arkhiv backend and an independent
React frontend built with `@subcult/archive-viewer`. Metadata always lives in
Arkhiv's PostgreSQL database. Audio may stream from the source or be preserved
through Arkhiv's separate reviewed acquisition workflow.

This repository owns frontend composition, configuration and dependency pins.
It owns no backend fork, metadata importer or database schema. Backend fixes and
features are implemented in [Arkhiv](https://git.subcult.tv/subculture-collective/arkhiv)
and reach this app through the same release-upgrade workflow as its siblings.
Viewer and engine upgrades remain separate. The product is named Lineage and
uses the J-Card design system described in `docs/reference/brand.md`; the
repository, package and Compose project keep the `arkhiv-live-music` name.

## Shared releases

The published viewer pin is 0.4.3 and the engine receipt pins core 0.4.3, including
the source metadata catalog, batch playback reviews and nested audio support from
[Arkhiv PR 129](https://git.subcult.tv/subculture-collective/arkhiv/pulls/129).
The engine image uses an immutable registry digest. The viewer retains its
core 0.3.0 API compatibility receipt; core 0.4.3 preserves those API contracts
and migration checksums. Core 0.4.3 adds `source_artist_photos` module 1, the artist
photograph list used by the directory, recording rows and player.

The frontend requires `source_catalog` and `source_discovery` module 1 and checks `/api/version` before
loading its catalog. `make verify` validates code, configuration and pin provenance;
it rejects engine receipts that lack the required modules.

## Run the app

Requires Docker and pnpm 10.33.0 for frontend development. Copy `.env.example`
to `.env` and choose unused local ports and credentials.

```bash
docker compose --env-file .env --env-file deploy/archive-core.env up --build
```

This uses the published Arkhiv core. Initialization applies Arkhiv migrations
and selects the etree collection. The metadata worker repeatedly
runs bounded cursor discovery and full-metadata imports. A complete collection
import can take days; counts and incomplete discovery remain visible. It never
acquires audio. The web app defaults to http://localhost:5173.

For frontend development, run `pnpm --dir web dev`. Vite proxies `/api` to port
8080 by default; set `API_PROXY=http://127.0.0.1:YOUR_API_PORT` if needed.
After a kit upgrade, restart Vite with `pnpm --dir web dev --force` to refresh
its dependency cache.

For shared-engine development, set `ARKHIV_CORE_SOURCE` to an Arkhiv checkout
and build its actual core with the optional override:

```bash
docker compose --env-file .env --env-file deploy/archive-core.env \
  -f docker-compose.yml -f docker-compose.core-dev.yml up --build
```

## Metadata and media

Arkhiv retains exact source response bytes, parsed metadata, SHA-256 identities,
every file entry, observations, normalized fields and editorial history.
Normalization cleans whitespace, converts HTML notes to searchable text, validates
dates and may derive a missing venue from a source title. Inferences stay labeled.
Corrections override source fields and survive re-imports; a null correction
restores the source value. No set boundaries or source classification are guessed.

The local index searches artists, titles, venues, places, source credits, notes,
lineage, subjects and track titles. Filters include year, artist, venue, date range
and source availability. The frontend offers counted artist, venue and year
suggestion directories, decade shortcuts, removable applied filters, shareable
search URLs and browser back/forward navigation. Recording details link to related
artists, venues, dates and place searches. Directories reflect the service's limited
facet suggestions, not an exhaustive artist or venue inventory. Tour mentions,
places, songs and credits use the metadata text search; tours are not structured
entities. No map or geocoding is included.

Cursor discovery covers the full collection beyond the
Archive search result ceiling. Browsing and details use the database without
contacting the provider. Refresh/reconciliation is an explicit operator command.

Importing metadata grants no media permission. A separate source-audio review maps
supported public files to Arkhiv's typed audio representation and resolver.
Changed source snapshots and withdrawals invalidate stale playback reviews. The
kit validates resolved URLs and manages audio state, volume and completion; this
frontend owns track selection and layout. Source failures remain visible and may
be retried manually. Playback is track-based; gapless playback is unverified.

Safe nested audio paths are supported by the shared engine and kit updates.
MPEG4 concert recordings can supply an audio-playback fallback when audio-only
files are absent. Restricted, missing or unsupported files remain searchable;
approvals describe source permissions rather than guaranteed CDN availability
or browser codec decoding. Scheduled radio and calendar views have
not been added to this frontend.

`COLLECTION_POLICY=source_stream` is the default. Local preservation requires
explicit initial collection policy, byte budget and reserve, then the existing
Arkhiv manifest, integrity and recovery workflow. The metadata worker is identical
in both modes. Existing collection policy cannot be switched implicitly.

## Artwork and artist images

Recording details and the player select public cover art or photographs from the
retained file inventory. Named cover art takes priority. Private files, automatic
item thumbnails, spectrograms and recognizable waveform derivatives are excluded.
Artwork loads directly from Internet Archive; missing or failed images fall back
to a curated artist image, then a placeholder. The catalog rows and artist directory
use artist images without fetching a separate recording detail for each row.

`web/src/artist-images.ts` holds curated image references separately from source
metadata. The starter registry includes Ween and Billy Strings photographs and
Phil Lesh and Grateful Dead logos. Each entry records its exact artist name,
confirmed aliases, image type, source, credit, rights note and verification date.
Inspect an image and its source before adding an entry; do not match artists by
substring or treat an artist photo as a recording cover. Source links appear on
the detail image. This registry does not establish a reuse license for the images.
No image binaries or audio are stored in this repository.

## Operator commands

The metadata worker resumes cursor discovery and imports 100 records per bounded
run, with a one-second request delay and provider backoff. It pauses below a
20 GiB free-space reserve on its storage filesystem. Keep the database on durable
storage and monitor its size; a complete import can take several days. Worker
logs are rotated. Source bytes and all unknown file entries remain in PostgreSQL.

For continuous private playback coverage, set `PLAYBACK_REVIEW_NOTES` in `.env`
to record the owner's approval, then enable the independent reviewer:

```bash
docker compose --env-file .env --env-file deploy/archive-core.env \
  --profile playback up --build -d
```

The reviewer approves supported public source files in batches of 100, without
fetching media. It skips completed snapshots and records unsupported, held and
retryable outcomes. It cannot overwrite a separate operator approval or revocation.
Changed snapshots require a new bound review; only an unchanged batch-owned
decision can be renewed automatically. The UI refreshes import and playback
approval counts every 30 seconds while visible. This grants no public publication,
downloads, acquisition, relay or scheduling permission.

Stop the `metadata-worker` or `playback-reviewer` service to pause its work;
restarting resumes from PostgreSQL. Do not reset the database to restart discovery.

Put saved metadata, corrections or manifests under `IMPORT_ROOT`. The operator
profile mounts those inputs at `/imports`. During development, include the same
`--env-file` and `-f` options shown above in these commands:

```bash
docker compose --profile operator run --rm operator \
  import-source-catalog --collection etree --id SOURCE_ID --file /imports/metadata.json

docker compose --profile operator run --rm operator \
  edit-source-catalog --collection etree --id SOURCE_ID --file /imports/correction.json \
  --notes 'Venue confirmed from taper notes.'

docker compose --profile operator run --rm operator \
  review-source-audio --collection etree --id SOURCE_ID --notes 'Private source playback review.'

docker compose --profile operator run --rm operator \
  refresh-catalog --collection etree --pages 1 --items 25
```

Public source-inventory serving is not enabled. This configuration serves a private
catalog preview; public catalog and transport reviews use Arkhiv's existing controls.
No full collection coverage or public deployment is claimed by the small live sample.

## Verification and updates

```bash
make verify
make compose-build
```

Consumer verification covers TypeScript, lint, tests, production build, Compose,
Open Pilot templates and matching shared dependency receipts. Arkhiv owns backend
and database verification. Its source-catalog tests cover raw retention, corrections,
re-imports, refresh, search/filtering, pagination, scope, playback review isolation,
withdrawals, metadata-only requests and migrations.

`deploy/core-release.json`, `deploy/archive-core.env` and
`deploy/viewer-release.json` are the standard consumer upgrade targets. Arkhiv's
registry records independent engine and viewer lanes. Reviewed upgrade proposals
update compatible pins alongside the siblings while leaving this app's design
and deployment timing independent.

GPL-3.0-only applies to the software. Recording terms remain with their sources.

## Artist pages, calendar and On this day

Artist pages pair retained recordings with independently cached, attributed
MusicBrainz/Wikipedia information and photographs. The historical concert calendar
supports one year, a year range, or all years. On this day lists a chosen month/day
across years. Dates and filters are shareable through the existing root URL.

These views use Arkhiv `source_discovery` module 1, supplied by the pinned core
0.4.3 release. The capability guard still reports an outdated runtime rather than
letting it silently ignore date filters. See [feature behavior and qualification](docs/reference/artist-and-date-discovery.md)
for behavior and verification. Provider matching and fetching belong to the engine's
operator workflow, with no provider requests during public page reads.

## Public address

The public address is https://lineage.subcult.tv/. Canonical metadata, Open Graph
URL, sitemap and robots discovery use this address.
