import type { ArchiveFile } from "./archive";
export type RecordingArtwork = { url: string; file: string; source: string };

// Select from the retained inventory. Do not probe source files or use the
// automatic item thumbnail, which can be generated from audio visualizations.
export function recordingArtwork(
  id: string,
  files: ArchiveFile[],
  unavailable = false,
): RecordingArtwork | undefined {
  if (unavailable || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) return undefined;
  const audioStems = new Set(
    files
      .filter(
        (file) =>
          typeof file.name === "string" &&
          /\.(mp3|flac|ogg|wav|m4a|mp4)$/i.test(file.name),
      )
      .map((file) => file.name.replace(/\.[^.]+$/, "").toLowerCase()),
  );
  const ranked = files
    .flatMap((file) => {
      if (typeof file.name !== "string") return [];
      const name = file.name.toLowerCase();
      if (
        (file.private && file.private !== "false") ||
        !/\.(jpe?g|png|webp|gif)$/i.test(name) ||
        /spectro|waveform|spectrum|__ia_thumb/i.test(
          `${name} ${file.format || ""}`,
        ) ||
        file.name.includes("\\") ||
        file.name
          .split("/")
          .some((segment) => segment === "." || segment === ".." || !segment) ||
        audioStems.has(name.replace(/\.[^.]+$/, ""))
      )
        return [];
      const namedArtwork =
        /(?:^|[\s/_.-])(cover|front|artwork|poster|photo|folder|album)(?:[\s_.-]|$)/i.test(
          name.replace(/\.[^.]+$/, ""),
        );
      if (/\.png$/i.test(name) && !namedArtwork && file.format !== "Item Image")
        return [];
      const score =
        (namedArtwork ? 0 : file.format === "Item Image" ? 1 : 2) +
        (/thumb/i.test(name) ? 3 : 0);
      return [{ file: file.name, score }];
    })
    .sort((a, b) => a.score - b.score || a.file.localeCompare(b.file));
  const file = ranked[0]?.file;
  return file
    ? {
        file,
        url: `https://archive.org/download/${encodeURIComponent(id)}/${file.split("/").map(encodeURIComponent).join("/")}`,
        source: `https://archive.org/details/${encodeURIComponent(id)}`,
      }
    : undefined;
}
