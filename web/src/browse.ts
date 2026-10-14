export const filterLabels = {
  q: "Metadata search",
  year: "Year",
  artist: "Artist",
  venue: "Venue",
  availability: "Source availability",
  date_from: "From",
  date_to: "To",
} as const;
export type FilterKey = keyof typeof filterLabels;
export type Search = Record<FilterKey, string> & { cursor: string };
export const emptySearch: Search = {
  q: "",
  year: "",
  artist: "",
  venue: "",
  availability: "",
  date_from: "",
  date_to: "",
  cursor: "",
};
export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  const search = { ...emptySearch };
  for (const key of Object.keys(search) as (keyof Search)[])
    search[key] = params.get(key) || "";
  return search;
}
export function searchQuery(search: Search): string {
  return new URLSearchParams(
    Object.entries(search).filter(([, value]) => value !== ""),
  ).toString();
}
export function validateDates(search: Search): string {
  return search.date_from && search.date_to && search.date_from > search.date_to
    ? "Choose an end date on or after the start date."
    : "";
}
