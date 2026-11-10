import { label } from "./archive";
import type { Recording } from "./archive";

// Sorting and filtering here apply to the page of recordings already loaded.
// The catalog's own order (`sort` in the search) covers every page.
export const shelfColumns = ["artist", "title", "venue", "date"] as const;
export type ShelfColumn = (typeof shelfColumns)[number];
export type ShelfSort = { column: ShelfColumn; descending: boolean };

export function shelfValue(recording: Recording, column: ShelfColumn): string {
  if (column === "artist") return label(recording.creator);
  if (column === "title") return label(recording.title) || recording.identifier;
  if (column === "venue")
    return [label(recording.venue), label(recording.coverage)]
      .filter(Boolean)
      .join(" · ");
  return label(recording.date).slice(0, 10);
}

// Case and accents do not matter: "beyonce" finds "Beyoncé".
const fold = (text: string) =>
  text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Every word must appear somewhere in the row. Rows keep their catalog
// position so numbering and ties stay stable; missing values sort last.
export function arrangeShelf(
  items: Recording[],
  filter: string,
  sort?: ShelfSort,
) {
  const terms = fold(filter).split(/\s+/).filter(Boolean);
  const rows = items
    .map((recording, index) => ({ recording, index }))
    .filter(({ recording }) => {
      if (!terms.length) return true;
      const text = fold(
        shelfColumns.map((column) => shelfValue(recording, column)).join(" "),
      );
      return terms.every((term) => text.includes(term));
    });
  if (!sort) return rows;
  return rows.sort((a, b) => {
    const left = shelfValue(a.recording, sort.column);
    const right = shelfValue(b.recording, sort.column);
    if (!left !== !right) return left ? -1 : 1;
    const order = left.localeCompare(right, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return (sort.descending ? -order : order) || a.index - b.index;
  });
}

// A column sorts ascending first (dates newest first), then reversed, then off.
export function nextSort(
  current: ShelfSort | undefined,
  column: ShelfColumn,
): ShelfSort | undefined {
  const first = column === "date";
  if (current?.column !== column) return { column, descending: first };
  if (current.descending === first) return { column, descending: !first };
  return undefined;
}
