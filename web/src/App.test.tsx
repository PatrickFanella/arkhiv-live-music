import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import App from "./App";
import { tracksFor } from "./archive";

describe("Live Music Archive", () => {
  it("renders catalog search and its loading state", () => {
    const html = renderToString(<App />);
    expect(html).toContain("Search the catalog");
    expect(html).toContain("Loading recordings from the catalog");
  });
  it("groups derivative formats, skips private files and orders tracks naturally", () => {
    const tracks = tracksFor("show", [
      { name: "track10.mp3", original: "track10.flac" },
      { name: "track2.ogg", original: "track2.flac" },
      { name: "track2.mp3", original: "track2.flac" },
      { name: "track1.mp3", private: "true" },
      { name: "track3.flac" },
    ]);
    expect(tracks.map((t) => t.name)).toEqual([
      "track2.mp3",
      "track3.flac",
      "track10.mp3",
    ]);
  });
  it("escapes audio filenames and deduplicates nested derivative lineage", () => {
    const tracks = tracksFor("show", [
      { name: "01 song.wav" },
      { name: "01 song.flac", original: "01 song.wav" },
      { name: "01 song.mp3", original: "01 song.wav" },
      { name: "01 song.ogg", original: "01 song.flac" },
    ]);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].url).toBe("");
  });
});
