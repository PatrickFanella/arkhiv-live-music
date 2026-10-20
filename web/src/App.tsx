import { representationURL } from "@subcult/archive-viewer/catalog";
import type { RepresentationTransport } from "@subcult/archive-viewer/catalog";
import StreamPlayer from "./StreamPlayer";
import Artwork from "./Artwork";
import {
  artistImageFor,
  artistPhotosFrom,
  type ArtistPhotos,
} from "./artist-images";
import { recordingArtwork } from "./artwork";
import BrowseDirectory from "./BrowseDirectory";
import ArtistPage from "./ArtistPage";
import DateDiscovery from "./DateDiscovery";
import {
  emptySearch,
  filterLabels,
  readSearch,
  searchQuery,
  validateDates,
} from "./browse";
import type { FilterKey, Search } from "./browse";
import { Fragment, useEffect, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";
import { getJSON, label, tracksFor } from "./archive";
import type { Detail, Recording, Track, ImportStatus, Facets } from "./archive";
import { brand, discoveryCopy } from "./brand";

type Catalog = {
  items: Recording[];
  total: number;
  cursor?: string;
  status: ImportStatus;
};
export default function App() {
  const [search, setSearch] = useState<Search>(() =>
    readSearch(typeof window === "undefined" ? "" : window.location.search),
  );
  const [supportsDiscovery, setSupportsDiscovery] = useState<boolean>();
  const [artistPhotos, setArtistPhotos] = useState<ArtistPhotos>();
  const [draft, setDraft] = useState<Search>(search);
  const [facets, setFacets] = useState<Facets>();
  const [facetError, setFacetError] = useState("");
  const [facetRetry, setFacetRetry] = useState(0);
  const [filterError, setFilterError] = useState("");
  const [copied, setCopied] = useState("");
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
    identifier: string;
    tracks: Track[];
    index: number;
    url: string;
  }>();
  const [playError, setPlayError] = useState("");
  const [resolving, setResolving] = useState(false);
  const resolution = useRef<AbortController | null>(null);
  useEffect(() => () => resolution.current?.abort(), []);
  useEffect(() => {
    const restore = () => {
      const next = readSearch(window.location.search);
      setDraft(next);
      setSearch(next);
      setHistory([]);
      setLoading(true);
      setCatalog(undefined);
      setError("");
      setFilterError("");
      setCopied("");
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const results = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  // Artist photographs are decorative; an older engine or a failed request
  // leaves the curated images in place.
  useEffect(() => {
    const controller = new AbortController();
    getJSON<{ modules: Record<string, string> }>(
      "/api/version",
      controller.signal,
    )
      .then((version) =>
        version.modules.source_artist_photos === "1"
          ? getJSON<{ artists: Parameters<typeof artistPhotosFrom>[0] }>(
              "/api/source-catalog/v1/artist-photos?collection=etree",
              controller.signal,
            )
          : undefined,
      )
      .then((list) => {
        if (list) setArtistPhotos(artistPhotosFrom(list.artists));
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    getJSON<{
      api_version: string;
      collection?: string;
      collections?: string[];
      modules: Record<string, string>;
    }>("/api/version", controller.signal)
      .then((version) => {
        const available = version.modules.source_discovery === "1";
        setSupportsDiscovery(available);
        if (
          !available &&
          (search.month_day ||
            search.year_from ||
            search.year_to ||
            search.month ||
            search.sort ||
            search.view === "calendar" ||
            search.view === "on-this-day")
        )
          throw new Error(discoveryCopy.updateRequired);
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
          `/api/source-catalog/v1/items?collection=etree&${searchQuery(search)}`,
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
      .catch((error: Error) => {
        if (error.name !== "AbortError") setFacetError(error.message);
      });
    return () => controller.abort();
  }, [facetRetry]);
  const changeSearch = (next: Search, push = true) => {
    const validation = validateDates(next);
    if (validation) {
      setFilterError(validation);
      return;
    }
    setFilterError("");
    setCopied("");
    setLoading(true);
    setError("");
    setCatalog(undefined);
    setSearch(next);
    setDraft(next);
    results.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (push)
      window.history.pushState(
        null,
        "",
        `${window.location.pathname}${searchQuery(next) ? `?${searchQuery(next)}` : ""}`,
      );
  };
  const applyFilters = (filters: Partial<Search>) => {
    if (filters.month_day === "" && search.view === "on-this-day")
      filters = { ...filters, view: "", sort: "" };
    if (filters.year_from === "" || filters.year_to === "")
      filters = { ...filters, year_from: "", year_to: "" };
    setHistory([]);
    changeSearch({ ...search, ...filters, cursor: "" });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validateDates(draft)) {
      setFilterError(validateDates(draft));
      return;
    }
    setHistory([]);
    changeSearch({
      ...draft,
      q: draft.q.trim(),
      artist: draft.artist.trim(),
      venue: draft.venue.trim(),
      cursor: "",
    });
  };
  const editFilter = (key: FilterKey, value: string) => {
    setDraft({ ...draft, [key]: value });
    setFilterError("");
  };
  const related = (filters: Partial<Search>) => {
    resolution.current?.abort();
    setResolving(false);
    setSelected("");
    setHistory([]);
    changeSearch({
      ...emptySearch,
      ...filters,
      view: filters.artist ? "artist" : "",
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
    identifier: string,
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
        setPlaying({ recording, identifier, tracks: queue, index, url });
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
    if (detail) void startTrack(detail, tracks, index, selected);
  };
  const current = playing?.tracks[playing.index];
  const advance = () => {
    if (playing && playing.index + 1 < playing.tracks.length)
      void startTrack(
        playing.recording,
        playing.tracks,
        playing.index + 1,
        playing.identifier,
      );
  };
  const pad = (value: number) => String(value).padStart(2, "0");
  const now = new Date();
  const destinations = {
    browse: { ...emptySearch },
    calendar: {
      ...emptySearch,
      artist: search.artist,
      view: "calendar",
      month: pad(now.getMonth() + 1),
      year_from: String(now.getFullYear()),
      year_to: String(now.getFullYear()),
      sort: "date_desc",
    },
    "on-this-day": {
      ...emptySearch,
      artist: search.artist,
      view: "on-this-day",
      month_day: `${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      sort: "date_desc",
    },
  } satisfies Record<string, Search>;
  const activeView =
    search.view === "calendar" || search.view === "on-this-day"
      ? search.view
      : "browse";
  const navigate = (next: Search) => (event: MouseEvent) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    setHistory([]);
    changeSearch(next);
  };
  const appliedFilters = (Object.keys(filterLabels) as FilterKey[]).filter(
    (key) => search[key],
  );
  const refining =
    (["venue", "year", "date_from", "date_to", "availability"] as const).some(
      (key) => search[key],
    ) ||
    (!!search.artist && !search.view);
  const home = !search.view && appliedFilters.length === 0;
  const status = catalog?.status;
  return (
    <div className={`app-shell${playing ? " has-player" : ""}`}>
      <div className="stripes" aria-hidden="true" />
      <header className="masthead">
        <div className="masthead-inner">
          <a
            className="wordmark"
            href="/"
            onClick={navigate(destinations.browse)}
          >
            <strong>{brand.name}</strong>
            <span>{brand.descriptor}</span>
          </a>
          <nav className="primary-nav" aria-label="Explore recordings">
            {(
              [
                ["browse", discoveryCopy.browse],
                ["calendar", discoveryCopy.calendar],
                ["on-this-day", discoveryCopy.onThisDay],
              ] as const
            ).map(([key, text]) => (
              <a
                key={key}
                href={`/${searchQuery(destinations[key]) ? `?${searchQuery(destinations[key])}` : ""}`}
                aria-current={activeView === key ? "page" : undefined}
                onClick={navigate(destinations[key])}
              >
                {text}
              </a>
            ))}
          </nav>
          <a
            className="source-link"
            href={brand.collectionURL}
            target="_blank"
            rel="noreferrer"
          >
            Source: {brand.collectionName} ↗
          </a>
        </div>
      </header>
      <main>
        {search.artist &&
          search.view !== "calendar" &&
          search.view !== "on-this-day" && (
            <ArtistPage
              key={search.artist}
              artist={search.artist}
              available={supportsDiscovery}
            />
          )}
        {(search.view === "calendar" || search.view === "on-this-day") && (
          <DateDiscovery
            search={search}
            available={supportsDiscovery}
            change={(filters) => {
              setHistory([]);
              changeSearch({
                ...emptySearch,
                artist: search.artist,
                view: search.view,
                month: search.month,
                month_day: search.month_day,
                year_from: search.year_from,
                year_to: search.year_to,
                sort: "date_desc",
                ...filters,
              });
            }}
          />
        )}
        {!search.artist && !search.view && (
          <div className="intro">
            <p className="eyebrow">Catalog preview · built on Arkhiv</p>
            <h1>{brand.tagline}</h1>
            <p>
              A room, a night, a recording. Search live shows from the Internet
              Archive’s Live Music Archive by artist, venue and date. Source
              metadata, corrections and taper lineage stay visible.
            </p>
          </div>
        )}
        <section
          aria-label="Recording catalog"
          className={`search-card${home ? "" : " compact"}`}
        >
          <form onSubmit={submit} className="catalog-filters">
            <div className="search-bar">
              <label>
                Search the catalog
                <input
                  value={draft.q}
                  onChange={(e) => editFilter("q", e.target.value)}
                  placeholder="Artist, city, tour name, song, taper…"
                  type="search"
                  maxLength={1000}
                  aria-describedby="search-help"
                />
              </label>
              <button type="submit" className="primary">
                Find shows
              </button>
            </div>
            <p id="search-help" className="search-help">
              Search stored metadata: titles, places, tour mentions, songs,
              subjects, notes, and recording credits. Tour names use text
              search; the catalog has no separate tour field.
            </p>
            <details
              className="filter-panel"
              open={refining || undefined}
              key={refining ? "refining" : "idle"}
            >
              <summary>Filter by artist, venue, year or date</summary>
              <div className="filter-fields">
                {(["artist", "venue", "year"] as const).map((key) => (
                  <label key={key}>
                    {filterLabels[key]}
                    <input
                      list={`catalog-${key}`}
                      value={draft[key]}
                      onChange={(e) => editFilter(key, e.target.value)}
                      placeholder={`Any ${key}`}
                      {...(key === "year"
                        ? {
                            inputMode: "numeric" as const,
                            pattern: "(19|20)[0-9]{2}",
                            maxLength: 4,
                          }
                        : { maxLength: 1000 })}
                    />
                  </label>
                ))}
                <label>
                  From date
                  <input
                    type="date"
                    value={draft.date_from}
                    max={draft.date_to || undefined}
                    onChange={(e) => editFilter("date_from", e.target.value)}
                  />
                </label>
                <label>
                  To date
                  <input
                    type="date"
                    value={draft.date_to}
                    min={draft.date_from || undefined}
                    onChange={(e) => editFilter("date_to", e.target.value)}
                  />
                </label>
                <label>
                  Source availability
                  <select
                    value={draft.availability}
                    onChange={(e) => editFilter("availability", e.target.value)}
                  >
                    <option value="">All recordings</option>
                    <option value="available">Available at last check</option>
                    <option value="unavailable">
                      Unavailable at last check
                    </option>
                  </select>
                </label>
              </div>
              <div className="filter-actions">
                <button type="submit" className="primary">
                  Apply filters
                </button>
              </div>
            </details>
            {(["artists", "venues", "years"] as const).map((key) => (
              <datalist key={key} id={`catalog-${key.slice(0, -1)}`}>
                {facets?.[key].map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.count.toLocaleString()} recordings
                  </option>
                ))}
              </datalist>
            ))}
            {filterError && <p role="alert">{filterError}</p>}
          </form>
        </section>
        <BrowseDirectory
          key={home ? "home" : "narrowed"}
          open={home}
          facets={facets}
          artistPhotos={artistPhotos}
          error={facetError}
          retry={() => {
            setFacetError("");
            setFacetRetry(facetRetry + 1);
          }}
          select={(filters) => {
            if (filters.artist) {
              setHistory([]);
              changeSearch({ ...emptySearch, ...filters, view: "artist" });
            } else applyFilters(filters);
          }}
        />
        <section aria-label="Recording list" className="catalog">
          <div className="catalog-heading" ref={results}>
            <h2>
              {search.view === "on-this-day"
                ? discoveryCopy.onThisDay
                : search.view === "calendar"
                  ? discoveryCopy.dateRecordings
                  : search.artist
                    ? `${search.artist} recordings`
                    : search.q
                      ? `Results for “${search.q}”`
                      : appliedFilters.length
                        ? "Filtered recordings"
                        : "Browse the tape shelf"}
            </h2>
            <div className="catalog-meta">
              <span className="catalog-count">
                {catalog
                  ? `${catalog.total.toLocaleString()} recordings`
                  : loading
                    ? "Checking the catalog…"
                    : "Catalog unavailable"}
              </span>
              <button
                type="button"
                className="quiet share"
                onClick={() => {
                  void (
                    navigator.clipboard
                      ? navigator.clipboard.writeText(window.location.href)
                      : Promise.reject(new Error("Clipboard unavailable"))
                  )
                    .then(() => setCopied("Search link copied."))
                    .catch(() =>
                      setCopied(
                        "Copy the address from your browser to share this search.",
                      ),
                    );
                }}
              >
                Copy search link
              </button>
              {copied && <span role="status">{copied}</span>}
            </div>
          </div>
          {appliedFilters.length > 0 && (
            <div className="active-filters" aria-label="Applied filters">
              {appliedFilters.map((key) => (
                <button
                  type="button"
                  className="chip"
                  key={key}
                  onClick={() => applyFilters({ [key]: "" })}
                  aria-label={`Remove ${filterLabels[key]} filter`}
                >
                  <strong>{filterLabels[key]}:</strong>{" "}
                  {search[key] === "available"
                    ? "Available at last check"
                    : search[key] === "unavailable"
                      ? "Unavailable at last check"
                      : search[key]}{" "}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              <button
                type="button"
                className="quiet"
                onClick={() => {
                  setHistory([]);
                  changeSearch({ ...emptySearch });
                }}
              >
                Clear all
              </button>
            </div>
          )}
          {loading && (
            <p role="status" className="notice">
              Loading recordings from the catalog…
            </p>
          )}
          {error && (
            <div role="alert" className="notice">
              <p>{error}</p>
              <button onClick={() => changeSearch({ ...search }, false)}>
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
              <Fragment key={recording.identifier}>
                {search.sort === "date_desc" &&
                  (index === 0 ||
                    label(catalog.items[index - 1].date).slice(0, 4) !==
                      label(recording.date).slice(0, 4)) && (
                    <h3 className="recording-year">
                      {label(recording.date).slice(0, 4)}
                    </h3>
                  )}
                <button
                  className="tape"
                  key={recording.identifier}
                  onClick={() => open(recording.identifier)}
                >
                  <span className="tape-number">
                    {String(history.length * 100 + index + 1).padStart(3, "0")}
                  </span>
                  <Artwork
                    artist={artistImageFor(recording.creator, artistPhotos)}
                    name={label(recording.creator)}
                  />
                  <span className="tape-info">
                    <strong>
                      {label(recording.creator) || "Unknown artist"}
                    </strong>
                    <span>
                      {label(recording.title) || recording.identifier}
                      {recording.unavailable ? " · Source unavailable" : ""}
                    </span>
                    <span className="tape-place">
                      {[label(recording.venue), label(recording.coverage)]
                        .filter(Boolean)
                        .join(" · ") || "Venue and place not recorded"}
                    </span>
                  </span>
                  <span className="tape-date">
                    {label(recording.date).slice(0, 10) || "Date unknown"}
                  </span>
                  <span aria-hidden="true" className="arrow">
                    →
                  </span>
                </button>
              </Fragment>
            ))}
          </div>
          {catalog && (catalog.cursor || history.length > 0) && (
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
                Page {history.length + 1} ·{" "}
                {search.sort === "date_desc"
                  ? "newest first"
                  : "ordered by catalog identifier"}
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
          <div>
            <p>
              {brand.name} is built on Arkhiv. Recorded by tapers, preserved by
              the Internet Archive.
            </p>
            <p>
              Availability and playback depend on the source recording. Audio
              streams from the Internet Archive.
            </p>
          </div>
          {status && (
            <p className="import-status">
              {status.imported.toLocaleString()} metadata records imported
              {status.playback &&
                ` · ${status.playback.reviewed.toLocaleString()} approved for streaming`}
              {status.discovery_complete
                ? " · Collection discovery complete"
                : " · Collection discovery incomplete"}
              {[
                [status.pending, "queued"],
                [status.failed, "need attention"],
                [status.playback?.pending, "awaiting playback review"],
                [status.playback?.unsupported, "unsupported"],
                [status.playback?.held, "held for operator review"],
                [status.playback?.retry, "review retries"],
              ]
                .filter(([count]) => Number(count) > 0)
                .map(
                  ([count, text]) =>
                    ` · ${Number(count).toLocaleString()} ${text}`,
                )
                .join("")}
              {status.last_error && ` · Import paused: ${status.last_error}`}
            </p>
          )}
        </footer>
      </main>
      {selected && (
        <dialog
          ref={dialog}
          onCancel={() => setSelected("")}
          className="detail-backdrop"
        >
          <section className="recording-detail" aria-label="Recording details">
            <div className="detail-header">
              <p className="eyebrow">Recording label</p>
              <button
                className="quiet close"
                onClick={() => {
                  resolution.current?.abort();
                  setResolving(false);
                  setSelected("");
                }}
              >
                Close ×
              </button>
            </div>
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
                <Artwork
                  recording={recordingArtwork(
                    selected,
                    detail.files || [],
                    !!detail.unavailable,
                  )}
                  artist={artistImageFor(detail.metadata.creator, artistPhotos)}
                  name={label(detail.metadata.title) || selected}
                  caption
                />
                <div
                  className="related-browse"
                  aria-label="Browse related recordings"
                >
                  {label(detail.metadata.creator) && (
                    <button
                      onClick={() =>
                        related({ artist: label(detail.metadata.creator) })
                      }
                    >
                      More by {label(detail.metadata.creator)}
                    </button>
                  )}
                  {label(detail.metadata.venue) && (
                    <button
                      onClick={() =>
                        related({ venue: label(detail.metadata.venue) })
                      }
                    >
                      At this venue
                    </button>
                  )}
                  {/^\d{4}-\d{2}-\d{2}$/.test(label(detail.metadata.date)) && (
                    <button
                      onClick={() =>
                        related({
                          year: "",
                          date_from: label(detail.metadata.date),
                          date_to: label(detail.metadata.date),
                        })
                      }
                    >
                      On this date
                    </button>
                  )}
                  {label(detail.metadata.coverage) && (
                    <button
                      onClick={() =>
                        related({ q: label(detail.metadata.coverage) })
                      }
                    >
                      Search this place
                    </button>
                  )}
                </div>
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
                    "subject",
                    "lineage",
                    "songs",
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
          <Artwork
            recording={recordingArtwork(
              playing.identifier,
              playing.recording.files || [],
            )}
            artist={artistImageFor(
              playing.recording.metadata.creator,
              artistPhotos,
            )}
            name={label(playing.recording.metadata.title)}
          />
          <div className="player-meta">
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
          <div className="player-actions">
            <button
              onClick={advance}
              disabled={
                resolving || playing.index + 1 === playing.tracks.length
              }
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
          </div>
        </aside>
      )}
    </div>
  );
}
