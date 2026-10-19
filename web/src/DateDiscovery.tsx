import { useEffect, useState } from "react";
import { getJSON } from "./archive";
import type { ConcertCalendar } from "./archive";
import type { Search } from "./browse";
import { discoveryCopy as copy } from "./brand";

export const monthNames = Array.from({ length: 12 }, (_, month) =>
  new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2000, month, 1)),
  ),
);
export const monthLength = (month: number, year = 2000) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
export function calendarCells(month: number, year?: number): (number | null)[] {
  const offset =
    year === undefined ? 0 : new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: monthLength(month, year) }, (_, day) => day + 1),
  ];
}

function YearPicker({
  search,
  change,
}: {
  search: Search;
  change: (filters: Partial<Search>) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState(
    !search.year_from
      ? "all"
      : search.year_from === search.year_to
        ? "single"
        : "range",
  );
  const [from, setFrom] = useState(search.year_from || String(currentYear));
  const [to, setTo] = useState(search.year_to || String(currentYear));
  const [error, setError] = useState("");
  return (
    <form
      className="year-picker"
      onSubmit={(event) => {
        event.preventDefault();
        const end = mode === "single" ? from : to;
        if (
          mode !== "all" &&
          (!/^(19|20)[0-9]{2}$/.test(from) ||
            !/^(19|20)[0-9]{2}$/.test(end) ||
            from > end)
        ) {
          setError(copy.yearError);
          return;
        }
        setError("");
        change({
          year: "",
          year_from: mode === "all" ? "" : from,
          year_to: mode === "all" ? "" : end,
        });
      }}
    >
      <label>
        {copy.yearMode}
        <select
          value={mode}
          onChange={(event) => {
            setMode(event.target.value);
            setError("");
          }}
        >
          <option value="single">{copy.singleYear}</option>
          <option value="range">{copy.yearRange}</option>
          <option value="all">{copy.allYears}</option>
        </select>
      </label>
      {mode !== "all" && (
        <label>
          {mode === "single" ? copy.year : copy.fromYear}
          <input
            type="number"
            min="1900"
            max="2099"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            required
          />
        </label>
      )}
      {mode === "range" && (
        <label>
          {copy.toYear}
          <input
            type="number"
            min="1900"
            max="2099"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            required
          />
        </label>
      )}
      <button type="submit">{copy.applyYears}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function MonthPicker({
  month,
  change,
}: {
  month: number;
  change: (month: number) => void;
}) {
  return (
    <label>
      {copy.month}
      <select
        value={month}
        onChange={(event) => change(Number(event.target.value))}
      >
        {monthNames.map((name, index) => (
          <option value={index + 1} key={name}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

function MonthGrid({
  search,
  choose,
}: {
  search: Search;
  choose: (day: number) => void;
}) {
  const [calendar, setCalendar] = useState<ConcertCalendar>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      collection: "etree",
      month: search.month,
      year_from: search.year_from,
      year_to: search.year_to,
      artist: search.artist,
    });
    getJSON<ConcertCalendar>(
      `/api/source-catalog/v1/calendar?${params}`,
      controller.signal,
    )
      .then(setCalendar)
      .catch((error: Error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, [search.month, search.year_from, search.year_to, search.artist, retry]);
  if (error)
    return (
      <div role="status">
        <p>{copy.calendarError}</p>
        <button
          onClick={() => {
            setError("");
            setRetry(retry + 1);
          }}
        >
          {copy.retryCalendar}
        </button>
      </div>
    );
  if (!calendar) return <p role="status">{copy.loadingCalendar}</p>;
  const month = Number(search.month);
  const singleYear =
    search.year_from && search.year_from === search.year_to
      ? Number(search.year_from)
      : undefined;
  const cells = calendarCells(month, singleYear);
  const counts = new Map<number, number>();
  for (const entry of calendar.days) {
    const day = Number(entry.date.slice(8, 10));
    counts.set(day, (counts.get(day) || 0) + entry.recordings);
  }
  return (
    <>
      {!singleYear && <p>{copy.crossYearHelp}</p>}
      <div
        className="calendar-grid"
        aria-label={`${monthNames[month - 1]} ${singleYear || (search.year_from ? `${search.year_from}–${search.year_to}` : copy.allYears)}`}
      >
        {singleYear &&
          copy.weekdays.map((day) => (
            <span key={day} className="calendar-weekday" aria-hidden="true">
              {day}
            </span>
          ))}
        {cells.map((day, index) =>
          day === null ? (
            <span aria-hidden="true" key={`blank-${index}`} />
          ) : (
            <button
              key={day}
              type="button"
              disabled={!counts.get(day)}
              aria-pressed={
                search.month_day ===
                `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              }
              aria-label={`${monthNames[month - 1]} ${day}, ${(counts.get(day) || 0).toLocaleString()} recordings`}
              onClick={() => choose(day)}
            >
              <strong>{day}</strong>
              <span>{(counts.get(day) || 0).toLocaleString()}</span>
            </button>
          ),
        )}
      </div>
      {calendar.days.length === 0 && (
        <p className="notice">{copy.emptyCalendar}</p>
      )}
    </>
  );
}

export default function DateDiscovery({
  search,
  available,
  change,
}: {
  search: Search;
  available?: boolean;
  change: (filters: Partial<Search>) => void;
}) {
  const today = new Date();
  const onThisDay = search.view === "on-this-day";
  const month =
    Number(onThisDay ? search.month_day.slice(0, 2) : search.month) ||
    today.getMonth() + 1;
  const day = Number(search.month_day.slice(3, 5)) || today.getDate();
  const choose = (chosenDay: number, chosenMonth = month) =>
    change({
      month_day: `${String(chosenMonth).padStart(2, "0")}-${String(chosenDay).padStart(2, "0")}`,
      sort: "date_desc",
      ...(onThisDay ? { month: "" } : {}),
    });
  return (
    <section className="date-discovery" aria-labelledby="date-heading">
      <p className="eyebrow">{onThisDay ? copy.onThisDay : copy.calendar}</p>
      <h1 id="date-heading">
        {onThisDay
          ? `${monthNames[month - 1]} ${day}, through the years`
          : `${monthNames[month - 1]} recordings`}
      </h1>
      <p>{onThisDay ? copy.todayHelp : copy.calendarHelp}</p>
      <div className="date-controls">
        <MonthPicker
          month={month}
          change={(next) =>
            onThisDay
              ? choose(Math.min(day, monthLength(next)), next)
              : change({ month: String(next).padStart(2, "0"), month_day: "" })
          }
        />
        {onThisDay && (
          <label>
            {copy.day}
            <select
              value={day}
              onChange={(event) => choose(Number(event.target.value))}
            >
              {Array.from({ length: monthLength(month) }, (_, index) => (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <YearPicker
        key={`${search.year_from}-${search.year_to}`}
        search={search}
        change={(filters) =>
          change({ ...filters, ...(!onThisDay ? { month_day: "" } : {}) })
        }
      />
      {available === false ? (
        <p className="notice">{copy.updateRequired}</p>
      ) : (
        !onThisDay &&
        available && (
          <MonthGrid
            key={`${search.month}-${search.year_from}-${search.year_to}-${search.artist}`}
            search={search}
            choose={choose}
          />
        )
      )}
      {search.month_day && !onThisDay && (
        <button onClick={() => change({ month_day: "" })}>
          {copy.wholeMonth}
        </button>
      )}
    </section>
  );
}
