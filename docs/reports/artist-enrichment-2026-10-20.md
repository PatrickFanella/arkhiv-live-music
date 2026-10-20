# Artist biographies and photographs, October 20, 2026

The owner asked for more artist photographs and biographies. Before this pass,
four artists had engine profiles, and only five curated images appeared in the
collection directory and recording lists.

## What changed

- Core 0.4.3 adds `source_artist_photos` module 1 (Arkhiv PRs 138–140). One
  request lists every bound artist photograph. Lineage uses it in the directory,
  recording rows, detail and player (PRs 13–15), with 330px Commons thumbnails.
  Artist pages keep the full image.
- Arkhiv PR 141 lets the enrichment helper use a Wikipedia lead image when it
  is a Commons file, and link the Commons licensing section for public-domain,
  GFDL and Free Art License photographs.
- 552 artist profiles are now bound in the engine. 419 have an attributed
  Commons photograph and 550 have a Wikipedia introduction.

## How identities were reviewed

Every binding is an explicit MusicBrainz ID. Visitors' page reads never search
or fetch provider data. Artists with at least 20 visible recordings were
considered.

1. **Collection link.** The source artist name exactly matches the title of one
   Live Music Archive artist collection. That collection is the Wikidata item's
   Internet Archive ID (P724), whose MusicBrainz ID (P434) was used.
2. **Exact name.** Otherwise, a MusicBrainz search had to return exactly one
   artist whose name or alias matches after punctuation and a leading "The"
   are ignored. That artist also needed:
   - a single Wikidata item described as a musical act;
   - US identification;
   - a life span consistent with the recording years;
   - for a person, no death before the last recording.
3. **Manual review.** Candidates rejected only by the life-span or US rule were
   reviewed individually, for example reunion recordings, early line-ups and
   touring non-US artists. Same-name artists were rejected, such as Zero, the
   San Francisco band, versus a Brazilian band. So were alias-only matches such
   as Little Women → Quiet Riot, and names shared by more than one archive.org
   collection.

The four existing bindings (Ween, Grateful Dead, moe., Widespread Panic) were
independently re-derived with the same IDs and left unchanged. Artists without a
Wikidata item, or whose MusicBrainz record does not link it, have no profile.
Their recordings are unaffected.

## Provenance and limits

Bundles were built with Arkhiv's `scripts/enrich_source_artist.py` and imported
with `import-source-artist` from the deployed engine image. Each binding's
review note records its evidence path. Raw provider responses are retained in
the engine's snapshot table. Bundles, receipts and a pre-import dump of the
three artist tables stay in private operator state on Dozor. Recording metadata,
corrections, exclusions and playback reviews were not changed; visible and
excluded counts matched before and after.

Wikidata, MusicBrainz and Wikipedia can contain errors, and an automated rule is
not a human identification of every artist. Incorrect bindings should be reported
and rebound or removed through the engine's operator workflow. Biographies are
Wikipedia introductions under CC BY-SA 4.0. Photographs keep their individual
Commons credits and licenses.
