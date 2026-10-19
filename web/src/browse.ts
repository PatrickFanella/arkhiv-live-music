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
  month_day: "",
  year_from: "",
  year_to: "",
};
export function readSearch(query: string): Search {
  const params = new URLSearchParams(query);
  const search = { ...emptySearch };
  for (const key of Object.keys(search) as (keyof Search)[])
    search[key] = params.get(key) || "";
  if (!["", "artist", "calendar", "on-this-day"].includes(search.view))
    search.view = "";
  return search;
}
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
