import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { calendarCells, monthLength } from "./DateDiscovery";
import DateDiscovery from "./DateDiscovery";
import { emptySearch, readSearch, searchQuery, validateDates } from "./browse";
import { artistProfileImage } from "./artist-images";
import type { ArtistProfile } from "./archive";

describe("historical date discovery", () => {
  it("handles leap days for individual years and an all-years month", () => {
    expect(monthLength(2, 2000)).toBe(29);
    expect(monthLength(2, 1900)).toBe(28);
    expect(calendarCells(2)).toHaveLength(29);
    expect(
      calendarCells(2, 2000).filter((value) => value !== null),
    ).toHaveLength(29);
    expect(
      calendarCells(2, 2001).filter((value) => value !== null),
    ).toHaveLength(28);
  });
  it("retains year ranges and date selection in shareable URLs", () => {
    const search = {
      ...emptySearch,
      view: "calendar",
      month: "05",
      month_day: "05-08",
      year_from: "1970",
      year_to: "1990",
      artist: "Ween",
      sort: "date_desc",
    };
    expect(readSearch(`?${searchQuery(search)}`)).toEqual(search);
    expect(validateDates(search)).toBe("");
    expect(validateDates({ ...search, year_to: "1969" })).not.toBe("");
    expect(validateDates({ ...search, year_to: "" })).not.toBe("");
    expect(readSearch("?view=unknown").view).toBe("");
  });
  it("renders single, range, and all-years controls without requesting providers", () => {
    const html = renderToString(
      <DateDiscovery
        search={{
          ...emptySearch,
          view: "calendar",
          month: "05",
          year_from: "1970",
          year_to: "1990",
        }}
        available
        change={() => {}}
      />,
    );
    expect(html).toContain("Single year");
    expect(html).toContain("Range of years");
    expect(html).toContain("All years");
    expect(html).toContain("1970");
    expect(html).toContain("1990");
  });
  it("requires attributed profile images and keeps curated photographs", () => {
    const artist: ArtistProfile = {
      artist: "Fixture artist",
      recordings: 1,
      first_recording: "2000-05-08",
      last_recording: "2000-05-08",
      profile: null,
    };
    expect(artistProfileImage(artist)).toBeUndefined();
    expect(artistProfileImage({ ...artist, artist: "Ween" })?.source).toContain(
      "archive.org/details/Ween",
    );
    expect(
      artistProfileImage({
        ...artist,
        profile: {
          name: "Fixture",
          musicbrainz_id: "fixture",
          musicbrainz_url: "https://musicbrainz.org",
          photo: {
            url: "https://untrusted.invalid/photo.jpg",
            source: "https://commons.wikimedia.org/wiki/File:Fixture",
            credit: "Fixture",
            license: "CC BY",
            license_url: "https://creativecommons.org",
          },
        },
      }),
    ).toBeUndefined();
  });
});
