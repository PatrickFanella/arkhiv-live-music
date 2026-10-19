// Brand constants for Lineage. Keep copy and names consistent across the app
// and metadata. See docs/reference/brand.md for voice, tokens and usage.
export const brand = {
  name: "Lineage",
  descriptor: "live recordings",
  tagline: "Live recordings, with their lineage.",
  description:
    "Search live shows from the Internet Archive’s Live Music Archive by artist, venue and date. Every recording keeps its source metadata, corrections and taper lineage visible.",
  collectionName: "Live Music Archive",
  collectionURL: "https://archive.org/details/etree",
} as const;

export const discoveryCopy = {
  browse: "Browse recordings",
  calendar: "Concert calendar",
  onThisDay: "On this day",
  artist: "Artist page",
  yearMode: "Years to include",
  singleYear: "Single year",
  yearRange: "Range of years",
  allYears: "All years",
  applyYears: "Apply years",
  calendarHelp:
    "Choose a month and years. Each count is a recording; different tapes can document the same concert.",
  crossYearHelp:
    "Dates are grouped by day of the month across the selected years.",
  todayHelp:
    "Recordings made on this month and day, across the selected years.",
  updateRequired:
    "This catalog service needs an update before date and artist discovery can load.",
  noBiography: "A sourced biography is not available for this artist yet.",
  noPhoto: "Artist photograph not available",
  sourceFacts: "Artist information from MusicBrainz",
  biographyCredit: "Wikipedia contributors · CC BY-SA 4.0",
  unknown: "Not recorded",
  loadingArtist: "Loading artist information…",
  artistError:
    "Artist information could not load. Recordings remain available below.",
  retryArtist: "Retry artist information",
  artistType: "Artist type",
  origin: "Origin",
  country: "Country",
  activeFrom: "Active from",
  activeUntil: "Active until",
  readBiography: "Read the biography",
  year: "Year",
  fromYear: "From year",
  toYear: "To year",
  yearError: "Choose an ordered year range from 1900 through 2099.",
  month: "Month",
  day: "Day",
  loadingCalendar: "Loading the concert calendar…",
  calendarError: "The calendar could not load.",
  retryCalendar: "Retry calendar",
  emptyCalendar:
    "No recordings with complete dates match this month and these years.",
  wholeMonth: "Show the whole month",
  dateRecordings: "Recordings by date",
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
} as const;
