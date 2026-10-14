import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import BrowseDirectory from "./BrowseDirectory";
import { emptySearch, readSearch, searchQuery, validateDates } from "./browse";

describe("Catalog browsing", () => {
  it("round trips shared searches including punctuation, dates, and page cursors", () => {
    const search = {
      ...emptySearch,
      q: "Tour de Fat & friends",
      artist: "Chris & Spigs' Rock & Roll Circus",
      venue: "Café / Room #2",
      date_from: "2013-07-13",
      date_to: "2013-07-13",
      cursor: "show+next=",
    };
    expect(readSearch(searchQuery(search))).toEqual(search);
  });
  it("ignores unrelated URL parameters and omits empty filters", () => {
    expect(readSearch("?artist=Ween&tracking=ignored")).toEqual({
      ...emptySearch,
      artist: "Ween",
    });
    expect(searchQuery(emptySearch)).toBe("");
  });
  it("rejects reversed date ranges while allowing single-day and open-ended browsing", () => {
    expect(
      validateDates({
        ...emptySearch,
        date_from: "2020-02-01",
        date_to: "2020-01-01",
      }),
    ).toContain("end date");
    expect(
      validateDates({
        ...emptySearch,
        date_from: "2020-02-01",
        date_to: "2020-02-01",
      }),
    ).toBe("");
    expect(validateDates({ ...emptySearch, date_from: "2020-02-01" })).toBe("");
  });
  it("shows counted artist suggestions and decades from actual facets", () => {
    const html = renderToString(
      <BrowseDirectory
        facets={{
          artists: [
            { value: "Ween", count: 12 },
            { value: "Billy Strings", count: 50 },
          ],
          venues: [],
          years: [
            { value: "1997", count: 7 },
            { value: "1999", count: 8 },
            { value: "2026", count: 5 },
          ],
        }}
        error=""
        retry={() => {}}
        select={() => {}}
      />,
    );
    expect(html.indexOf("Billy Strings")).toBeLessThan(html.indexOf("Ween"));
    expect(html.replaceAll("<!-- -->", "")).toContain("1990s");
    expect(html.replaceAll("<!-- -->", "")).toContain("2020s");
    expect(html).toContain("Suggestions are limited");
  });
});
