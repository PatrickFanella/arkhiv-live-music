# Discovery loading baseline — November 9, 2026

Decision for [issue 37](https://git.subcult.tv/PatrickFanella/arkhiv-live-music/issues/37).
This is a read-only baseline and implementation budget, not a performance fix.

## Build, data and conditions

Measured from Kvant in the T3 Chromium preview, 1280 × 800 CSS pixels, light
appearance, no artificial network/CPU throttle. The browser reported `4g`,
10 Mbit/s downlink and 0 ms estimated RTT; those are browser hints, not a measured
WAN link. Browser storage and caches were not purged. “Initial” below means the
first navigation in this observation session, not a guaranteed empty-cache load.

The deployed frontend revision was `b1ebd54d4c83f95d2d430962a5c21402dfda5f10`
(image ID `sha256:7ae4eaa68a2fdab38e6a9eed158456acb3e9c3eba4af49334abccb46fa285556`).
The running core revision was `79a4c0b952045d43ca3278ff56d580425a92d3ab`
(image ID `sha256:a65d1853b6c48cace898b16e88f06251f0131a48cec6bfbee6fc72bf82d17912`).
The checked-out consumer baseline was `ce118633689a8fc0569865fb63d7448794b2ec5c`,
with independent core/viewer 0.4.7 receipts. These identities differ: this report
does not claim the deployed engine equals the consumer pin.

`/api/version` reported a private `etree` catalog and module-1 source catalog,
discovery, artist photos and artist media. Status reported 295,994 imported,
297 excluded and 295,697 reviewed recordings. The November 9 anniversary query
matched 837 visible recordings. Counts can change while imports continue.

## Observations

The initial document finished DOM content at 531 ms and load at 634 ms. The
catalog request started at 796 ms and finished about 5.74 seconds after navigation.
The shell is visible well before the recordings arrive.

| Initial request | Count | Duration | Transfer bytes |
|---|---:|---:|---:|
| Version/capabilities | 2 | 147 ms each | 441 each |
| Facets | 1 | 4,515 ms | 5,839 |
| Artist photo directory | 1 | 620 ms | 485,075 |
| First recording page | 1 | 4,941 ms | 22,458 |

These are five JSON requests before subsequent image requests. The photo directory
alone transferred about 474 KiB. Media thumbnails add requests separately. The
resource timing `transferSize` includes browser-reported overhead; the photo
response's encoded body was 484,775 bytes. Do not compare it directly with decoded
JSON lengths without naming the measurement.

Repeated HTTP scenarios used three sequential same-origin GETs each, in the same
browser session. These isolate request time from React navigation and rendering.

| Named scenario | Reproducible query after `/api/source-catalog/v1/` | Samples (ms) | Median |
|---|---|---|---:|
| H — Home first page | `items?collection=etree&` | 4,855 / 4,033 / 3,929 | 4,033 ms |
| C — Current-year month counts | `calendar?collection=etree&month=11&year_from=2026&year_to=2026&artist=` | 154 / 88 / 98 | 98 ms |
| D — Anniversary results | `items?collection=etree&view=on-this-day&sort=date_desc&month_day=11-09` | 3,292 / 3,280 / 3,303 | 3,292 ms |

Home responses transferred 22,458–22,503 bytes; anniversary responses
51,307–51,392 bytes; calendar responses 364 bytes. All nine answered HTTP 200.
The calendar sample is a sparse current-year month, not the future all-years week
query: its fast time is not proof that a populated historical week is equally fast.

A single artist profile request for Grateful Dead took 631 ms (3,217 decoded body
bytes). A single AJ Lee & Blue Summit recording detail took 244 ms (36,290 decoded
body bytes). These are one-observation probes, not percentile estimates. A status
probe took 3,197 ms (241 decoded bytes); background status polls during the session
took about 3.2–4.3 seconds and run every 30 seconds in the checked-out frontend.
No observed request in the recorded successful scenarios failed.

## Interpretation and next implementation budgets

The browser waterfall establishes slow HTTP responses, not a database execution
time. No production `EXPLAIN`, database mutation, restart, load test or provider
crawl was performed. Code inspection shows that recording search also computes
`Status`, whose audio-coverage aggregation is a plausible shared cost with the
slow status polls. Confirm that hypothesis with disposable representative data
and query plans in the engine performance issue; do not attribute all 3–5 seconds
to React or assert that this report proves the SQL bottleneck.

Adopt these acceptance targets for the later loading work, measured on the same
named scenarios and recorded build/data conditions:

- Initial usable recording rows within 2.5 seconds of navigation on an unthrottled
  connection; expose loading/error states immediately.
- Revisit an identical successful query within 30 seconds: render retained rows
  within 150 ms with no blocking duplicate catalog request.
- Month/day count response within 500 ms, and recording details within one second;
  test the populated historical week separately from sparse current-year counts.
- Share capabilities across consumers of the same page and retain bounded caches;
  record request counts, transferred bytes and first-row time before/after.
- Keep catalog reads independent of popularity-provider or media acquisition work.

These are chosen implementation budgets. None is claimed achieved by this PR.
Repeat H → C → D → artist → detail → Back → Forward as a UI scenario, then repeat
H/C/D direct HTTP probes to distinguish navigation caching from service speed.
Capture browser request/paint timing, server handler time and database `EXPLAIN
(ANALYZE, BUFFERS)` separately. A warm repeat must state its cache age; a cold test
must state which caches were actually cleared.

## Metadata and palette fixtures

The detail sample had string source (67 characters), lineage (69), description
(1,098; original source contains HTML), and songs/setlist (483). It had 75 files,
26 with titles and none with an explicit track-number field. These are shapes,
not evidence that every file is playable. Later display work should preserve
source text, format safe blocks, and derive title cleanup conservatively from
established filename prefixes. Never render untrusted description HTML directly.

The unchanged light tokens were paper `#f4efe4`, paper-deep `#eae3d2`, ink
`#1c1915`, marker `#c43a24`, focus `#2f6b8f`. The authoritative light/dark palette,
fonts and assets remain [the J-Card brand](../reference/brand.md) and
`web/src/styles.css`; this report changes no tokens. Later layout work must compare
both appearance modes against those existing tokens, including player states.

Exact traces and bounded private responses remain outside Git under
`~/.local/state/lineage-wave1/` (`baseline-resource-trace.json`,
`baseline-extra.json`, and the initial browser observation). Only aggregate
measurements and reproduction queries are committed. Timing changes without
matching runtime, dataset, query, viewport and cache conditions are inconclusive.
