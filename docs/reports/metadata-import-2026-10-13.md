# Full etree metadata import, October 13, 2026

The owner authorized full metadata ingestion and source playback coverage. A
resumable import is running on Dozor against the retained private
`arkhiv_core_preview` database in `arkhiv-live-music-metadata-dev`. Its Docker
volume persists separately from source checkouts; no database was reset.

`arkhiv-live-music-metadata-import` uses published core 0.4.0, imports batches of
100 with a one-second request delay, and resumes the persisted discovery cursor,
queue and provider backoff. It pauses below a 20 GiB free-space reserve. Both the
worker and database restart unless explicitly stopped. Rotated worker logs retain
recent progress. Source audio is not acquired or preserved.

The independent `arkhiv-live-music-playback-review` worker uses published core
0.4.1 from merged PR 129. The importer and API now use the same immutable image.
It records the owner's private playback approval and processes batches of 100
from retained metadata. The first batch approved 96 recordings; four MPEG4-only
concert recordings were then explicitly reviewed using the new audio fallback.
An early progress check recorded 437 imported sources and 430 current approvals,
with no unavailable sources or review retries. These counts are an observation,
not full collection coverage.

The browser decoded a real MPEG4 concert source through the shared resolver with
ready state 4, advancing playback time and no player error. After refreshing
Vite's old dependency cache, a real nested MP3 also played through published core
0.4.1 and viewer 0.4.3, with ready state 4, advancing time and no player error.
Playback was stopped after each check. Approvals do not establish every source
CDN's availability, browser codec support, sustained playback or perceptual fidelity.

Private operator evidence and a baseline PostgreSQL dump live under
`~/.local/state/arkhiv-live-music/import-20261013/`. The operation receipt records
container and volume identities, worker bounds and the dump checksum without
credentials. The dump has not been restore-qualified and is not an independent
recovery copy. No public deployment is enabled.

Use `docker stop arkhiv-live-music-metadata-import` to pause import and
`docker stop arkhiv-live-music-playback-review` to pause approvals. Restart the
same containers to resume; do not remove their database volume. Shared artifacts
are published and the development reviewer/API have been replaced with the
immutable published pin while keeping the dataset intact. Complete discovery
and processing of all queued IDs, including explicitly reported unavailable or
rejected sources, remain required before declaring the collection accounted for.
