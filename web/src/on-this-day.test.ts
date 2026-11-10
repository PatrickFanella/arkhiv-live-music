import { describe, expect, it } from "vitest";
import { shelfPicks } from "./OnThisDayShelf";

describe("the On this day cover row", () => {
  it("keeps the first recording per artist, ignoring case, and skips unnamed ones", () => {
    const picks = shelfPicks(
      [
        { identifier: "a", creator: "Phish" },
        { identifier: "b", creator: "phish " },
        { identifier: "c", creator: ["moe."] },
        { identifier: "d" },
        { identifier: "e", creator: "Ween" },
      ],
      2,
    );
    expect(picks.map((recording) => recording.identifier)).toEqual(["a", "c"]);
  });
});
