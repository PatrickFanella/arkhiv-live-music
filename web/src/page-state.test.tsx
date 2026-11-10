import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import App from "./App";
import RecordingDetail, { TrackList } from "./RecordingDetail";
import { getJSON, missingItemMessage, tracksFor } from "./archive";
import type { Detail } from "./archive";
import { backTarget, catalogQuery, emptySearch, pageView, readFocus, readSearch, recordingPage, searchQuery } from "./browse";

afterEach(() => vi.unstubAllGlobals());

describe("shareable root-query pages", () => {
  it.each(["search", "explore", "recording", "calendar", "on-this-day", "artist"])("retains %s page identity", (view) => {
    const state = { ...emptySearch, view, id: view === "recording" ? "show.01" : "", dimension: "venues", venue: "Café & Room #2", availability: "unavailable" };
    expect(readSearch(searchQuery(state))).toEqual(state);
    expect(pageView(state)).toBe(view);
    const api = new URLSearchParams(catalogQuery(state));
    expect(api.get("venue")).toBe(state.venue);
    expect(api.get("availability")).toBe("unavailable");
    for (const key of ["view", "dimension", "id"]) expect(api.has(key)).toBe(false);
  });

  it("keeps legacy home, artist and filtered links useful", () => {
    expect(pageView(readSearch(""))).toBe("browse");
    expect(pageView(readSearch("?artist=Ween"))).toBe("artist");
    expect(pageView(readSearch("?venue=Room&availability=unavailable"))).toBe("search");
    expect(pageView(readSearch("?q=Jam&artist=Ween"))).toBe("search");
    expect(readSearch("?view=unknown").view).toBe("");
  });

  it.each([
    ["?view=search", "Search recordings"],
    ["?view=explore&dimension=venues", "Explore the collection"],
    ["?view=recording&id=show.01", "Loading recording"],
    ["?view=recording", "Choose a valid recording identifier"],
    ["?view=recording&id=../bad", "Choose a valid recording identifier"],
  ])("renders useful direct page state for %s", (search, content) => {
    vi.stubGlobal("window", { location: { search } });
    const html = renderToString(<App />);
    expect(html).toContain(content);
    if (search.includes("dimension=venues")) expect(html.replace(/<!--.*?-->/g, "")).toContain("Find venues");
    expect(html).toContain('class="masthead"');
    if (search.includes("recording")) expect(html).not.toContain('aria-label="Recording list"');
  });
});

describe("dedicated recording page", () => {
  it("links a recording page that reloads directly", () => {
    const page = recordingPage("gd1977-05-08.sbd");
    expect(readSearch(searchQuery(page))).toEqual(page);
    expect(pageView(page)).toBe("recording");
    expect(catalogQuery(page)).toBe("");
  });

  it("renders the return link and a focusable heading on a direct load", () => {
    vi.stubGlobal("window", { location: { search: "?view=recording&id=show.01" } });
    const html = renderToString(<App />);
    expect(html).toContain("Back to recordings");
    expect(html).toMatch(/<h1 tabindex="-1">Recording<\/h1>/);
    expect(html).not.toContain('aria-label="Audio player"');
  });

  it("presents description, source, lineage, provenance and tracks in the shared body", () => {
    const detail: Detail = {
      metadata: { creator: "Ween", title: "Ween Live at Roseland", date: "1996-10-01", venue: "Roseland" },
      source_metadata: { description: "Second night.", source: "Schoeps MK4", lineage: "DAT > CD > FLAC" },
      editorial: {},
      files: [{ name: "01 Intro.mp3", title: "Intro" }],
      playback_bindings: [{ item: "i", representation: "r", files: ["01 Intro.mp3"] }],
    };
    const tracks = tracksFor("ween1996", detail.files!);
    const html = renderToString(
      <RecordingDetail
        identifier="ween1996"
        detail={detail}
        tracks={tracks}
        actions={<a href="/?view=recording&amp;id=ween1996">Open recording page</a>}
        resolving={false}
        playError=""
        play={() => {}}
        related={() => {}}
      />,
    ).replace(/<!-- -->/g, "");
    for (const text of ["Ween Live at Roseland", "Second night.", "Schoeps MK4", "DAT &gt; CD &gt; FLAC", "Original metadata snapshot", "1 playable tracks", "Open recording page", "More by Ween"])
      expect(html).toContain(text);
    expect(html).toContain("/api/source-catalog/v1/items/ween1996/source?collection=etree");
  });
});

describe("playing recording track list", () => {
  it("marks the playing track and keeps original titles and files", () => {
    const tracks = tracksFor("show", [
      { name: "01 Intro.mp3", title: "01 Intro (Live)" },
      { name: "02 Song.mp3", title: "Song" },
    ]);
    const html = renderToString(
      <TrackList tracks={tracks} current={1} play={() => {}} />,
    ).replace(/<!-- -->/g, "");
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="true"><span class="track-index">02/);
    expect(html).toContain("Playing");
    expect(html).toContain("Original title: 01 Intro (Live) · File: 01 Intro.mp3");
    expect(html).toContain("<code>02 Song.mp3</code>");
  });
});

describe("recording page return and missing states", () => {
  it.each([
    [null, "home"],
    [{ scroll: 40 }, "home"],
    [{ inApp: "yes" }, "home"],
    [{ inApp: true, from: "recording" }, "home"],
    [{ inApp: true, from: "artist" }, "history"],
    [{ inApp: true }, "history"],
  ])("returns from history state %j to %s", (state, target) => {
    expect(backTarget(state)).toBe(target);
  });

  it("reads only a named tape to refocus", () => {
    expect(readFocus({ focus: "show.01" })).toBe("show.01");
    for (const state of [null, {}, { focus: "" }, { focus: 7 }])
      expect(readFocus(state)).toBeUndefined();
  });

  it("matches the pinned kit's 404 message, so excluded recordings get no retry", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    await expect(getJSON("/api/x", new AbortController().signal)).rejects.toThrow(missingItemMessage);
  });

  it("rejects an identifier with unsupported characters", () => {
    vi.stubGlobal("window", { location: { search: "?view=recording&id=bad!id" } });
    expect(renderToString(<App />)).toContain("Choose a valid recording identifier");
  });
});
