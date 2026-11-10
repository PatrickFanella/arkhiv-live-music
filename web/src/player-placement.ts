export const placements = ["bottom", "top", "mini", "left", "right"] as const;
export type Placement = (typeof placements)[number];

const storageKey = "lineage.player.placement";

// Storage can be missing or refused. Bottom is the default in either case, and
// only this validated preference is persisted.
export function readPlacement(): Placement {
  try {
    const saved = localStorage.getItem(storageKey);
    return placements.find((placement) => placement === saved) ?? "bottom";
  } catch {
    return "bottom";
  }
}

export function writePlacement(placement: Placement) {
  try {
    localStorage.setItem(storageKey, placement);
  } catch {
    /* The choice still applies for this page. */
  }
}

export const rails: readonly Placement[] = ["left", "right"];
export const isRail = (placement: Placement) => rails.includes(placement);

// Rails apply from this width; keep in step with the media query in styles.css.
export const railQuery = "(min-width: 1024px)";

const railKey = "lineage.player.rail";
export const railDefault = 340;
export const railMin = 260;
// A rail never takes more than half the window, so the page keeps its column.
export const railMax = (viewport: number) =>
  Math.max(railMin, Math.min(640, Math.floor(viewport / 2)));

export function clampRail(width: number, viewport: number) {
  if (!Number.isFinite(width)) return railDefault;
  return Math.round(Math.min(railMax(viewport), Math.max(railMin, width)));
}

export function readRailWidth(): number {
  try {
    const saved = Number(localStorage.getItem(railKey));
    return saved >= railMin && saved <= 640 ? Math.round(saved) : railDefault;
  } catch {
    return railDefault;
  }
}

export function writeRailWidth(width: number) {
  try {
    localStorage.setItem(railKey, String(Math.round(width)));
  } catch {
    /* The width still applies for this page. */
  }
}
