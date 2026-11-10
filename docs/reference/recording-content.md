# Recording content

`web/src/RecordingContent.tsx` renders a recording's notes, source and lineage for
every surface that presents one. `web/src/recording-text.ts` holds the parsing.

**Precedence.** An editorial value wins, including a deliberately empty one. Next
comes the retained `source_metadata` value. The flattened `metadata` value is the
last resort, and it stays a single paragraph because its original structure is gone.

**Safety.** Source HTML is reduced to text and validated links; nothing is rendered
as HTML. Script and style bodies are dropped. Only `http` and `https` links without
credentials stay linked. Anything else remains visible text.

**Structure.** Paragraphs and lines come from the source's own breaks. Set, encore
and credit labels are recognized only at the start of a retained line. Numbered
lines and roman numerals are not treated as boundaries, because they are ambiguous.

**Setlists.** `metadata.songs` is a concatenated search projection of file titles,
so it is not displayed as a setlist. A retained `setlist` field has its own section,
separate from the playable tracks.

**Lineage.** Long chains show a shortened preview, cut at a chain boundary, and
disclose the full text. Only whitespace is normalized in the preview. An absent
value reads **Lineage not recorded**.

## Recording page

`/?view=recording&id=<identifier>` is a shareable page for one recording. It
reloads directly and shows loading, missing-identifier, unavailable or excluded
(the engine answers 404) and retry states. `web/src/RecordingDetail.tsx` holds the
body that the page and the side panel share: notes, source, lineage, provenance,
related browsing and the playable tracks.

A click in a list still opens the side panel. Its **Open recording page** link
moves to the page and focuses its heading. **Back to recordings** returns through
browser history, so the list keeps its filters, page and scroll position; a page
opened from a shared link returns to the home page instead. Opening or inspecting
another recording never changes what is playing, because the player stays outside
the page content.
