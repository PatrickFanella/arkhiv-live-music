import type { ArchiveFile } from "./archive";
import { readableEscapes } from "./recording-text";

// Display only: filenames and original titles remain the playback identities.
export function trackDisplayTitle(track: ArchiveFile): string {
  const recordedTitle = typeof track.title === "string" ? track.title.trim() : "";
  const original = recordedTitle || track.name;
  let title = readableEscapes(original).replace(/\s+/g, " ").trim();
  const hasTitle = !!recordedTitle;
  // Cryptic fallback filenames do not provide evidence of a song name.
  if (!hasTitle && !/[\s]/.test(title)) return title;
  title = title.replace(/\.(?:mp3|m4a|ogg|flac|wav|mp4|shn)$/i, "");
  const prefix = title.match(/^(\d{1,3})\s*[.)_-]\s+(.+)$/) || title.match(/^(0\d{1,2})\s+(.+)$/);
  const number = typeof track.track === "string"
    ? track.track.match(/^\s*(\d+)(?:\s*\/\s*\d+)?\s*$/)?.[1]
    : undefined;
  const filename = readableEscapes(track.name.split("/").at(-1) || "");
  const filenamePrefix = (filename.match(/^(\d{1,3})\s*[.)_-]\s+/) || filename.match(/^(0\d{1,2})\s+/))?.[1];
  if (prefix && (Number(prefix[1]) === Number(number) || Number(prefix[1]) === Number(filenamePrefix))) {
    title = prefix[2];
  }
  return title.trim() || original;
}
