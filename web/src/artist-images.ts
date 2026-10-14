// Curated references, independent of imported recording metadata.
// Add exact aliases only after confirming the artist and inspecting the image.
export type ArtistImage = {
  artist: string;
  aliases: string[];
  kind: "logo" | "photo";
  url: string;
  alt: string;
  source: string;
  credit: string;
  rights: string;
  verifiedAt: string;
};
const rights =
  "Provided by the artist collection on Internet Archive. A reuse license is not recorded here.";
export const artistImages: ArtistImage[] = [
  {
    artist: "Ween",
    aliases: [],
    kind: "photo",
    url: "https://archive.org/download/Ween/ween3.jpg",
    alt: "Ween band photograph",
    source: "https://archive.org/details/Ween",
    credit: "Ween collection, Internet Archive",
    rights,
    verifiedAt: "2026-10-14",
  },
  {
    artist: "Billy Strings",
    aliases: [],
    kind: "photo",
    url: "https://archive.org/download/BillyStrings/__ia_thumb.jpg",
    alt: "Billy Strings holding an acoustic guitar",
    source: "https://archive.org/details/BillyStrings",
    credit: "Billy Strings collection, Internet Archive",
    rights,
    verifiedAt: "2026-10-14",
  },
  {
    artist: "Phil Lesh and Friends",
    aliases: ["Phil Lesh & Friends"],
    kind: "logo",
    url: "https://archive.org/download/PhilLeshandFriends/phillesh_logo.jpg",
    alt: "Phil Lesh logo",
    source: "https://archive.org/details/PhilLeshandFriends",
    credit: "Phil Lesh and Friends collection, Internet Archive",
    rights,
    verifiedAt: "2026-10-14",
  },
  {
    artist: "Grateful Dead",
    aliases: [],
    kind: "logo",
    url: "https://archive.org/download/GratefulDead/GratefulDead_Logo.jpg",
    alt: "Grateful Dead skull and lightning bolt logo",
    source: "https://archive.org/details/GratefulDead",
    credit: "Grateful Dead collection, Internet Archive",
    rights,
    verifiedAt: "2026-10-14",
  },
];
const artistKey = (name: string) =>
  name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
export function artistImageFor(creator: unknown): ArtistImage | undefined {
  const name =
    Array.isArray(creator) && creator.length === 1 ? creator[0] : creator;
  if (typeof name !== "string") return undefined;
  return artistImages.find((image) =>
    [image.artist, ...image.aliases].some(
      (alias) => artistKey(alias) === artistKey(name),
    ),
  );
}
