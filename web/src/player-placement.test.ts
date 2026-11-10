import { afterEach, describe, expect, it, vi } from "vitest";
import { readPlacement, writePlacement } from "./player-placement";

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
