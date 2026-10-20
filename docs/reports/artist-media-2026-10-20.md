# Stored artist photographs and Live Music Archive profiles, October 20, 2026

After the first enrichment pass, 552 artists had profiles, all bound to MusicBrainz.
Photographs were hotlinked from Wikimedia. The owner asked for more sources and
for photographs and biographies to live in Lineage's own database.

## What changed

- Core 0.4.4 (Arkhiv PRs 142 and 144) adds `source_artist_media` module 1. On
  import, the engine stores two renditions of each photograph: a display image
  up to 1280 pixels wide and a 330-pixel thumbnail. Both are re-encoded, so
  embedded metadata such as camera location is dropped.
  `/api/source-catalog/v1/artist-media/{sha256}` serves them with immutable
  caching. Biographies were already stored in the engine.
- Lineage (PR 17) loads those stored copies. A browser check of three artist
  pages made no requests to Wikimedia or the Internet Archive. PR 18 fixed a
  pre-existing sideways scroll on narrow artist pages.
- A profile can now be bound to the Live Music Archive collection that holds the
  artist's recordings, with or without a MusicBrainz ID. That collection supplies
  a photograph and biography when Wikipedia and Commons have none.

## Results

| | Before | After |
|---|---|---|
| Artist profiles | 552 | 3,041 |
| With a photograph | 419 (hotlinked) | 2,874 (all stored) |
| With a biography | 550 | 925 |
| Visible recordings whose artist has a photograph | | 79.5% |
| Visible recordings whose artist has a biography | | 57.1% |
| Artists with 20+ recordings that have a photograph | 419 of 1,947 | 1,232 of 1,947 |

Photographs: 419 Commons and 2,455 collection images. Biographies: 550 from
Wikipedia and 375 from collection pages. 2,489 profiles have no MusicBrainz ID,
and 3,029 are bound to a collection. The engine stores 5,036 renditions,
342 MB in total. All twelve artists with the most recordings now show a
photograph, including Yonder Mountain String Band and Radiators. The visible and
excluded recording counts were unchanged by the import.

## How collection identities were chosen

The collection comes from the recordings themselves, not from a name search.
Every recording's retained archive.org response lists its collections. A source
artist was mapped to a collection when at least 90% of its recordings sit in it.
A collection that holds several source artist names was used only for the
name that matches the collection title, ignoring case, punctuation and a
leading "The". The engine checks again at import that the retained collection
response is a Live Music Archive collection and that at least one of the
artist's visible recordings belongs to it.

The 552 existing MusicBrainz bindings were rebuilt with the same IDs and kept
their Wikipedia text and Commons photographs. They now also have stored copies,
plus the collection identity where one was found.

## What counts as a photograph or biography

- **Photograph.** Commons comes first, as before. Otherwise the collection's
  `Item Image` is used. One image appeared on 515 collections and is the Live
  Music Archive placeholder. Any image shared by three or more collections was
  skipped, as were files under 2 KB and anything that is not JPEG, PNG or GIF.
- **Biography.** Wikipedia comes first. Otherwise the collection page text is
  used, after removing the generated "Download free music…" notices and any
  paragraph about taping, trading, soundboards or archive permission. Lines
  hard-wrapped mid-sentence are rejoined. What remains must be at least 25
  words.

Collection images and text carry no separate license. Lineage credits them to
the collection page ("Provided by the artist collection on Internet Archive. A
reuse license is not recorded here."). It does not present them as Wikipedia or
Commons material. Most collection text was supplied by the bands and reads like
a press biography.

## Limits

- 5,028 source artists still have no profile. For most, the collection has
  only the placeholder image and generated text. Others have no collection of
  their own, or share a collection under a name that does not match its title.
  Spafford and Yarn are still without a MusicBrainz link, but both now have a
  collection photograph.
- Three artists failed because their only image is not a JPEG, PNG or GIF:
  Betsy Franck, the Mountain Goats and Yawning Man. Turkuaz kept its text and
  dropped its image. Images over 12 MiB were skipped. Garage A Trois's Commons
  original is truncated, so its stored copy was made from Commons' 960-pixel
  rendering.
- Collection text is written by the bands and has not been fact-checked. The
  filters remove most taping notes, but a short mention inside a longer
  paragraph removes that whole paragraph, and unusual wording can slip through.
- The cleaned text keeps the band's own line breaks, so some biographies are
  many short paragraphs.

Bundles, the per-artist plan with its evidence notes, receipts and two
`pg_dump` backups of the artist tables are in private operator state on Dozor.
One backup was taken before the migration, the other before the import.
