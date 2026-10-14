import { representationURL } from "@subcult/archive-viewer/catalog";
import type { RepresentationTransport } from "@subcult/archive-viewer/catalog";
import StreamPlayer from "./StreamPlayer";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { getJSON, label, tracksFor } from "./archive";
import type { Detail, Recording, Track, ImportStatus, Facets } from "./archive";
import { brand } from "./brand";

type Catalog = {
  items: Recording[];
  total: number;
  cursor?: string;
  status: ImportStatus;
};
export default function App() {
  const [term, setTerm] = useState("");
  const [year, setYear] = useState("");
  const [artist, setArtist] = useState("");
  const [venue, setVenue] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [availability, setAvailability] = useState("");
  const [facets, setFacets] = useState<Facets>();
  const [search, setSearch] = useState({
    q: "",
    year: "",
    artist: "",
    venue: "",
    availability: "",
    date_from: "",
    date_to: "",
    cursor: "",
  });
  const [catalog, setCatalog] = useState<Catalog>();
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<Detail>();
  const [detailError, setDetailError] = useState("");
  const [retry, setRetry] = useState(0);
  const [playing, setPlaying] = useState<{
    recording: Detail;
    tracks: Track[];
    index: number;
    url: string;
  }>();
  const [playError, setPlayError] = useState("");
  const [resolving, setResolving] = useState(false);
  const resolution = useRef<AbortController | null>(null);
  useEffect(() => () => resolution.current?.abort(), []);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  useEffect(() => {
    const controller = new AbortController();
    getJSON<{
      api_version: string;
      collection?: string;
      collections?: string[];
      modules: Record<string, string>;
    }>("/api/version", controller.signal)
      .then((version) => {
        if (
          version.api_version !== "1" ||
          version.modules.source_catalog !== "1"
        )
          throw new Error(
            "This catalog service needs an update before it can load the collection.",
          );
        if (
          version.collection !== "etree" &&
          !version.collections?.includes("etree")
        )
          throw new Error(
            "The Live Music Archive is unavailable on this catalog service.",
          );
        return getJSON<Catalog>(
          `/api/source-catalog/v1/items?collection=etree&${new URLSearchParams(search)}`,
          controller.signal,
        );
      })
      .then(setCatalog)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      getJSON<ImportStatus>(
        "/api/source-catalog/v1/status?collection=etree",
        controller.signal,
      )
        .then((status) => {
          if (!controller.signal.aborted)
            setCatalog((current) => current && { ...current, status });
        })
        .catch(() => {
          /* The next poll retries; browsing remains available. */
        });
    }, 30_000);
    return () => {
      window.clearInterval(timer);
      controller.abort();
    };
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    getJSON<Detail>(
      `/api/source-catalog/v1/items/${encodeURIComponent(selected)}?collection=etree`,
      controller.signal,
    )
      .then(setDetail)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setDetailError(e.message);
      });
    return () => controller.abort();
  }, [selected, retry]);
  useEffect(() => {
    const controller = new AbortController();
    getJSON<Facets>(
      "/api/source-catalog/v1/facets?collection=etree",
      controller.signal,
    )
      .then(setFacets)
      .catch(() => {
        /* Search remains usable if suggestions are unavailable. */
      });
    return () => controller.abort();
  }, [search]);
  const changeSearch = (next: typeof search) => {
    setLoading(true);
    setError("");
    setCatalog(undefined);
    setSearch(next);
    window.scrollTo({ top: 440, behavior: "smooth" });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setHistory([]);
    changeSearch({
      q: term.trim(),
      year,
      artist: artist.trim(),
      venue: venue.trim(),
      availability,
      date_from: dateFrom,
      date_to: dateTo,
      cursor: "",
    });
  };
  const open = (id: string) => {
    setDetail(undefined);
    setDetailError("");
    setSelected(id);
  };
  const tracks =
    detail && !detail.unavailable
      ? tracksFor(selected, detail.files || []).filter((track) =>
          detail.playback_bindings?.some((binding) =>
            binding.files.includes(track.name),
          ),
        )
      : [];
  const startTrack = async (
    recording: Detail,
    queue: Track[],
    index: number,
  ) => {
    resolution.current?.abort();
    const controller = new AbortController();
    resolution.current = controller;
    const track = queue[index];
    const binding = recording.playback_bindings?.find((candidate) =>
      candidate.files.includes(track.name),
    );
    if (!binding) {
      setPlayError("Playback is unavailable for this recording.");
      return;
    }
    setResolving(true);
    setPlayError("");
    try {
      const params = new URLSearchParams({
        collection: "etree",
        action: "play",
        file: track.name,
      });
      const asset = await getJSON<RepresentationTransport>(
        `/api/catalog/v1/items/${encodeURIComponent(binding.item)}/representations/${encodeURIComponent(binding.representation)}/resolve?${params}`,
        controller.signal,
      );
      const url = representationURL(asset, "play");
      if (!controller.signal.aborted) {
        setPlaying({ recording, tracks: queue, index, url });
        setSelected("");
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setPlayError(
          error instanceof Error ? error.message : "Playback is unavailable.",
        );
    } finally {
      if (!controller.signal.aborted) setResolving(false);
    }
  };
  const play = (index: number) => {
    if (detail) void startTrack(detail, tracks, index);
  };
  const current = playing?.tracks[playing.index];
  const advance = () => {
    if (playing && playing.index + 1 < playing.tracks.length)
      void startTrack(playing.recording, playing.tracks, playing.index + 1);
  };
  return (
    <div className="app-shell">
      <div className="stripes" aria-hidden="true" />
      <header className="masthead">
        <a className="wordmark" href="/">
          <strong>{brand.name}</strong>
          <span>{brand.descriptor}</span>
        </a>
        <a href={brand.collectionURL} target="_blank" rel="noreferrer">
          Source: {brand.collectionName} ↗
        </a>
      </header>
      <main>
        <div className="intro">
          <p className="eyebrow">Catalog preview · built on Arkhiv</p>
          <h1>{brand.tagline}</h1>
          <p>
            A room, a night, a recording. Search live shows from the Internet
            Archive’s Live Music Archive by artist, venue and date. Source
            metadata, corrections and taper lineage stay visible.
          </p>
        </div>
        <section aria-label="Recording catalog" className="search-card">
          <form onSubmit={submit} className="search-bar">
            <label>
              Search the catalog
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Try Ween, Billy Strings, Red Rocks…"
                type="search"
              />
            </label>
            <label className="year-field">
              Year
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Any year"
                list="catalog-years"
                inputMode="numeric"
                pattern="(19|20)[0-9]{2}"
                maxLength={4}
              />
            </label>
            <button type="submit" className="primary">
              Find shows ↗
            </button>
          </form>
          <datalist id="catalog-years">
            {facets?.years.map((f) => (
              <option key={f.value} value={f.value}>
                {f.count} recordings
              </option>
            ))}
          </datalist>
          <details className="filter-panel">
            <summary>Filter recordings</summary>
            <div className="filter-fields">
              <label>
                Artist
                <input
                  list="catalog-artists"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Any artist"
                />
              </label>
              <datalist id="catalog-artists">
                {facets?.artists.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.count} recordings
                  </option>
                ))}
              </datalist>
              <label>
                Venue
                <input
                  list="catalog-venues"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Any venue"
                />
              </label>
              <datalist id="catalog-venues">
                {facets?.venues.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.count} recordings
                  </option>
                ))}
              </datalist>
              <label>
                From date
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label>
                To date
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <label>
                Source availability
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="">All recordings</option>
                  <option value="available">Available at last check</option>
                  <option value="unavailable">Unavailable at last check</option>
                </select>
              </label>
              <button
                onClick={() => {
                  setHistory([]);
                  changeSearch({
                    q: term.trim(),
                    year,
                    artist: artist.trim(),
                    venue: venue.trim(),
                    availability,
                    date_from: dateFrom,
                    date_to: dateTo,
                    cursor: "",
                  });
                }}
              >
                Apply filters
              </button>
            </div>
          </details>
          {catalog && (
            <p className="import-status">
              {catalog.status.imported.toLocaleString()} metadata records
              imported · {catalog.status.pending.toLocaleString()} queued
              {catalog.status.failed > 0
                ? ` · ${catalog.status.failed.toLocaleString()} need attention`
                : ""}
              {catalog.status.discovery_complete
                ? " · Collection discovery complete"
                : " · Collection discovery incomplete"}
              {catalog.status.playback &&
                ` · ${catalog.status.playback.reviewed.toLocaleString()} approved for streaming · ${catalog.status.playback.pending.toLocaleString()} awaiting playback review · ${catalog.status.playback.unsupported.toLocaleString()} unsupported · ${catalog.status.playback.held.toLocaleString()} held for operator review · ${catalog.status.playback.retry.toLocaleString()} review retries`}
              . Audio streams from the Internet Archive.
              {catalog.status.last_error &&
                ` Import paused: ${catalog.status.last_error}`}
            </p>
          )}
        </section>
        <section aria-label="Recording list">
          <div className="catalog-heading">
            <h2>
              {search.q ? `Results for “${search.q}”` : "Browse the tape shelf"}
            </h2>
            <span>
              {catalog
                ? `${catalog.total.toLocaleString()} recordings indexed`
                : loading
                  ? "Checking the catalog…"
                  : "Catalog unavailable"}
            </span>
          </div>
          {loading && (
            <p role="status" className="notice">
              Loading recordings from the catalog…
            </p>
          )}
          {error && (
            <div role="alert" className="notice">
              <p>{error}</p>
              <button onClick={() => changeSearch({ ...search })}>
                Try again
              </button>
            </div>
          )}
          {catalog?.items.length === 0 && (
            <p className="notice">
              {catalog.status.imported === 0
                ? "No recordings have been added to this catalog yet."
                : "No recordings match. Try another artist, venue or year."}
            </p>
          )}
          <div className="tape-list">
            {catalog?.items.map((recording, index) => (
              <button
                className="tape"
                key={recording.identifier}
                onClick={() => open(recording.identifier)}
              >
                <span className="tape-number">
                  {String(history.length * 100 + index + 1).padStart(3, "0")}
                </span>
                <span className="tape-info">
                  <strong>
                    {label(recording.creator) || "Unknown artist"}
                  </strong>
                  <span>
                    {label(recording.title) || recording.identifier}
                    {recording.unavailable ? " · Source unavailable" : ""}
                  </span>
                </span>
                <span className="tape-date">
                  {label(recording.date).slice(0, 10) || "Date unknown"}
                </span>
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </button>
            ))}
          </div>
          {catalog && (
            <nav aria-label="Catalog pages" className="pagination">
              <button
                disabled={!history.length || loading}
                onClick={() => {
                  const cursor = history[history.length - 1];
                  setHistory(history.slice(0, -1));
                  changeSearch({ ...search, cursor });
                }}
              >
                ← Previous
              </button>
              <span>
                Page {history.length + 1} · ordered by catalog identifier
              </span>
              <button
                disabled={!catalog.cursor || !catalog.items.length || loading}
                onClick={() => {
                  setHistory([...history, search.cursor]);
                  changeSearch({ ...search, cursor: catalog.cursor || "" });
                }}
              >
                Next 100 →
              </button>
            </nav>
          )}
        </section>
        <footer>
          <span>
            {brand.name} is built on Arkhiv. Recorded by tapers, preserved by
            the Internet Archive.
          </span>
          <span>Availability and playback depend on the source recording.</span>
        </footer>
      </main>
      {selected && (
        <dialog
          ref={dialog}
          onCancel={() => setSelected("")}
          className="detail-backdrop"
        >
          <section className="recording-detail" aria-label="Recording details">
            <button
              className="close"
              onClick={() => {
                resolution.current?.abort();
                setResolving(false);
                setSelected("");
              }}
            >
              Close ×
            </button>
            <p className="eyebrow">Recording label</p>
            {!detail && !detailError && <p role="status">Loading recording…</p>}
            {detailError && (
              <div role="alert">
                <p>{detailError}</p>
                <button
                  onClick={() => {
                    setDetailError("");
                    setRetry(retry + 1);
                  }}
                >
                  Try again
                </button>
              </div>
            )}
            {detail && (
              <>
                <h2>{label(detail.metadata.creator) || "Unknown artist"}</h2>
                <p className="detail-title">{label(detail.metadata.title)}</p>
                {label(detail.metadata.description) && (
                  <p className="recording-notes">
                    {label(detail.metadata.description)}
                  </p>
                )}
                {detail.unavailable && (
                  <p role="status" className="notice">
                    This source was unavailable at the last import. Its catalog
                    metadata is retained.
                  </p>
                )}
                <dl>
                  {[
                    "date",
                    "venue",
                    "coverage",
                    "source",
                    "taper",
                    "transferer",
                  ].map(
                    (key) =>
                      label(detail.metadata[key]) && (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{label(detail.metadata[key])}</dd>
                        </div>
                      ),
                  )}
                </dl>
                <a
                  href={`https://archive.org/details/${encodeURIComponent(selected)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Full notes and source files on Internet Archive ↗
                </a>
                <details className="provenance">
                  <summary>Source metadata and catalog changes</summary>
                  <p>
                    Updated{" "}
                    {detail.updated_at
                      ? new Date(detail.updated_at).toLocaleString()
                      : "previously"}{" "}
                    ·{" "}
                    <a
                      href={`/api/source-catalog/v1/items/${encodeURIComponent(selected)}/source?collection=etree`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Original metadata snapshot ↗
                    </a>
                  </p>
                  {detail.normalization?.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                  {Object.entries(detail.normalization?.derived || {}).map(
                    ([field, reason]) => (
                      <p key={field}>
                        <strong>{field}:</strong> {reason}
                      </p>
                    ),
                  )}
                  {Object.keys(detail.editorial || {}).length > 0 && (
                    <dl>
                      {Object.entries(detail.editorial || {}).map(
                        ([field, value]) => (
                          <div key={field}>
                            <dt>{field}</dt>
                            <dd>
                              {label(value)}
                              <small>
                                Source:{" "}
                                {label(detail.source_metadata?.[field]) ||
                                  "(missing)"}
                              </small>
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                  )}
                  {detail.history?.map((edit, index) => (
                    <p key={index}>
                      {new Date(edit.created_at).toLocaleDateString()}:{" "}
                      {edit.notes}
                    </p>
                  ))}
                </details>
                {playError && <p role="alert">{playError}</p>}
                <div className="track-heading">
                  <h3>{tracks.length} playable tracks</h3>
                  {tracks.length > 0 && (
                    <button
                      className="primary"
                      disabled={resolving}
                      onClick={() => play(0)}
                    >
                      Play recording ▶
                    </button>
                  )}
                </div>
                {!tracks.length && (
                  <p>
                    No tracks have been approved for playback here. Source files
                    and metadata remain available on Internet Archive.
                  </p>
                )}
                <ol className="tracks">
                  {tracks.map((track, index) => (
                    <li key={track.name}>
                      <button onClick={() => play(index)}>
                        <span className="track-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>
                          {label(track.title) ||
                            track.name.replace(/\.[^.]+$/, "")}
                        </strong>
                        <span className="track-length">
                          {track.length || "▶"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        </dialog>
      )}
      {playing && current && (
        <aside className="player" aria-label="Audio player">
          <div>
            <p className="eyebrow">
              Now playing · {label(playing.recording.metadata.creator)}
            </p>
            <strong>{label(current.title) || current.name}</strong>
            <p>
              Track {playing.index + 1} of {playing.tracks.length}
            </p>
          </div>
          {playError && <p role="alert">{playError}</p>}
          <StreamPlayer
            key={playing.url}
            track={{ ...current, url: playing.url }}
            onEnded={advance}
          />
          <button
            onClick={advance}
            disabled={resolving || playing.index + 1 === playing.tracks.length}
          >
            Next →
          </button>
          <button
            onClick={() => {
              resolution.current?.abort();
              setResolving(false);
              setPlayError("");
              setPlaying(undefined);
            }}
          >
            Stop ×
          </button>
        </aside>
      )}
    </div>
  );
}
