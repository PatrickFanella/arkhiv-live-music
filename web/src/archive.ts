import { catalogRequest } from "@subcult/archive-viewer/catalog";
export type Recording = {
  identifier: string;
  title?: unknown;
  creator?: unknown;
  date?: unknown;
  venue?: unknown;
  coverage?: unknown;
  unavailable?: boolean;
};
export type ArchiveFile = {
  name: string;
  title?: string;
  original?: string;
  track?: string;
  format?: string;
  private?: string | boolean;
  length?: string;
};
export type Detail = {
  metadata: Record<string, unknown>;
  playback_bindings?: {
    item: string;
    representation: string;
    files: string[];
  }[];
  files?: ArchiveFile[];
  source_metadata?: Record<string, unknown>;
  editorial?: Record<string, unknown>;
  normalization?: {
    version: string;
    warnings: string[];
    derived: Record<string, string>;
  };
  snapshot_sha256?: string;
  updated_at?: string;
  unavailable?: boolean;
  history?: {
    patch: Record<string, unknown>;
    notes: string;
    created_at: string;
  }[];
};
export type ImportStatus = {
  playback?: {
    reviewed: number;
    pending: number;
    unsupported: number;
    held: number;
    retry: number;
    unavailable: number;
  };
  imported: number;
  discovered: number;
  pending: number;
  failed: number;
  discovery_complete: boolean;
  last_error?: string;
  retry_at?: string;
};
export type Facet = { value: string; count: number };
export type Facets = { artists: Facet[]; years: Facet[]; venues: Facet[] };
export const label = (value: unknown): string =>
  Array.isArray(value)
    ? value.map(label).join(", ")
    : typeof value === "string"
      ? value
      : "";
export type Track = ArchiveFile & { url: string };
export function tracksFor(id: string, files: ArchiveFile[]): Track[] {
  const formats = ["mp3", "m4a", "ogg", "flac", "wav", "mp4"];
  const groups = new Map<string, ArchiveFile>();
  const root = (file: ArchiveFile): string => {
    const original =
      typeof file.original === "string" ? file.original : undefined;
    const source = files.find((candidate) => candidate.name === original);
    const ancestor =
      typeof source?.original === "string" ? source.original : undefined;
    return (ancestor || original || file.name).replace(/\.[^.]+$/, "");
  };
  for (const file of files) {
    if (typeof file.name !== "string") continue;
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (
      !formats.includes(extension) ||
      (file.private && file.private !== "false")
    )
      continue;
    const key = root(file);
    const existing = groups.get(key);
    if (
      !existing ||
      formats.indexOf(extension) <
        formats.indexOf(existing.name.split(".").pop()!.toLowerCase())
    )
      groups.set(key, file);
  }
  return [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((file) => ({
      ...file,
      url: "",
      sourceId: id,
    }));
}
export async function getJSON<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  return catalogRequest<T>(path, signal);
}

// A rendition stored by the engine (source_artist_media module 1).
export type ArtistMedia = {
  sha256: string;
  content_type: string;
  width: number;
  height: number;
};
export type ArtistPhoto = {
  url: string;
  source: string;
  credit: string;
  license: string;
  license_url: string;
  image?: ArtistMedia;
  thumbnail?: ArtistMedia;
};
export type ArtistProfile = {
  artist: string;
  recordings: number;
  first_recording: string;
  last_recording: string;
  profile_updated_at?: string;
  profile: null | {
    name: string;
    // A profile is bound to MusicBrainz, to the artist's Live Music Archive
    // collection, or to both.
    musicbrainz_id?: string | null;
    musicbrainz_url?: string;
    archive_collection?: string;
    archive_url?: string;
    type?: string;
    country?: string;
    area?: { name: string };
    "begin-area"?: { name: string };
    "life-span"?: { begin?: string; end?: string; ended?: boolean };
    biography?: { text: string; source: string; license: string };
    photo?: ArtistPhoto;
  };
};
export type ConcertCalendar = {
  days: { date: string; recordings: number }[];
  month: string;
  year_from: string;
  year_to: string;
};
