import { describe, expect, it } from "vitest";
import { arrangeShelf, nextSort } from "./shelf-order";
import type { Recording } from "./archive";

const items: Recording[] = [
  { identifier: "a", creator: "Phish", title: "Phish Live", venue: "Madison Square Garden", coverage: "New York, NY", date: "1997-12-31" },
  { identifier: "b", creator: "Beyoncé", title: "Live", venue: "The Hideout", date: "2013-07-18T00:00:00Z" },
  { identifier: "c", creator: ["moe."], title: "moe. Live", venue: "Saki", coverage: "Chicago, IL", date: "2001-11-10" },
  { identifier: "d", title: "", venue: "", date: "" },
];
const ids = (rows: ReturnType<typeof arrangeShelf>) =>
  rows.map((row) => row.recording.identifier);

describe("arranging the loaded page of recordings", () => {
  it("keeps catalog order without a filter or sort", () => {
    expect(ids(arrangeShelf(items, "  "))).toEqual(["a", "b", "c", "d"]);
  });

  it("matches every word across columns, ignoring case and accents", () => {
    expect(ids(arrangeShelf(items, "beyonce hideout"))).toEqual(["b"]);
    expect(ids(arrangeShelf(items, "CHICAGO 2001"))).toEqual(["c"]);
    expect(ids(arrangeShelf(items, "phish chicago"))).toEqual([]);
    expect(ids(arrangeShelf(items, "d"))).toContain("d");
  });

  it("sorts by a column with missing values last in either direction", () => {
    expect(ids(arrangeShelf(items, "", { column: "artist", descending: false }))).toEqual(["b", "c", "a", "d"]);
    expect(ids(arrangeShelf(items, "", { column: "artist", descending: true }))).toEqual(["a", "c", "b", "d"]);
    expect(ids(arrangeShelf(items, "", { column: "date", descending: true }))).toEqual(["b", "c", "a", "d"]);
    expect(ids(arrangeShelf(items, "", { column: "venue", descending: false }))).toEqual(["a", "c", "b", "d"]);
  });

  it("keeps each row's catalog position for numbering", () => {
    const rows = arrangeShelf(items, "", { column: "artist", descending: false });
    expect(rows.map((row) => row.index)).toEqual([1, 2, 0, 3]);
  });

  it("cycles a column through ascending, reversed and off", () => {
    expect(nextSort(undefined, "artist")).toEqual({ column: "artist", descending: false });
    expect(nextSort({ column: "artist", descending: false }, "artist")).toEqual({ column: "artist", descending: true });
    expect(nextSort({ column: "artist", descending: true }, "artist")).toBeUndefined();
    expect(nextSort(undefined, "date")).toEqual({ column: "date", descending: true });
    expect(nextSort({ column: "date", descending: true }, "date")).toEqual({ column: "date", descending: false });
    expect(nextSort({ column: "date", descending: false }, "venue")).toEqual({ column: "venue", descending: false });
  });
});
