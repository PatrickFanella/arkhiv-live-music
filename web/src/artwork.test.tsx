import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { recordingArtwork } from "./artwork";
import { artistImageFor, artistImages } from "./artist-images";
import Artwork from "./Artwork";

describe("Recording artwork", () => {
  it("prefers a cover over thumbnails and unrelated images", () => {
    const artwork = recordingArtwork("show", [
      { name: "photo.jpg" },
      { name: "cover_thumb.jpg" },
      { name: "cover.jpg" },
      { name: "__ia_thumb.jpg" },
    ]);
    expect(artwork?.file).toBe("cover.jpg");
  });
  it("excludes private files, audio visualizations, and automatic thumbnails", () => {
    expect(
      recordingArtwork("show", [
        { name: "cover.jpg", private: true },
        { name: "poster.png", private: "true" },
        { name: "01 song.mp3" },
        { name: "01 song.png", format: "PNG" },
        { name: "track_spectrogram.png" },
        { name: "__ia_thumb.jpg" },
      ]),
    ).toBeUndefined();
    expect(
      recordingArtwork("show", [{ name: "cover.jpg", private: "false" }])?.file,
    ).toBe("cover.jpg");
  });
  it("encodes nested filenames while rejecting traversal and unavailable recordings", () => {
    expect(recordingArtwork("show", [{ name: "art/cover #1.jpg" }])?.url).toBe(
      "https://archive.org/download/show/art/cover%20%231.jpg",
    );
    expect(
      recordingArtwork("../show", [{ name: "cover.jpg" }]),
    ).toBeUndefined();
    expect(
      recordingArtwork("show", [{ name: "../cover.jpg" }]),
    ).toBeUndefined();
    expect(
      recordingArtwork("show", [{ name: "cover.jpg" }], true),
    ).toBeUndefined();
  });
});

describe("Curated artist images", () => {
  it("matches only confirmed names and aliases", () => {
    expect(artistImageFor("  PHIL LESH & FRIENDS ")?.kind).toBe("logo");
    expect(artistImageFor(["Ween"])?.artist).toBe("Ween");
    expect(artistImageFor("Ween tribute band")).toBeUndefined();
    expect(artistImageFor(["Ween", "Billy Strings"])).toBeUndefined();
  });
  it("retains source and rights provenance for every curated entry", () => {
    for (const image of artistImages) {
      expect(new URL(image.url).protocol).toBe("https:");
      expect(new URL(image.source).hostname).toBe("archive.org");
      expect(image.credit).not.toBe("");
      expect(image.rights).not.toBe("");
      expect(image.verifiedAt).toBe("2026-10-14");
    }
  });
  it("labels recording artwork separately from artist imagery and provides an empty state", () => {
    const artist = artistImageFor("Ween");
    const cover = recordingArtwork("show", [{ name: "cover.jpg" }]);
    const recording = renderToString(
      <Artwork name="show" recording={cover} artist={artist} caption />,
    );
    expect(recording).toContain("Recording artwork");
    expect(recording).toContain("https://archive.org/details/show");
    expect(recording).not.toContain("ween3.jpg");
    expect(
      renderToString(<Artwork name="Ween" artist={artist} caption />),
    ).toContain("artist photo");
    expect(renderToString(<Artwork name="Unknown" caption />)).toContain(
      "No artwork available",
    );
  });
});
