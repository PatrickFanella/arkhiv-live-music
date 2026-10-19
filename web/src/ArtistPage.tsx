import { useEffect, useState } from "react";
import { getJSON } from "./archive";
import type { ArtistProfile } from "./archive";
import { artistProfileImage } from "./artist-images";
import { discoveryCopy as copy } from "./brand";

export default function ArtistPage({
  artist,
  available,
}: {
  artist: string;
  available?: boolean;
}) {
  const [profile, setProfile] = useState<ArtistProfile>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    if (!available) return;
    const controller = new AbortController();
    getJSON<ArtistProfile>(
      `/api/source-catalog/v1/artist?collection=etree&artist=${encodeURIComponent(artist)}`,
      controller.signal,
    )
      .then(setProfile)
      .catch((error: Error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [artist, available, retry]);
  const external = profile?.profile;
  const photo = profile && artistProfileImage(profile);
  const facts = external
    ? [
        [copy.artistType, external.type],
        [copy.origin, external["begin-area"]?.name || external.area?.name],
        [copy.country, external.country],
        [copy.activeFrom, external["life-span"]?.begin],
        [copy.activeUntil, external["life-span"]?.end],
      ].filter(([, value]) => typeof value === "string" && value)
    : [];
  return (
    <section className="artist-page" aria-labelledby="artist-heading">
      <div className="artist-portrait">
        {photo && !imageFailed ? (
          <figure>
            <img
              src={photo.url}
              alt={photo.alt}
              onError={() => setImageFailed(true)}
              referrerPolicy="no-referrer"
            />
            <figcaption>
              <a href={photo.source} target="_blank" rel="noreferrer">
                {photo.credit}
              </a>
              <span>
                {photo.rightsURL ? (
                  <a href={photo.rightsURL} target="_blank" rel="noreferrer">
                    {photo.rights}
                  </a>
                ) : (
                  photo.rights
                )}
              </span>
            </figcaption>
          </figure>
        ) : (
          <p className="portrait-placeholder">{copy.noPhoto}</p>
        )}
      </div>
      <div className="artist-biography">
        <p className="eyebrow">{copy.artist}</p>
        <h1 id="artist-heading">{artist}</h1>
        {available === false && <p className="notice">{copy.updateRequired}</p>}
        {available !== false && !profile && !error && (
          <p role="status">{copy.loadingArtist}</p>
        )}
        {error && (
          <div role="status">
            <p>{copy.artistError}</p>
            <button
              onClick={() => {
                setError("");
                setRetry(retry + 1);
              }}
            >
              {copy.retryArtist}
            </button>
          </div>
        )}
        {profile && (
          <>
            <p className="artist-summary">
              {profile.recordings.toLocaleString()} recordings
              {profile.first_recording &&
                ` · ${profile.first_recording.slice(0, 4)}–${profile.last_recording.slice(0, 4)}`}
            </p>
            {external?.biography ? (
              <>
                <p>{external.biography.text}</p>
                <p className="source-credit">
                  <a
                    href={external.biography.source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.readBiography}
                  </a>{" "}
                  ·{" "}
                  <a
                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {copy.biographyCredit}
                  </a>
                </p>
              </>
            ) : (
              <p>{copy.noBiography}</p>
            )}
            {facts.length > 0 && (
              <dl className="artist-facts">
                {facts.map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {external && (
              <p className="source-credit">
                <a
                  href={external.musicbrainz_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy.sourceFacts}
                </a>
                {profile.profile_updated_at &&
                  ` · Updated ${profile.profile_updated_at.slice(0, 10)}`}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
