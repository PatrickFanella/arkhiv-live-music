import { useEffect, useState } from "react";
import type { MouseEvent } from "react";
import Artwork from "./Artwork";
import { artistImageFor } from "./artist-images";
import type { ArtistPhotos } from "./artist-images";
import { label } from "./archive";
import type { Recording } from "./archive";
import { discoveryCopy } from "./brand";
import { catalogData } from "./catalog-data";

// One recording per artist, newest first, so the row reads like an album shelf.
export function shelfPicks(items: Recording[], limit = 10): Recording[] {
  const seen = new Set<string>();
  const picks: Recording[] = [];
  for (const recording of items) {
    const artist = label(recording.creator).trim().toLowerCase();
    if (!artist || seen.has(artist)) continue;
    seen.add(artist);
    picks.push(recording);
    if (picks.length === limit) break;
  }
  return picks;
}

// The home view's cover row: recordings made on today's month and day.
export default function OnThisDayShelf({
  monthDay,
  heading,
  artistPhotos,
  open,
  seeAll,
  seeAllHref,
}: {
  monthDay: string;
  heading: string;
  artistPhotos?: ArtistPhotos;
  open: (identifier: string) => void;
  seeAll: (event: MouseEvent) => void;
  seeAllHref: string;
}) {
  const [page, setPage] = useState<{ items: Recording[]; total: number }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    catalogData
      .read<{ items: Recording[]; total: number }>(
        `/api/source-catalog/v1/items?collection=etree&month_day=${monthDay}&sort=date_desc`,
        controller.signal,
      )
      .then((next) => {
        if (!controller.signal.aborted) setPage(next);
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [monthDay]);
  // The row is a shortcut; without it the catalog below is unchanged.
  if (failed || (page && page.items.length === 0)) return null;
  const picks = page ? shelfPicks(page.items) : [];
  return (
    <section className="cover-shelf" aria-labelledby="cover-shelf-heading" aria-busy={!page}>
      <div className="cover-shelf-heading">
        <h2 id="cover-shelf-heading">{heading}</h2>
        {page && (
          <span className="catalog-count">
            {page.total.toLocaleString()} recordings
          </span>
        )}
        <a href={seeAllHref} onClick={seeAll}>
          {discoveryCopy.seeAll}
        </a>
      </div>
      <ul className="cover-row">
        {picks.map((recording) => {
          const artist = label(recording.creator) || "Unknown artist";
          const date = label(recording.date).slice(0, 10);
          const place = [label(recording.venue), label(recording.coverage)]
            .filter(Boolean)
            .join(" · ");
          return (
            <li key={recording.identifier}>
              <button
                type="button"
                className="cover-card"
                data-recording={recording.identifier}
                onClick={() => open(recording.identifier)}
              >
                <Artwork
                  artist={artistImageFor(recording.creator, artistPhotos)}
                  name={artist}
                  cover={{ artist, date }}
                />
                <strong>{artist}</strong>
                <span>{place || date}</span>
                {place && <span className="cover-date">{date}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
