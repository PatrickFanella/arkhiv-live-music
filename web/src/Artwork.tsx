import { useState } from "react";
import type { ArtistImage } from "./artist-images";
import type { RecordingArtwork } from "./artwork";

export default function Artwork({
  recording,
  artist,
  name,
  caption = false,
}: {
  recording?: RecordingArtwork;
  artist?: ArtistImage;
  name: string;
  caption?: boolean;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const image =
    recording && !failed.includes(recording.url)
      ? {
          url: recording.url,
          alt: `Recording artwork for ${name}`,
          source: recording.source,
          text: "Recording artwork",
          kind: "artwork",
        }
      : artist && !failed.includes(artist.url)
        ? {
            url: artist.url,
            alt: artist.alt,
            source: artist.source,
            text: `${artist.artist} · ${artist.kind === "logo" ? "artist logo" : "artist photo"}`,
            kind: artist.kind,
          }
        : undefined;
  const Frame = caption ? "figure" : "span";
  return (
    <Frame className={`artwork ${caption ? "artwork-large" : "artwork-small"}`}>
      {image ? (
        <img
          src={image.url}
          alt={caption ? image.alt : ""}
          className={image.kind === "logo" ? "artist-logo" : ""}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed((previous) => [...previous, image.url])}
        />
      ) : (
        <span
          className="artwork-placeholder"
          aria-label={caption ? "No artwork available" : undefined}
          aria-hidden={caption ? undefined : true}
        >
          ♪
        </span>
      )}
      {caption && (
        <figcaption>
          {image ? (
            <>
              <a href={image.source} target="_blank" rel="noreferrer">
                {image.text} · source ↗
              </a>
              {image.kind !== "artwork" && artist && (
                <small>
                  {artist.credit}
                  <br />
                  {artist.rights}
                </small>
              )}
            </>
          ) : (
            "No artwork available"
          )}
        </figcaption>
      )}
    </Frame>
  );
}
