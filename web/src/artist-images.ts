import type { ArtistPhoto, ArtistProfile } from "./archive";
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
  rightsURL?: string;
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
// Engine photographs keyed by lowercased source artist name.
export type ArtistPhotos = ReadonlyMap<string, ArtistImage>;

function commonsImage(
  artist: string,
  photo: ArtistPhoto | undefined,
  verifiedAt: string,
): ArtistImage | undefined {
  if (
    !photo ||
    !photo.url.startsWith("https://upload.wikimedia.org/") ||
    !photo.source.startsWith("https://commons.wikimedia.org/")
  )
    return undefined;
  return {
    artist,
    aliases: [],
    kind: "photo",
    url: photo.url,
    alt: `${artist} artist photograph`,
    source: photo.source,
    credit: photo.credit,
    rights: photo.license,
    rightsURL: photo.license_url,
    verifiedAt,
  };
}

// Wikimedia serves only standard thumbnail widths; 330px covers the catalog's
// largest artist artwork at 2x without loading multi-megabyte originals.
const thumbnailWidth = 330;
const original =
  /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+\.(?:jpe?g|png|gif|webp|svg))(?:[?#].*)?$/i;
export function commonsThumbnail(url: string, width = thumbnailWidth) {
  const match = original.exec(url);
  if (!match) return url;
  const [, a, ab, name] = match;
  const suffix = /\.svg$/i.test(name) ? ".png" : "";
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${name}/${width}px-${name}${suffix}`;
}

export function artistPhotosFrom(
  entries: { artist: string; photo: ArtistPhoto }[],
): ArtistPhotos {
  const photos = new Map<string, ArtistImage>();
  for (const { artist, photo } of entries) {
    const image = commonsImage(artist, photo, "");
    if (image)
      photos.set(artistKey(artist), {
        ...image,
        url: commonsThumbnail(image.url),
      });
  }
  return photos;
}

// A curated photograph wins, then an engine photograph, then a curated logo.
export function artistImageFor(
  creator: unknown,
  photos?: ArtistPhotos,
): ArtistImage | undefined {
  const name =
    Array.isArray(creator) && creator.length === 1 ? creator[0] : creator;
  if (typeof name !== "string") return undefined;
  const curated = artistImages.find((image) =>
    [image.artist, ...image.aliases].some(
      (alias) => artistKey(alias) === artistKey(name),
    ),
  );
  if (curated?.kind === "photo") return curated;
  const photo = photos?.get(artistKey(name));
  return photo
    ? { ...photo, artist: name, alt: `${name} artist photograph` }
    : curated;
}

// External profile images keep attribution independent of recording metadata.
export function artistProfileImage(
  profile: ArtistProfile,
): ArtistImage | undefined {
  const curated = artistImageFor(profile.artist);
  if (curated?.kind === "photo") return curated;
  return commonsImage(
    profile.artist,
    profile.profile?.photo,
    profile.profile_updated_at?.slice(0, 10) || "",
  );
}
