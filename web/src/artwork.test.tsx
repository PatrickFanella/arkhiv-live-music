import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { recordingArtwork } from "./artwork";
import {
  artistImageFor,
  artistImages,
  artistPhotosFrom,
  commonsThumbnail,
} from "./artist-images";
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
  it("uses engine photographs after curated photographs and before logos", () => {
    const photo = (name: string) => ({
      url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${name}.jpg`,
      source: `https://commons.wikimedia.org/wiki/File:${name}.jpg`,
      credit: "Photographer",
      license: "CC BY-SA 4.0",
      license_url: "https://creativecommons.org/licenses/by-sa/4.0",
    });
    const photos = artistPhotosFrom([
      { artist: "ween", photo: photo("Ween") },
      { artist: "phil lesh and friends", photo: photo("Phil") },
      { artist: "max creek", photo: photo("Max") },
      {
        artist: "elsewhere",
        photo: { ...photo("Elsewhere"), url: "https://example.com/x.jpg" },
      },
    ]);
    expect(artistImageFor("Ween", photos)?.url).toContain("archive.org");
    expect(artistImageFor("Phil Lesh and Friends", photos)?.url).toContain(
      "Phil.jpg",
    );
    const creek = artistImageFor(["MAX CREEK"], photos);
    expect(creek?.url).toContain("Max.jpg");
    expect(creek?.alt).toBe("MAX CREEK artist photograph");
    expect(creek?.rightsURL).toContain("creativecommons.org");
    expect(artistImageFor("Elsewhere", photos)).toBeUndefined();
    expect(creek?.url).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Max.jpg/330px-Max.jpg",
    );
    expect(artistImageFor("Max Creek")).toBeUndefined();
  });
  it("prefers images stored by the engine and labels collection images", () => {
    const media = (c: string) => ({
      sha256: c.repeat(64),
      content_type: "image/jpeg",
      width: 330,
      height: 330,
    });
    const collection = {
      url: "https://archive.org/download/Ween/Ween_itemimage.jpg",
      source: "https://archive.org/details/Ween",
      credit: "Ween collection, Live Music Archive",
      license: "Internet Archive collection image",
      license_url: "",
    };
    const photos = artistPhotosFrom([
      {
        artist: "ween",
        photo: { ...collection, image: media("a"), thumbnail: media("b") },
      },
      { artist: "unstored", photo: collection },
      {
        artist: "phish",
        photo: {
          url: "https://upload.wikimedia.org/wikipedia/commons/a/ab/P.jpg",
          source: "https://commons.wikimedia.org/wiki/File:P.jpg",
          credit: "Photographer",
          license: "CC BY 4.0",
          license_url: "https://creativecommons.org/licenses/by/4.0",
          thumbnail: media("c"),
        },
      },
    ]);
    const ween = artistImageFor("Ween", photos);
    expect(ween?.url).toBe(
      `/api/source-catalog/v1/artist-media/${"b".repeat(64)}?collection=etree`,
    );
    expect(ween?.rightsURL).toBeUndefined();
    expect(ween?.rights).toContain("artist collection on Internet Archive");
    expect(artistImageFor("Unstored", photos)).toBeUndefined();
    expect(artistImageFor("Phish", photos)?.url).toContain("c".repeat(64));
    expect(artistImageFor("Phish", photos)?.rightsURL).toContain(
      "creativecommons.org",
    );
  });
  it("requests standard-width Commons thumbnails", () => {
    expect(
      commonsThumbnail(
        "https://upload.wikimedia.org/wikipedia/commons/6/6b/Grateful_Dead_%281970%29.png",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Grateful_Dead_%281970%29.png/330px-Grateful_Dead_%281970%29.png",
    );
    expect(
      commonsThumbnail(
        "https://upload.wikimedia.org/wikipedia/commons/3/35/Moeband.JPG?utm_source=commons.wikimedia.org",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Moeband.JPG/330px-Moeband.JPG",
    );
    expect(
      commonsThumbnail(
        "https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo.svg",
      ),
    ).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Logo.svg/330px-Logo.svg.png",
    );
    const thumb =
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/X.jpg/720px-X.jpg";
    expect(commonsThumbnail(thumb)).toBe(thumb);
    expect(
      commonsThumbnail(
        "https://upload.wikimedia.org/wikipedia/commons/a/ab/Scan.tif",
      ),
    ).toContain("Scan.tif");
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
