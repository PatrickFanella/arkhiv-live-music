export const filterLabels = {
  q: "Metadata search",
  year: "Year",
  artist: "Artist",
  venue: "Venue",
  availability: "Source availability",
  date_from: "From",
  date_to: "To",
  month_day: "Month and day",
  year_from: "From year",
  year_to: "To year",
} as const;
export type FilterKey = keyof typeof filterLabels;
export type Search = Record<FilterKey, string> & {
  cursor: string;
  view: string;
  month: string;
  sort: string;
  id: string;
  dimension: string;
};
export const emptySearch: Search = {
  q: "",
  year: "",
  artist: "",
  venue: "",
  availability: "",
  date_from: "",
  date_to: "",
  cursor: "",
  view: "",
  month: "",
  sort: "",
  id: "",
  dimension: "",
  month_day: "",
  year_from: "",
  year_to: "",
};
export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  const search = { ...emptySearch };
  for (const key of Object.keys(search) as (keyof Search)[])
    search[key] = params.get(key) || "";
  if (!["", "artist", "calendar", "on-this-day", "search", "explore", "recording"].includes(search.view))
    search.view = "";
  return search;
}
// Cursors of the pages already visited, kept in history.state so Back and
// Forward restore the page number and tape numbering with the results.
export function readPages(state: unknown): string[] {
  const pages = (state as { pages?: unknown } | null)?.pages;
  return Array.isArray(pages) &&
    pages.every((page) => typeof page === "string")
    ? pages
    : [];
}
// The scroll position kept with each history entry, for Back and Forward.
export function readScroll(state: unknown): number | undefined {
  const scroll = (state as { scroll?: unknown } | null)?.scroll;
  return typeof scroll === "number" && Number.isFinite(scroll) && scroll >= 0
    ? scroll
    : undefined;
}
// What a change should bring into view. Refinements stay where they are.
export type Reveal = "none" | "top" | "heading" | "results";
export function searchQuery(search: Search): string {
  return new URLSearchParams(
    Object.entries(search).filter(([, value]) => value !== ""),
  ).toString();
}
export function validateDates(search: Search): string {
  if ((search.year_from === "") !== (search.year_to === ""))
    return "Choose both ends of the year range.";
  if (
    search.year_from &&
    (!/^(19|20)[0-9]{2}$/.test(search.year_from) ||
      !/^(19|20)[0-9]{2}$/.test(search.year_to) ||
      search.year_from > search.year_to)
  )
    return "Choose an ordered year range from 1900 through 2099.";
  return search.date_from && search.date_to && search.date_from > search.date_to
    ? "Choose an end date on or after the start date."
    : "";
}

export function pageView(search: Search) {
  if (search.view) return search.view;
  if (search.artist && !search.q) return "artist";
  return Object.keys(filterLabels).some((key) => search[key as FilterKey]) || search.cursor || search.sort
    ? "search"
    : "browse";
}

// Page identity is not a source-catalog query or a transport permission.
export function catalogQuery(search: Search): string {
  const params = new URLSearchParams(searchQuery(search));
  for (const key of ["view", "id", "dimension"]) params.delete(key);
  return params.toString();
}
