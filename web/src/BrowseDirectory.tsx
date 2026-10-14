import { useState } from "react";
import Artwork from "./Artwork";
import { artistImageFor } from "./artist-images";
import type { Facets } from "./archive";
import type { Search } from "./browse";

type Dimension = "artists" | "venues" | "years";
const dimensions = {
  artists: { label: "Artists", key: "artist" },
  venues: { label: "Venues", key: "venue" },
  years: { label: "Years", key: "year" },
} as const;
export default function BrowseDirectory({
  facets,
  error,
  retry,
  select,
}: {
  facets?: Facets;
  error: string;
  retry: () => void;
  select: (filters: Partial<Search>) => void;
}) {
  const [dimension, setDimension] = useState<Dimension>("artists");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("count");
  const [expanded, setExpanded] = useState(false);
  const entries = [...(facets?.[dimension] || [])]
    .filter((entry) =>
      entry.value
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "count"
        ? b.count - a.count || a.value.localeCompare(b.value)
        : dimension === "years"
          ? b.value.localeCompare(a.value)
          : a.value.localeCompare(b.value),
    );
  const visible = expanded ? entries : entries.slice(0, 12);
  return (
    <details className="browse-directory" open>
      <summary>Explore the collection</summary>
      <p>
        Choose an artist, a room, or a year to narrow your search. Counts
        describe imported recordings.
      </p>
      <div className="browse-controls">
        <div className="dimension-buttons" role="group" aria-label="Browse by">
          {(Object.keys(dimensions) as Dimension[]).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={dimension === key}
              onClick={() => {
                setDimension(key);
                setQuery("");
                setExpanded(false);
              }}
            >
              {dimensions[key].label}
            </button>
          ))}
        </div>
        <label>
          Find {dimensions[dimension].label.toLowerCase()}
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setExpanded(false);
            }}
            placeholder={`Search ${dimensions[dimension].label.toLowerCase()} suggestions…`}
          />
        </label>
        <label>
          Directory order
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="count">Most recordings</option>
            <option value="name">
              {dimension === "years" ? "Newest year" : "Alphabetical"}
            </option>
          </select>
        </label>
      </div>
      {!facets && !error && <p role="status">Loading browse suggestions…</p>}
      {error && (
        <p role="status">
          Browse suggestions are unavailable. Search still works.{" "}
          <button type="button" onClick={retry}>
            Retry suggestions
          </button>
        </p>
      )}
      {facets && (
        <>
          <ul className="directory-list">
            {visible.map((entry) => (
              <li key={entry.value}>
                <button
                  type="button"
                  onClick={() =>
                    select({
                      [dimensions[dimension].key]: entry.value,
                      ...(dimension === "years"
                        ? { date_from: "", date_to: "" }
                        : {}),
                    })
                  }
                >
                  {dimension === "artists" && (
                    <Artwork
                      artist={artistImageFor(entry.value)}
                      name={entry.value}
                    />
                  )}
                  <span className="directory-name">{entry.value}</span>
                  <small>{entry.count.toLocaleString()}</small>
                </button>
              </li>
            ))}
          </ul>
          {entries.length === 0 && (
            <p>
              No suggestions match. You can still type a value in the filters
              below.
            </p>
          )}
          <div className="directory-footer">
            <small>
              Showing {visible.length} of {entries.length} suggestions.
              Suggestions are limited by the catalog service; use the filters
              for values not listed here.
            </small>
            {entries.length > 12 && (
              <button type="button" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Show fewer" : "Show all suggestions"}
              </button>
            )}
          </div>
          <div
            className="decade-shortcuts"
            role="group"
            aria-label="Browse a decade"
          >
            <span>By decade</span>
            {[
              ...new Set(
                facets.years
                  .map((entry) => Math.floor(Number(entry.value) / 10) * 10)
                  .filter(Number.isFinite),
              ),
            ]
              .sort((a, b) => b - a)
              .map((decade) => (
                <button
                  type="button"
                  key={decade}
                  onClick={() =>
                    select({
                      year: "",
                      date_from: `${decade}-01-01`,
                      date_to: `${decade + 9}-12-31`,
                    })
                  }
                >
                  {decade}s
                </button>
              ))}
          </div>
        </>
      )}
    </details>
  );
}
