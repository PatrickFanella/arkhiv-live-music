# Arkhiv Live Music

A Live Music Archive consumer with a shared Arkhiv backend and an independent
React frontend built with `@subcult/archive-viewer`. Metadata always lives in
Arkhiv's PostgreSQL database. Audio may stream from the source or be preserved
through Arkhiv's separate reviewed acquisition workflow.

This repository owns frontend composition, configuration and dependency pins.
It owns no backend fork, metadata importer or database schema. Backend fixes and
features are implemented in [Arkhiv](https://git.subcult.tv/subculture-collective/arkhiv)
and reach this app through the same release-upgrade workflow as its siblings.
Viewer and engine upgrades remain separate. The visual design system has not
been selected; the current interface is a functional scaffold.

## Current release boundary

The published viewer pin is 0.4.2 and the retained engine receipt is core 0.3.0.
The source metadata catalog is prepared for the next shared core release, 0.4.0,
in [Arkhiv PR 126](https://git.subcult.tv/subculture-collective/arkhiv/pulls/126).
Until that release is published and this app adopts its immutable digest, use
the development override against Arkhiv's `feat/etree-metadata-catalog` checkout.
The published 0.3.0 image alone cannot run the new metadata workflow.

The frontend requires `source_catalog` module 1 and checks `/api/version` before
loading its catalog. `make verify` validates code, configuration and pin provenance;
it does not claim that the retained published image contains the new module.

## Run the shared development engine

Requires Docker, an Arkhiv checkout containing the source-catalog changes, and
pnpm 10.33.0 for frontend development. Copy `.env.example` to `.env` and choose
unused local ports and credentials. Set `ARKHIV_CORE_SOURCE` to that checkout.

```bash
docker compose --env-file .env --env-file deploy/archive-core.env \
  -f docker-compose.yml -f docker-compose.core-dev.yml up --build
```

This builds the actual Arkhiv core from its repository. Initialization applies
Arkhiv migrations and selects the etree collection. The metadata worker repeatedly
runs bounded cursor discovery and full-metadata imports. A complete collection
import can take days; counts and incomplete discovery remain visible. It never
acquires audio. The web app defaults to http://localhost:5173.

For frontend development, run `pnpm --dir web dev`. Vite proxies `/api` to port
8080 by default; set `API_PROXY=http://127.0.0.1:YOUR_API_PORT` if needed.

Once the new shared engine release is adopted, omit the development override:

```bash
docker compose --env-file .env --env-file deploy/archive-core.env up --build
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
and source availability. Cursor discovery covers the full collection beyond the
Archive search result ceiling. Browsing and details use the database without
contacting the provider. Refresh/reconciliation is an explicit operator command.

Importing metadata grants no media permission. A separate source-audio review maps
supported public files to Arkhiv's typed audio representation and resolver.
Changed source snapshots and withdrawals invalidate stale playback reviews. The
kit validates resolved URLs and manages audio state, volume and completion; this
frontend owns track selection and layout. Source failures remain visible and may
be retried manually. Playback is track-based; gapless playback is unverified.

Nested source file paths remain in metadata but are unsupported by the engine's
current representation file contract. Records with those paths, missing files or
unreviewed playback remain searchable. Scheduled radio and calendar views have
not been added to this frontend.

`COLLECTION_POLICY=source_stream` is the default. Local preservation requires
explicit initial collection policy, byte budget and reserve, then the existing
Arkhiv manifest, integrity and recovery workflow. The metadata worker is identical
in both modes. Existing collection policy cannot be switched implicitly.

## Operator commands

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
