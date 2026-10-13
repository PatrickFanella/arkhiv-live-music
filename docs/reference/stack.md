# Application stack

Arkhiv Live Music is a React/TypeScript consumer of the shared Arkhiv Go engine.
The published archive-viewer kit supplies shared requests and audio controls.
PostgreSQL stores metadata, source snapshots, corrections and worker state through
Arkhiv's migrations and operators. This repository owns no Go backend or schema.

Vite serves the development frontend and proxies `/api` to the engine. The web
container uses nginx with the same proxy boundary. Compose supplies the engine,
its metadata worker, operator and database. Engine and viewer release receipts
are independently pinned under `deploy/` and upgraded through Arkhiv's registry.

The design system remains undecided. The current interface is a functional scaffold.
See the root README for the pinned core 0.4.0 release, optional development override,
operator commands and verification.
