# Agent Instructions

This repository is an Arkhiv consumer with a React/TypeScript frontend, the
published `@subcult/archive-viewer` kit, a shared Arkhiv Go engine image and
PostgreSQL. It contains no independent Go backend, catalog schema or metadata worker.

## Boundaries

Backend changes belong in `subculture-collective/arkhiv`. This consumer uses the
versioned HTTP API and immutable engine pin in `deploy/archive-core.env`; the
matching receipt is `deploy/core-release.json`. Viewer dependencies and receipt
remain independent. Register both lanes in Arkhiv's consumer registry so its
release workflow proposes upgrades alongside siblings. Do not use floating tags
for releases or copy backend source into this repository.

Metadata is always imported into the engine's database. Source snapshots,
normalization provenance and editorial corrections remain independent. Re-imports
must preserve corrections. Media acquisition is a separate operator workflow;
metadata workers never fetch audio. Playback uses engine-resolved, reviewed files.

The required source-catalog module is not in the retained core 0.3.0 release. Use
`docker-compose.core-dev.yml` with the canonical Arkhiv feature checkout for local
work until the new shared release is published and its pin adopted. The frontend
checks module compatibility before loading its catalog.

The frontend owns its composition and future design system. Its current styling
is a functional scaffold; no final visual system has been selected. Use the kit
for shared behavior rather than copying its hooks or controls.

## Priorities

1. Keep the consumer runnable and minimal.
2. Preserve Open Pilot issue and PR templates.
3. Keep caches, credentials, snapshots, audio and runtime data out of Git.
4. Update this file and README when conventions change.

## Verification

Run `make verify`. It checks the consumer's dependencies, types, lint, tests,
build, Compose configuration, issue templates and dependency pin consistency.
Run the shared engine's required gates in its own repository for backend changes.
Passing consumer checks does not prove a published engine contains an unreleased
module or that every source recording is playable.

Draft issue forms do not approve pickup. Apply `ready-for-agent` and `agent:queued`
only after reviewing scope and verification, or use the reviewed ready-for-pickup
form. Treat `ready-for-agent` alone and assignment to `open-pilot` as pickup approval
when enabled. `make typecheck` does not emit application files.
