import type { ReactNode } from "react";
import Artwork from "./Artwork";
import RecordingContent from "./RecordingContent";
import { artistImageFor } from "./artist-images";
import type { ArtistPhotos } from "./artist-images";
import { recordingArtwork } from "./artwork";
import { label } from "./archive";
import type { Detail, Track } from "./archive";
import type { Search } from "./browse";
import { trackDisplayTitle } from "./track-title";

// Display titles are cleaned; each row keeps its original title and file name
// as a tooltip, and the disclosure lists them all.
export function TrackList({
  tracks,
  play,
  current,
}: {
  tracks: Track[];
  play: (index: number) => void;
  current?: number;
}) {
  return (
    <>
      <ol className="tracks">
        {tracks.map((track, index) => (
          <li key={track.name}>
            <button
              onClick={() => play(index)}
              aria-current={index === current ? "true" : undefined}
            >
              <span className="track-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <strong
                title={`Original title: ${track.title || "Not recorded"} · File: ${track.name}`}
              >
                {trackDisplayTitle(track)}
              </strong>
              <span className="track-length">
                {index === current ? "Playing" : track.length || "▶"}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {tracks.length > 0 && (
        <details className="provenance">
          <summary>Original track titles and filenames</summary>
          <ol>
            {tracks.map((track) => (
              <li key={track.name}>
                <strong>{label(track.title) || "Title not recorded"}</strong>
                <div>
                  <code>{track.name}</code>
                </div>
              </li>
            ))}
          </ol>
        </details>
      )}
    </>
  );
}

// The panel and the recording page present the same recording body. The
// surface owns its heading, loading and error states and navigation.
export default function RecordingDetail({
  identifier,
  detail,
  tracks,
  artistPhotos,
  heading,
  actions,
  resolving,
  playError,
  play,
  related,
}: {
  identifier: string;
  detail: Detail;
  tracks: Track[];
  artistPhotos?: ArtistPhotos;
  heading?: (artist: string) => ReactNode;
  actions?: ReactNode;
  resolving: boolean;
  playError: string;
  play: (index: number) => void;
  related: (filters: Partial<Search>) => void;
}) {
  const creator = label(detail.metadata.creator);
  const venue = label(detail.metadata.venue);
  const date = label(detail.metadata.date);
  const coverage = label(detail.metadata.coverage);
  return (
    <div className="recording-body">
      {heading?.(creator || "Unknown artist")}
      <p className="detail-title">{label(detail.metadata.title)}</p>
      {actions}
      <Artwork
        recording={recordingArtwork(
          identifier,
          detail.files || [],
          !!detail.unavailable,
        )}
        artist={artistImageFor(detail.metadata.creator, artistPhotos)}
        name={label(detail.metadata.title) || identifier}
        caption
      />
      <div className="related-browse" aria-label="Browse related recordings">
        {creator && (
          <button onClick={() => related({ artist: creator })}>
            More by {creator}
          </button>
        )}
        {venue && (
          <button onClick={() => related({ venue })}>At this venue</button>
        )}
        {/^\d{4}-\d{2}-\d{2}$/.test(date) && (
          <button
            onClick={() => related({ year: "", date_from: date, date_to: date })}
          >
            On this date
          </button>
        )}
        {coverage && (
          <button onClick={() => related({ q: coverage })}>
            Search this place
          </button>
        )}
      </div>
      {detail.unavailable && (
        <p role="status" className="notice">
          This source was unavailable at the last import. Its catalog metadata
          is retained.
        </p>
      )}
      <RecordingContent detail={detail} />
      <a
        href={`https://archive.org/details/${encodeURIComponent(identifier)}`}
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
            href={`/api/source-catalog/v1/items/${encodeURIComponent(identifier)}/source?collection=etree`}
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
            {Object.entries(detail.editorial || {}).map(([field, value]) => (
              <div key={field}>
                <dt>{field}</dt>
                <dd>
                  {label(value)}
                  <small>
                    Source:{" "}
                    {label(detail.source_metadata?.[field]) || "(missing)"}
                  </small>
                </dd>
              </div>
            ))}
          </dl>
        )}
        {detail.history?.map((edit, index) => (
          <p key={index}>
            {new Date(edit.created_at).toLocaleDateString()}: {edit.notes}
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
          No tracks have been approved for playback here. Source files and
          metadata remain available on Internet Archive.
        </p>
      )}
      <TrackList tracks={tracks} play={play} />
    </div>
  );
}
