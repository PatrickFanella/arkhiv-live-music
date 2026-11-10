import { describe, expect, it } from "vitest";
import { coverInitial, coverTone, coverTones } from "./cover";

describe("generated covers", () => {
  it("gives an artist the same tone every time, ignoring case and spacing", () => {
    expect(coverTone("Grateful Dead")).toBe(coverTone("  grateful dead "));
    for (const name of ["Ween", "moe.", "Belle & Sebastian", "", "Beyoncé"]) {
      const tone = coverTone(name);
      expect(Number.isInteger(tone) && tone >= 0 && tone < coverTones).toBe(true);
    }
  });

  it("spreads names across the tones", () => {
    const names = ["Ween", "moe.", "Phish", "Widespread Panic", "Max Creek", "Railroad Earth", "Disco Biscuits", "Radiators", "Blues Traveler", "Umphreys McGee"];
    expect(new Set(names.map(coverTone)).size).toBeGreaterThan(2);
  });

  it("takes the first letter or digit, skipping a leading The", () => {
    expect(coverInitial("The Garcia Project")).toBe("G");
    expect(coverInitial("moe.")).toBe("M");
    expect(coverInitial("311")).toBe("3");
    expect(coverInitial("  ...élan")).toBe("É");
    expect(coverInitial("")).toBe("♪");
    expect(coverInitial("Theory of a Deadman")).toBe("T");
  });
});
