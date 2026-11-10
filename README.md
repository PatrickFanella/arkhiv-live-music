# Lineage

![Lineage identity](docs/brand/lineage/readme-lockup.png)

Live recordings, with their lineage. Lineage is a browser for the Live Music Archive at Internet Archive (the `etree` collection): find a show by artist, venue or date, read who taped it and how the copy came down to you, and play the reviewed tracks.

This repository is the Lineage web app and its deployment configuration. The catalog, search API and metadata importer come from SUBCULT's shared archive engine, which runs as a pinned container image. The repository, package and Compose project still use the name `arkhiv-live-music`.

Public site: https://lineage.subcult.tv/

## Features

- Search across artists, titles, venues, places, source credits, notes, lineage, subjects and track titles.
- Filter by year, date range, artist, venue and source availability. Filters, searches and the open recording are kept in the URL, so you can share them and use Back and Forward.
- Browse counted artist, venue and year directories, with decade shortcuts.
- A recordings table you can sort and filter, in a compact one-line layout.
- Recording pages with notes, set lists, source, taper credits and lineage, and links to related artists, venues, dates and places.
- Artist pages with the artist's recordings, attributed MusicBrainz and Wikipedia text, and photographs.
- A concert calendar for one year, a range of years or all years, and an "On this day" view for any month and day.
- Cover art chosen from the recording's own public files, then a curated artist image, then a generated J-card cover.
- Track-by-track playback, streamed from the source, with a choice of player position (bottom, top, floating, left or right sidebar) that changes without stopping the audio. Phones get a mini bar, a full-screen player and lock-screen controls.

Limits: playback is track-based and gapless playback is not supported. There is no map. Tours are not separate entities, so tour names are found through text search. An item in the catalog is not always playable: only source files that pass the engine's playback review can be played, and source outages are shown, not hidden.

## How it works

The archive engine imports metadata from the Live Music Archive in small, resumable batches and stores it in PostgreSQL: the raw source response, parsed fields, every file entry and any editorial corrections. Corrections survive re-imports. Browsing and search read from the database and do not contact Internet Archive. Audio and cover art load directly from Internet Archive in the browser.

Importing metadata does not grant permission to play a file. A separate playback review marks which public audio files can be streamed. A changed or withdrawn source invalidates its earlier review.

## Quick start

Requirements: Docker with Compose, and pnpm 10.33.0 with Node.js 22 or later for frontend work.

```bash
cp .env.example .env    # then choose free local ports and a local database password
docker compose --env-file .env --env-file deploy/archive-core.env up --build
```

This starts PostgreSQL, applies the engine's migrations, selects the `etree` collection, starts the API and a metadata worker, and serves the web app at http://localhost:5173 (or your `WEB_PORT`). The worker imports 100 records per run with a one-second request delay and pauses when its disk has less than 20 GiB free. A full collection import can take several days. It never downloads audio.

Frontend development with hot reload:

```bash
pnpm --dir web install --frozen-lockfile
pnpm --dir web dev
```

Vite proxies `/api` to port 8080. Set `API_PROXY=http://127.0.0.1:PORT` to use another API port. After a dependency upgrade, run `pnpm --dir web dev --force` to refresh Vite's cache.

Checks:

```bash
make verify          # types, lint, tests, production build, Compose config and dependency pins
make compose-build   # build the container images without starting them
```

## Configuration

`.env` (copied from [`.env.example`](.env.example)):

| Variable | Purpose |
| --- | --- |
| `PROJECT_NAME` | Compose project name |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Local PostgreSQL |
| `API_PORT`, `WEB_PORT` | Loopback ports for the API and web app |
| `COLLECTION_POLICY` | `source_stream` (default) streams audio from the source. Local preservation needs an explicit policy and byte limits, set when the collection is first created. |
| `MEDIA_BUDGET`, `MEDIA_RESERVE` | Byte limits used only by local preservation |
| `IMPORT_ROOT` | Folder of metadata, correction and manifest files for operator commands |
| `PLAYBACK_REVIEW_NOTES` | Note recorded by the optional playback reviewer; it will not start without one |

[`deploy/archive-core.env`](deploy/archive-core.env) pins the archive engine image by digest. [`deploy/core-release.json`](deploy/core-release.json) and [`deploy/viewer-release.json`](deploy/viewer-release.json) record the engine and `@subcult/archive-viewer` versions the app is tested with. The `@subcult` npm scope installs from the registry set in [`web/.npmrc`](web/.npmrc).

To build against a local checkout of the engine source, set `ARKHIV_CORE_SOURCE` and add the override file:

```bash
docker compose --env-file .env --env-file deploy/archive-core.env \
  -f docker-compose.yml -f docker-compose.core-dev.yml up --build
```

## Operator commands

Start the playback reviewer, which marks supported public audio files as playable in batches of 100 without fetching any media:

```bash
docker compose --env-file .env --env-file deploy/archive-core.env --profile playback up --build -d
```

One-off commands run in the `operator` profile, with files from `IMPORT_ROOT` mounted at `/imports`:

```bash
docker compose --profile operator run --rm operator \
  import-source-catalog --collection etree --id SOURCE_ID --file /imports/metadata.json

docker compose --profile operator run --rm operator \
  edit-source-catalog --collection etree --id SOURCE_ID --file /imports/correction.json \
  --notes 'Venue confirmed from taper notes.'

docker compose --profile operator run --rm operator \
  review-source-audio --collection etree --id SOURCE_ID --notes 'Playback review.'

docker compose --profile operator run --rm operator \
  refresh-catalog --collection etree --pages 1 --items 25
```

Add the same `--env-file` options as above to these commands. Stop the `metadata-worker` or `playback-reviewer` service to pause it; it resumes from the database when restarted. Do not reset the database to restart discovery.

## Deploy

The web app builds into a static nginx image from [`web/Dockerfile`](web/Dockerfile). Run it beside the pinned engine image and PostgreSQL, as in [`docker-compose.yml`](docker-compose.yml), and put HTTPS in front of the web service. Keep the database on durable storage; a full import is large.

## Project layout

```text
web/          React and Vite frontend (built on @subcult/archive-viewer)
deploy/       Engine image pin and tested engine and viewer versions
scripts/      Dependency pin checks
docs/         Brand assets, reference notes and design records
```

Curated artist images live in [`web/src/artist-images.ts`](web/src/artist-images.ts), separate from source metadata. Each entry records its source, credit and rights note. Check an image and its source before adding one, and match artists by exact name, not substring.

The [reference notes](docs/reference/README.md) cover how recording content is rendered and how player placement works.

## Contributing

- Bugs and feature requests: [GitHub issues](https://github.com/subculture-collective/lineage/issues).
- Questions and ideas: [GitHub Discussions](https://github.com/subculture-collective/lineage/discussions).
- Code: pull requests on GitHub against `main`. CI runs `make verify` and builds the container images on every pull request, and both must pass.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## License

The software is licensed under GPL-3.0-only. See [LICENSE](LICENSE). Recordings, artwork and artist images keep the terms set by their sources; the software license does not cover them. Lineage is an independent project and is not endorsed by the artists, tapers or Internet Archive.
