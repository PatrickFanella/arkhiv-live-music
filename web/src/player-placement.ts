export const placements = ["bottom", "top", "mini"] as const;
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
