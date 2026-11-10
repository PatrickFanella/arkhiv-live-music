import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampRail,
  isRail,
  placements,
  railDefault,
  railMin,
  readPlacement,
  readRailWidth,
  writePlacement,
  writeRailWidth,
} from "./player-placement";

afterEach(() => vi.unstubAllGlobals());

const storage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
};

describe("player placement preference", () => {
  it("defaults to the bottom bar", () => {
    vi.stubGlobal("localStorage", storage());
    expect(readPlacement()).toBe("bottom");
  });

  it.each(["top", "mini", "bottom", "left", "right"])("restores a saved %s placement", (value) => {
    vi.stubGlobal("localStorage", storage({ "lineage.player.placement": value }));
    expect(readPlacement()).toBe(value);
  });

  it.each(["sideways", "", "TOP", "Left"])("rejects the invalid value %j", (value) => {
    vi.stubGlobal("localStorage", storage({ "lineage.player.placement": value }));
    expect(readPlacement()).toBe("bottom");
  });

  it("falls back when storage is unavailable or refuses access", () => {
    expect(readPlacement()).toBe("bottom");
    expect(() => writePlacement("top")).not.toThrow();
    const refusing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    vi.stubGlobal("localStorage", refusing);
    expect(readPlacement()).toBe("bottom");
    expect(() => writePlacement("top")).not.toThrow();
  });

  it("stores only the placement", () => {
    const local = storage();
    vi.stubGlobal("localStorage", local);
    writePlacement("mini");
    expect([...local.values]).toEqual([["lineage.player.placement", "mini"]]);
  });
});

describe("player rail width", () => {
  it("defaults when nothing valid is saved", () => {
    vi.stubGlobal("localStorage", storage());
    expect(readRailWidth()).toBe(railDefault);
    for (const value of ["", "abc", "12", "9000", "-400"]) {
      vi.stubGlobal("localStorage", storage({ "lineage.player.rail": value }));
      expect(readRailWidth()).toBe(railDefault);
    }
  });

  it("restores and stores a saved width", () => {
    const local = storage();
    vi.stubGlobal("localStorage", local);
    writeRailWidth(412.6);
    expect([...local.values]).toEqual([["lineage.player.rail", "413"]]);
    expect(readRailWidth()).toBe(413);
  });

  it("survives refused storage", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("quota");
      },
    });
    expect(readRailWidth()).toBe(railDefault);
    expect(() => writeRailWidth(300)).not.toThrow();
  });

  it("keeps the rail between its minimum and half the window", () => {
    expect(clampRail(100, 1440)).toBe(railMin);
    expect(clampRail(500, 1440)).toBe(500);
    expect(clampRail(900, 1440)).toBe(640);
    expect(clampRail(600, 1024)).toBe(512);
    expect(clampRail(Number.NaN, 1440)).toBe(railDefault);
  });

  it("treats only the side placements as rails", () => {
    expect(placements.filter(isRail)).toEqual(["left", "right"]);
  });
});
