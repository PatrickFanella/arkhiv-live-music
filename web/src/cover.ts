// A generated J-card cover stands in when a recording has no artwork. The tone
// comes from the artist name, so the same artist always gets the same card.
export const coverTones = 6;

export function coverTone(text: string): number {
  let hash = 0;
  for (const character of text.trim().toLowerCase())
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  return hash % coverTones;
}

// Small covers show one character: the first letter or digit, skipping a
// leading "The".
export function coverInitial(text: string): string {
  const name = text.trim().replace(/^the\s+/i, "");
  const match = name.match(/[\p{L}\p{N}]/u);
  return match ? match[0].toLocaleUpperCase() : "♪";
}
