import { representationURL } from "@subcult/archive-viewer/catalog";
import type { RepresentationTransport } from "@subcult/archive-viewer/catalog";
import StreamPlayer from "./StreamPlayer";
import { trackDisplayTitle } from "./track-title";
import Artwork from "./Artwork";
import NavIcon from "./NavIcon";
import {
  artistImageFor,
  artistPhotosFrom,
  type ArtistPhotos,
} from "./artist-images";
import { recordingArtwork } from "./artwork";
import BrowseDirectory from "./BrowseDirectory";
import ArtistPage from "./ArtistPage";
import DateDiscovery from "./DateDiscovery";
import RecordingDetail, { TrackList } from "./RecordingDetail";
import RecordingContent from "./RecordingContent";
import {
  emptySearch,
  pageView,
  catalogQuery,
  filterLabels,
  backTarget,
  readFocus,
  readPages,
  readScroll,
  readSearch,
  recordingPage,
  searchQuery,
  validateDates,
} from "./browse";
import type { FilterKey, Reveal, Search } from "./browse";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent } from "react";
import { getJSON, label, missingItemMessage, tracksFor } from "./archive";
import { catalogData } from "./catalog-data";
import type { Detail, Recording, Track, ImportStatus, Facets } from "./archive";
import { brand, discoveryCopy, playerCopy, shelfCopy } from "./brand";
import {
  clampRail,
  isRail,
  placements,
  railMax,
  railMin,
  railQuery,
  readPlacement,
  readRailWidth,
  writePlacement,
  writeRailWidth,
} from "./player-placement";
import type { Placement } from "./player-placement";
import { arrangeShelf, nextSort, shelfColumns } from "./shelf-order";
import type { ShelfColumn, ShelfSort } from "./shelf-order";

type Catalog = {
  items: Recording[];
  total: number;
  cursor?: string;
  status: ImportStatus;
};
// Phones get the mini bar and full-screen player; keep in step with the 650px
// breakpoint in styles.css.
const phoneQuery = "(max-width: 650px)";
function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia?.(query).matches ?? false,
    () => false,
  );
}

export default function App() {
  const [search, setSearch] = useState<Search>(() =>
    readSearch(typeof window === "undefined" ? "" : window.location.search),
  );
  const view = pageView(search);
  const routeID = view === "recording" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(search.id) ? search.id : "";
  const [supportsDiscovery, setSupportsDiscovery] = useState<boolean>();
  // Sorting and filtering the loaded page stay in this view; the catalog
  // order in the search covers every page.
  const [shelfFilter, setShelfFilter] = useState("");
  const [shelfSort, setShelfSort] = useState<ShelfSort>();
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
  const [reserved, setReserved] = useState(0);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const detailID = selected || routeID;
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
  const [placement, setPlacement] = useState<Placement>(readPlacement);
  // One disclosure for the playing recording, shared by every placement.
  const [playerDetails, setPlayerDetails] = useState(false);
  const detailsToggle = useRef<HTMLButtonElement>(null);
  const closePlayerDetails = () => {
    setPlayerDetails(false);
    detailsToggle.current?.focus({ preventScroll: true });
  };
  const shell = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const hasPlayer = !!playing;
  // A sidebar is a listening view: its tracklist opens with it and closes when
  // the player leaves the sidebar or the window falls back to the bottom bar.
  const wide = useMedia(railQuery);
  const railShown = isRail(placement) && wide;
  useEffect(() => {
    if (hasPlayer) setPlayerDetails(railShown);
  }, [railShown, hasPlayer]);
  // On phones every placement but the mini player is a compact bar that opens
  // a full-screen player. The rest of the page is inert while it is open.
  const phone = useMedia(phoneQuery);
  const compact = phone && placement !== "mini";
  const [expanded, setExpanded] = useState(false);
  const fullScreen = compact && expanded && hasPlayer;
  const expandButton = useRef<HTMLButtonElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);
  const expandPlayer = () => {
    setExpanded(true);
    setPlayerDetails(true);
  };
  const collapsePlayer = () => {
    setExpanded(false);
    setPlayerDetails(false);
  };
  useEffect(() => {
    if (!compact || !hasPlayer) setExpanded(false);
  }, [compact, hasPlayer]);
  const wasFullScreen = useRef(false);
  useEffect(() => {
    if (fullScreen) collapseButton.current?.focus({ preventScroll: true });
    else if (wasFullScreen.current)
      expandButton.current?.focus({ preventScroll: true });
    wasFullScreen.current = fullScreen;
  }, [fullScreen]);
  const [railWidth, setRailWidth] = useState(readRailWidth);
  const resizeRail = (width: number) => {
    const next = clampRail(width, window.innerWidth);
    setRailWidth(next);
    writeRailWidth(next);
  };
  const railKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    const grow = placement === "left" ? "ArrowRight" : "ArrowLeft";
    const shrink = placement === "left" ? "ArrowLeft" : "ArrowRight";
    const step = event.shiftKey ? 64 : 16;
    const next =
      event.key === grow
        ? railWidth + step
        : event.key === shrink
          ? railWidth - step
          : event.key === "Home"
            ? railMin
            : event.key === "End"
              ? railMax(window.innerWidth)
              : undefined;
    if (next === undefined) return;
    event.preventDefault();
    resizeRail(next);
  };
  // Placement only changes classes on the same player, so the audio element and
  // its playback state are untouched. Layout follows the player's measured size.
  useEffect(() => {
    const root = shell.current;
    const player = dock.current;
    if (!root || !player) return;
    const measure = () => {
      const height = `${player.getBoundingClientRect().height}px`;
      root.style.setProperty("--player-height", height);
      root.style.setProperty("--scroll-offset", placement === "top" ? height : "0px");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(player);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--player-height");
      root.style.removeProperty("--scroll-offset");
    };
  }, [placement, hasPlayer]);
  // Both name the recording they belong to, so a failure or pending resolution
  // for the playing recording never shows on another one being inspected.
  const [playError, setPlayError] = useState<{ id: string; message: string }>();
  const [resolving, setResolving] = useState("");
  const resolution = useRef<AbortController | null>(null);
  useEffect(() => () => resolution.current?.abort(), []);
  useEffect(() => {
    const restorePage = (event: PopStateEvent) => {
      const next = readSearch(window.location.search);
      dialog.current?.close();
      setSelected("");
      setDetail(undefined);
      setDetailError("");
      setDraft(next);
      setSearch(next);
      setHistory(readPages(event.state));
      restoreTo.current = readScroll(event.state) ?? 0;
      focusHeading.current = false;
      refocus.current = readFocus(event.state);
      setLoading(true);
      setCatalog(undefined);
      setError("");
      setFilterError("");
      setCopied("");
    };
    window.addEventListener("popstate", restorePage);
    return () => window.removeEventListener("popstate", restorePage);
  }, []);
  const dialog = useRef<HTMLDialogElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const refocus = useRef<string | undefined>(undefined);
  const opener = useRef<HTMLElement | null>(null);
  const results = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLElement>(null);
  const catalogSection = useRef<HTMLElement>(null);
  const reveal = useRef<Reveal>("none");
  const restoreTo = useRef<number | undefined>(undefined);
  // Results fetched after a position is restored would otherwise be too short
  // for the browser to reach it, so position is managed here.
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    restoreTo.current = readScroll(window.history.state);
    let timer = 0;
    const save = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        window.history.replaceState(
          { ...window.history.state, scroll: window.scrollY },
          "",
        );
      }, 150);
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", save);
    };
  }, []);
  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
  }, [selected]);
  // Opening the page from the panel moves focus to its heading, because the
  // tape that opened the panel is no longer on screen.
  useEffect(() => {
    if (view !== "recording" || !focusHeading.current) return;
    focusHeading.current = false;
    pageHeading.current?.focus({ preventScroll: true });
  }, [view, routeID]);
  const pageTitle =
    view === "recording" && detail
      ? label(detail.metadata.title) || routeID
      : "";
  useEffect(() => {
    if (!pageTitle) return;
    const previous = document.title;
    document.title = `${pageTitle} · ${brand.name}`;
    return () => {
      document.title = previous;
    };
  }, [pageTitle]);
  // Artist photographs are decorative; an older engine or a failed request
  // leaves the curated images in place.
  useEffect(() => {
    const controller = new AbortController();
    catalogData
      .capabilities(controller.signal)
      .then((version) =>
        version.modules.source_artist_photos === "1"
          ? catalogData.read<{ artists: Parameters<typeof artistPhotosFrom>[0] }>(
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
    if (search.view === "recording" || search.view === "explore") {
      setLoading(false);
      return () => controller.abort();
    }
    catalogData
      .capabilities(controller.signal)
      .then((version) => {
        // A public engine advertises source modules but answers every
        // source-catalog request 404, so the audience gates the inventory.
        const isPrivate = version.audience === "private";
        const available =
          isPrivate && version.modules.source_discovery === "1";
        setSupportsDiscovery(available);
        if (!isPrivate) throw new Error(discoveryCopy.publicEngine);
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
        return catalogData.read<Catalog>(
          `/api/source-catalog/v1/items?collection=etree&${catalogQuery(search)}`,
          controller.signal,
        );
      })
      .then((page) => {
        if (!controller.signal.aborted) setCatalog(page);
      })
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
    if (!detailID) return;
    const controller = new AbortController();
    getJSON<Detail>(
      `/api/source-catalog/v1/items/${encodeURIComponent(detailID)}?collection=etree`,
      controller.signal,
    )
      .then(setDetail)
      .catch((e: Error) => {
        if (e.name !== "AbortError") setDetailError(e.message);
      });
    return () => controller.abort();
  }, [detailID, selected, search, retry]);
  useEffect(() => {
    const controller = new AbortController();
    catalogData
      .read<Facets>(
        "/api/source-catalog/v1/facets?collection=etree",
        controller.signal,
      )
      .then((next) => {
        if (!controller.signal.aborted) setFacets(next);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setFacetError(error.message);
      });
    return () => controller.abort();
  }, [facetRetry]);
  useEffect(() => {
    const behavior: ScrollBehavior = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches
      ? "auto"
      : "smooth";
    const target = reveal.current;
    reveal.current = "none";
    if (target === "top") window.scrollTo({ top: 0, behavior });
    else if (target === "results" && results.current)
      results.current.scrollIntoView({ behavior, block: "start" });
    else if (target !== "none")
      page.current
        ?.querySelector("h1")
        ?.scrollIntoView({ behavior, block: "start" });
  }, [search]);
  useEffect(() => {
    if (loading || restoreTo.current === undefined) return;
    const top = restoreTo.current;
    restoreTo.current = undefined;
    // After this commit paints, so the restored rows give the page its height.
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo(0, top);
      // Back from a recording page returns focus to the tape it was opened from.
      const id = refocus.current;
      refocus.current = undefined;
      if (id)
        page.current
          ?.querySelector<HTMLElement>(`[data-recording="${CSS.escape(id)}"]`)
          ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, catalog]);
  const changeSearch = (
    next: Search,
    {
      push = true,
      pages = [],
      show = "none",
    }: { push?: boolean; pages?: string[]; show?: Reveal } = {},
  ) => {
    const validation = validateDates(next);
    if (validation) {
      setFilterError(validation);
      return;
    }
    setReserved(show === "none" ? (catalogSection.current?.offsetHeight ?? 0) : 0);
    dialog.current?.close();
    setSelected("");
    setDetail(undefined);
    setDetailError("");
    setFilterError("");
    setCopied("");
    setLoading(true);
    setError("");
    setCatalog(undefined);
    setSearch(next);
    setDraft(next);
    reveal.current = show;
    if (push)
      window.history.pushState(
        // inApp marks entries Back can return to without leaving Lineage;
        // from names the view that Back would show.
        { pages, scroll: window.scrollY, inApp: true, from: view },
        "",
        `${window.location.pathname}${searchQuery(next) ? `?${searchQuery(next)}` : ""}`,
      );
  };
  const applyFilters = (filters: Partial<Search>, show: Reveal = "none") => {
    if (filters.month_day === "" && search.view === "on-this-day")
      filters = { ...filters, view: "", sort: "" };
    if (filters.year_from === "" || filters.year_to === "")
      filters = { ...filters, year_from: "", year_to: "" };
    setHistory([]);
    changeSearch({ ...search, ...filters, cursor: "" }, { show });
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (validateDates(draft)) {
      setFilterError(validateDates(draft));
      return;
    }
    setHistory([]);
    changeSearch(
      {
        ...draft,
        q: draft.q.trim(),
        artist: draft.artist.trim(),
        venue: draft.venue.trim(),
        cursor: "",
      },
      { show: "results" },
    );
  };
  const editFilter = (key: FilterKey, value: string) => {
    setDraft({ ...draft, [key]: value });
    setFilterError("");
  };
  const related = (filters: Partial<Search>) => {
    resolution.current?.abort();
    setResolving("");
    closeDetail();
    setHistory([]);
    changeSearch(
      {
        ...emptySearch,
        ...filters,
        view: filters.artist ? "artist" : "",
      },
      { show: "heading" },
    );
  };
  const open = (id: string) => {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDetail(undefined);
    setDetailError("");
    setSelected(id);
  };
  // Close the dialog before it unmounts so focus returns to the tape that
  // opened it instead of falling back to the document body.
  const closeDetail = () => {
    dialog.current?.close();
    opener.current?.focus({ preventScroll: true });
    opener.current = null;
    setSelected("");
  };
  const tracks =
    detail && !detail.unavailable
      ? tracksFor(detailID, detail.files || []).filter((track) =>
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
      setPlayError({
        id: identifier,
        message: "Playback is unavailable for this recording.",
      });
      return;
    }
    setResolving(identifier);
    setPlayError(undefined);
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
        closeDetail();
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setPlayError({
          id: identifier,
          message:
            error instanceof Error ? error.message : "Playback is unavailable.",
        });
    } finally {
      if (!controller.signal.aborted) setResolving("");
    }
  };
  const play = (index: number) => {
    if (detail) void startTrack(detail, tracks, index, detailID);
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
  const retreat = () => {
    if (playing && playing.index > 0)
      void startTrack(
        playing.recording,
        playing.tracks,
        playing.index - 1,
        playing.identifier,
      );
  };
  const pad = (value: number) => String(value).padStart(2, "0");
  const now = new Date();
  const destinations = {
    browse: { ...emptySearch },
    search: { ...emptySearch, view: "search" },
    explore: { ...emptySearch, view: "explore", dimension: "artists" },
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
  const activeView = view === "artist" ? "browse" : view;
  const plainClick = (event: MouseEvent) =>
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey;
  const navigate =
    (next: Search, show: Reveal, focus = false) => (event: MouseEvent) => {
      if (!plainClick(event)) return;
      event.preventDefault();
      // A recording link to the page already shown only moves focus.
      if (focus && searchQuery(next) === searchQuery(search)) {
        pageHeading.current?.focus({ preventScroll: true });
        return;
      }
      focusHeading.current = focus;
      setHistory([]);
      changeSearch(next, { show });
    };
  const goBack = (event: MouseEvent) => {
    if (!plainClick(event)) return;
    event.preventDefault();
    if (backTarget(window.history.state) === "history") window.history.back();
    else {
      setHistory([]);
      changeSearch({ ...emptySearch }, { show: "top" });
    }
  };
  const appliedFilters = (Object.keys(filterLabels) as FilterKey[]).filter(
    (key) => search[key],
  );
  const refining =
    (["venue", "year", "date_from", "date_to", "availability"] as const).some(
      (key) => search[key],
    ) ||
    (!!search.artist && !search.view);
  const home = view === "browse";
  const showCatalog = view !== "explore" && view !== "recording";
  const status = catalog?.status;
  const shelfRows = arrangeShelf(catalog?.items ?? [], shelfFilter, shelfSort);
  const sortButton = (column: ShelfColumn) => {
    const active = shelfSort?.column === column;
    const direction = active
      ? shelfSort.descending
        ? shelfCopy.descending
        : shelfCopy.ascending
      : "";
    return (
      <button
        key={column}
        type="button"
        className="sort-button"
        aria-pressed={active}
        aria-label={shelfCopy.sortBy(shelfCopy.columns[column], direction)}
        onClick={() => setShelfSort(nextSort(shelfSort, column))}
      >
        {shelfCopy.columns[column]}
        <span aria-hidden="true">
          {active ? (shelfSort.descending ? " ↓" : " ↑") : ""}
        </span>
      </button>
    );
  };
  return (
    <div
      ref={shell}
      className={`app-shell${playing ? ` has-player player-${placement}` : ""}`}
      style={{ "--rail-width": `${railWidth}px` } as CSSProperties}
    >
      <div className="stripes" aria-hidden="true" />
      <header className="masthead" inert={fullScreen}>
        <div className="masthead-inner">
          <a
            className="wordmark"
            href="/"
            onClick={navigate(destinations.browse, "top")}
          >
            <strong>{brand.name}</strong>
            <span>{brand.descriptor}</span>
          </a>
          <nav className="primary-nav" aria-label="Explore recordings">
            {(
              [
                ["browse", discoveryCopy.browse, discoveryCopy.browseShort],
                ["search", discoveryCopy.search, discoveryCopy.searchShort],
                ["explore", discoveryCopy.explore, discoveryCopy.exploreShort],
                ["calendar", discoveryCopy.calendar, discoveryCopy.calendarShort],
                ["on-this-day", discoveryCopy.onThisDay, discoveryCopy.onThisDay],
              ] as const
            ).map(([key, text, short]) => (
              <a
                key={key}
                href={`/${searchQuery(destinations[key]) ? `?${searchQuery(destinations[key])}` : ""}`}
                aria-current={activeView === key ? "page" : undefined}
                onClick={navigate(destinations[key], key === "browse" ? "top" : "heading")}
              >
                <NavIcon name={key} />
                <span className="nav-long">{text}</span>
                <span className="nav-short" aria-hidden="true">
                  {short}
                </span>
              </a>
            ))}
          </nav>
          {facets && facets.artists.length > 0 && (
            <nav className="sidebar-artists" aria-label={discoveryCopy.topArtists}>
              <p className="eyebrow">{discoveryCopy.topArtists}</p>
              {[...facets.artists]
                .sort((a, b) => b.count - a.count)
                .slice(0, 8)
                .map((artist) => {
                const next = { ...emptySearch, artist: artist.value, view: "artist" };
                return (
                  <a
                    key={artist.value}
                    href={`/?${searchQuery(next)}`}
                    aria-current={
                      view === "artist" && search.artist === artist.value
                        ? "page"
                        : undefined
                    }
                    onClick={navigate(next, "heading")}
                  >
                    <Artwork
                      artist={artistImageFor(artist.value, artistPhotos)}
                      name={artist.value}
                    />
                    <span className="sidebar-artist-name">{artist.value}</span>
                    <small>{artist.count.toLocaleString()}</small>
                  </a>
                );
              })}
            </nav>
          )}
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
      <main ref={page} inert={fullScreen}>
        {search.artist && (view === "artist" || view === "search") && (
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
        {home && (
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
        {view === "search" && <h1>{discoveryCopy.search}</h1>}
        {view === "explore" && <h1>{discoveryCopy.explore}</h1>}
        {view === "recording" && (
          <section aria-label="Recording page" className="recording-page">
            <a className="back-link" href="/" onClick={goBack}>
              ← {discoveryCopy.backToRecordings}
            </a>
            <p className="eyebrow">{discoveryCopy.recording}</p>
            <h1 ref={pageHeading} tabIndex={-1}>
              {detail
                ? label(detail.metadata.creator) || "Unknown artist"
                : discoveryCopy.recording}
            </h1>
            {!routeID ? (
              <p role="alert">{discoveryCopy.invalidRecording}</p>
            ) : detailError === missingItemMessage ? (
              <p role="alert">{discoveryCopy.recordingMissing}</p>
            ) : detailError ? (
              <div role="alert" className="notice">
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
            ) : !detail ? (
              <p role="status">Loading recording…</p>
            ) : (
              <RecordingDetail
                identifier={routeID}
                detail={detail}
                tracks={tracks}
                artistPhotos={artistPhotos}
                resolving={resolving === detailID}
                playError={playError?.id === detailID ? playError.message : ""}
                play={play}
                related={related}
              />
            )}
          </section>
        )}
        {showCatalog && <section
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
        </section>}
        {view !== "recording" && <BrowseDirectory
          key={view === "explore" ? `explore:${search.dimension}` : home ? "home" : "narrowed"}
          initialDimension={view === "explore" && (search.dimension === "venues" || search.dimension === "years") ? search.dimension : "artists"}
          onDimensionChange={view === "explore" ? (dimension) => changeSearch({ ...search, dimension }) : undefined}
          open={home || view === "explore"}
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
              changeSearch(
                { ...emptySearch, ...filters, view: "artist" },
                { show: "heading" },
              );
            } else
              applyFilters(
                { ...filters, ...(view === "explore" ? { view: "search" } : {}) },
                "results",
              );
          }}
        />}
        {showCatalog && <section
          aria-label="Recording list"
          className="catalog"
          ref={catalogSection}
          aria-busy={loading}
          style={loading && reserved ? { minHeight: reserved } : undefined}
        >
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
                  changeSearch({ ...emptySearch }, { show: "top" });
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
              <button
                onClick={() => {
                  catalogData.resetCapabilities();
                  changeSearch({ ...search }, { push: false });
                }}
              >
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
          {catalog && catalog.items.length > 0 && (
            <div className="shelf-tools">
              <label className="shelf-filter">
                <span className="visually-hidden">{shelfCopy.filterLabel}</span>
                <input
                  type="search"
                  value={shelfFilter}
                  placeholder={shelfCopy.filterPlaceholder}
                  onChange={(event) => setShelfFilter(event.target.value)}
                />
              </label>
              {supportsDiscovery &&
                search.view !== "calendar" &&
                search.view !== "on-this-day" && (
                  <label className="shelf-order">
                    <span>{shelfCopy.order}</span>
                    <select
                      value={search.sort === "date_desc" ? "date_desc" : ""}
                      onChange={(event) =>
                        applyFilters({ sort: event.target.value })
                      }
                    >
                      <option value="">{shelfCopy.catalogOrder}</option>
                      <option value="date_desc">{shelfCopy.newestFirst}</option>
                    </select>
                  </label>
                )}
              <span className="shelf-count" role="status">
                {shelfFilter.trim() || shelfSort
                  ? shelfCopy.shown(shelfRows.length, catalog.items.length)
                  : ""}
              </span>
            </div>
          )}
          {catalog && catalog.items.length > 0 && shelfRows.length === 0 && (
            <div className="notice">
              <p>{shelfCopy.noMatch(shelfFilter.trim())}</p>
              <button onClick={() => setShelfFilter("")}>
                {shelfCopy.clearFilter}
              </button>
            </div>
          )}
          <div className="tape-list">
            {catalog && catalog.items.length > 0 && (
              <div className="tape-head">
                <span className="tape-number" aria-hidden="true">
                  #
                </span>
                <span aria-hidden="true" />
                <span className="tape-head-info">
                  {shelfColumns
                    .filter((column) => column !== "date")
                    .map((column) => sortButton(column))}
                </span>
                {sortButton("date")}
                <span aria-hidden="true" />
              </div>
            )}
            {shelfRows.map(({ recording, index }, position) => (
              <Fragment key={recording.identifier}>
                {search.sort === "date_desc" &&
                  !shelfSort &&
                  !shelfFilter.trim() &&
                  (position === 0 ||
                    label(shelfRows[position - 1].recording.date).slice(0, 4) !==
                      label(recording.date).slice(0, 4)) && (
                    <h3 className="recording-year">
                      {label(recording.date).slice(0, 4)}
                    </h3>
                  )}
                <button
                  className="tape"
                  key={recording.identifier}
                  data-recording={recording.identifier}
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
                    <span title={label(recording.title) || recording.identifier}>
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
                  const pages = history.slice(0, -1);
                  setHistory(pages);
                  changeSearch({ ...search, cursor }, { pages, show: "results" });
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
                  const pages = [...history, search.cursor];
                  setHistory(pages);
                  changeSearch(
                    { ...search, cursor: catalog.cursor || "" },
                    { pages, show: "results" },
                  );
                }}
              >
                Next 100 →
              </button>
            </nav>
          )}
        </section>}
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
          onCancel={closeDetail}
          className="detail-backdrop"
        >
          <section className="recording-detail" aria-label="Recording details">
            <div className="detail-header">
              <p className="eyebrow">Recording label</p>
              <button
                className="quiet close"
                onClick={() => {
                  resolution.current?.abort();
                  setResolving("");
                  closeDetail();
                }}
              >
                Close ×
              </button>
            </div>
            {!detail && !detailError && <p role="status">Loading recording…</p>}
            {detailError === missingItemMessage && (
              <p role="alert">{discoveryCopy.recordingMissing}</p>
            )}
            {detailError && detailError !== missingItemMessage && (
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
              <RecordingDetail
                identifier={selected}
                detail={detail}
                tracks={tracks}
                artistPhotos={artistPhotos}
                heading={(artist) => <h2>{artist}</h2>}
                actions={
                  <a
                    className="recording-page-link"
                    href={`/?${searchQuery(recordingPage(selected))}`}
                    onClick={(event) => {
                      if (plainClick(event))
                        window.history.replaceState(
                          { ...window.history.state, focus: selected },
                          "",
                        );
                      navigate(recordingPage(selected), "top", true)(event);
                    }}
                  >
                    {discoveryCopy.openRecording}
                  </a>
                }
                resolving={resolving === detailID}
                playError={playError?.id === detailID ? playError.message : ""}
                play={play}
                related={related}
              />
            )}
          </section>
        </dialog>
      )}
      {playing && current && (
        <aside
          ref={dock}
          className={`player ${placement}${compact ? " compact" : ""}${fullScreen ? " expanded" : ""}`}
          aria-label="Audio player"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (fullScreen) {
              event.stopPropagation();
              collapsePlayer();
            } else if (playerDetails) {
              event.stopPropagation();
              closePlayerDetails();
            }
          }}
        >
          {fullScreen && (
            <button
              ref={collapseButton}
              type="button"
              className="player-collapse"
              aria-label={playerCopy.closePlayer}
              onClick={collapsePlayer}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
          {compact && !fullScreen && (
            <button
              ref={expandButton}
              type="button"
              className="player-expand"
              aria-label={playerCopy.openPlayer}
              aria-expanded={false}
              onClick={expandPlayer}
            />
          )}
          {railShown && (
            <div
              className="rail-resizer"
              role="separator"
              aria-orientation="vertical"
              aria-label={playerCopy.resize}
              aria-valuemin={railMin}
              aria-valuemax={railMax(window.innerWidth)}
              aria-valuenow={railWidth}
              tabIndex={0}
              onKeyDown={railKeys}
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                setRailWidth(
                  clampRail(
                    placement === "left"
                      ? event.clientX
                      : window.innerWidth - event.clientX,
                    window.innerWidth,
                  ),
                );
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                writeRailWidth(railWidth);
              }}
            />
          )}
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
            <strong title={`Original title: ${current.title || "Not recorded"} · File: ${current.name}`}>
              {trackDisplayTitle(current)}
            </strong>
            <p>
              Track {playing.index + 1} of {playing.tracks.length}
            </p>
            <div className="player-links">
              <a
                href={`/?${searchQuery(recordingPage(playing.identifier))}`}
                onClick={(event) => {
                  if (fullScreen && plainClick(event)) collapsePlayer();
                  navigate(recordingPage(playing.identifier), "top", true)(event);
                }}
              >
                {playerCopy.openRecording}
              </a>
              <button
                ref={detailsToggle}
                className="quiet"
                aria-expanded={playerDetails}
                aria-controls="player-details"
                onClick={() =>
                  playerDetails ? closePlayerDetails() : setPlayerDetails(true)
                }
              >
                {playerDetails ? playerCopy.hideDetails : playerCopy.showDetails}
              </button>
            </div>
          </div>
          {playError?.id === playing.identifier && (
            <p role="alert">{playError.message}</p>
          )}
          <StreamPlayer
            key={playing.url}
            track={{ ...current, url: playing.url }}
            onEnded={advance}
            onNext={advance}
            onPrevious={retreat}
            hasNext={!resolving && playing.index + 1 < playing.tracks.length}
            hasPrevious={!resolving && playing.index > 0}
            title={trackDisplayTitle(current)}
            artist={label(playing.recording.metadata.creator)}
            album={label(playing.recording.metadata.title)}
          />
          <div className="player-actions">
            <label className="player-placement">
              <span>{playerCopy.placement}</span>
              <select
                value={placement}
                onChange={(event) => {
                  const next = event.target.value as Placement;
                  setPlacement(next);
                  writePlacement(next);
                }}
              >
                {placements.map((option) => (
                  <option key={option} value={option}>
                    {playerCopy[option]}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                resolution.current?.abort();
                setResolving("");
                setPlayError(undefined);
                setPlayerDetails(false);
                setPlaying(undefined);
              }}
            >
              Stop ×
            </button>
          </div>
          {playerDetails && (
            <section
              id="player-details"
              className="player-details"
              aria-label={playerCopy.details}
            >
              <div className="player-details-head">
                <p>
                  <strong>
                    {label(playing.recording.metadata.creator) ||
                      "Unknown artist"}
                  </strong>{" "}
                  · {label(playing.recording.metadata.title) || playing.identifier}
                </p>
                <button onClick={closePlayerDetails}>Close ×</button>
              </div>
              <div className="recording-body">
                <h3>{playing.tracks.length} playable tracks</h3>
                <TrackList
                  tracks={playing.tracks}
                  current={playing.index}
                  play={(index) =>
                    void startTrack(
                      playing.recording,
                      playing.tracks,
                      index,
                      playing.identifier,
                    )
                  }
                />
                <RecordingContent detail={playing.recording} />
              </div>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
