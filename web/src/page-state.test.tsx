import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import App from "./App";
import { catalogQuery, emptySearch, pageView, readSearch, searchQuery } from "./browse";

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
