import type { Detail } from "./archive";

export type Span = { text: string; href?: string };
export type TextBlock = {
  kind: "paragraph" | "section" | "set";
  label?: string;
  spans: Span[];
};

const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, name: string) => {
    if (name[0] !== "#") return entities[name.toLowerCase()] ?? match;
    const code = Number(
      /^#x/i.test(name) ? `0x${name.slice(2)}` : name.slice(1),
    );
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : match;
  });

// Display only: percent-escapes from URLs and file names read as the characters
// they stand for (`%27` as an apostrophe). A run that does not decode to
// printable text stays as written; link targets keep their exact form.
export function readableEscapes(text: string): string {
  return text.replace(/(?:%[0-9a-f]{2})+/gi, (run) => {
    try {
      const decoded = decodeURIComponent(run);
      return /[\u0000-\u001f\u007f]/.test(decoded) ? run : decoded;
    } catch {
      return run;
    }
  });
}

// Only ordinary web links survive. Everything else stays as visible text.
export function safeHref(value: string): string | undefined {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

const hrefOf = (tag: string) => {
  const match = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag);
  return match ? safeHref(decode(match[1] ?? match[2] ?? match[3])) : undefined;
};

const lineTags = new Set(["div", "li", "ul", "ol", "tr", "table", "blockquote"]);
const paragraphTags = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6"]);

// Reduce retained source HTML to text and validated links. Structure comes
// from the markup's own breaks; nothing is rendered as HTML.
function readSpans(source: string): Span[] {
  const cleaned = source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?(<\/\1\s*>|$)/gi, "")
    .replace(/<!--[\s\S]*?(-->|$)/g, "");
  const spans: Span[] = [];
  let text = "";
  let href: string | undefined;
  const flush = () => {
    if (text && href && /^\s*https?:\/\//i.test(text)) text = readableEscapes(text);
    if (text) spans.push(href ? { text, href } : { text });
    text = "";
  };
  const atLine = () => !text ? spans.length === 0 || spans.at(-1)!.text.endsWith("\n") : text.endsWith("\n");
  const atParagraph = () => {
    const tail = text || spans.at(-1)?.text || "\n\n";
    return tail.endsWith("\n\n");
  };
  const tag = /<(\/?)([a-z][a-z0-9]*)\b[^<>]*>/gi;
  let at = 0;
  for (let match = tag.exec(cleaned); match; match = tag.exec(cleaned)) {
    text += decode(cleaned.slice(at, match.index));
    at = tag.lastIndex;
    const name = match[2].toLowerCase();
    if (name === "br") text += "\n";
    else if (lineTags.has(name)) {
      if (!atLine()) text += "\n";
    } else if (paragraphTags.has(name)) {
      if (!atParagraph()) text += atLine() ? "\n" : "\n\n";
    } else if (name === "td" || name === "th") text += " ";
    else if (name === "a") {
      flush();
      href = match[1] ? undefined : hrefOf(match[0]);
    }
  }
  text += decode(cleaned.slice(at));
  flush();
  return spans;
}

const urlPattern = /https?:\/\/[^\s<>"'`]+/gi;

function linkify(spans: Span[]): Span[] {
  return spans.flatMap((span) => {
    if (span.href) return [span];
    const out: Span[] = [];
    let at = 0;
    for (const match of span.text.matchAll(urlPattern)) {
      const url = match[0].replace(/[.,;:!?)\]]+$/, "");
      const href = safeHref(url);
      if (!href) continue;
      if (match.index > at) out.push({ text: span.text.slice(at, match.index) });
      out.push({ text: readableEscapes(url), href });
      at = match.index + url.length;
    }
    if (at < span.text.length) out.push({ text: span.text.slice(at) });
    return out;
  });
}

function splitLines(spans: Span[]): Span[][] {
  const lines: Span[][] = [[]];
  for (const span of spans)
    span.text.split("\n").forEach((part, index) => {
      if (index) lines.push([]);
      if (part) lines.at(-1)!.push({ ...span, text: part });
    });
  return lines.map((line) => {
    const normal = line.map((span) => ({
      ...span,
      text: span.text.replace(/[ \t\r\u00a0]+/g, " "),
    }));
    if (normal[0]) normal[0].text = normal[0].text.trimStart();
    if (normal.at(-1)) normal.at(-1)!.text = normal.at(-1)!.text.trimEnd();
    return normal.filter((span) => span.text);
  });
}

const setLabel =
  /^(set\s*(?:[0-9]+|[ivx]+|one|two|three|four)|encores?(?:\s*[0-9]+)?|e[0-9]?(?=\s*:))\s*(?::|$)\s*/i;
const sectionLabel =
  /^(set\s?list|notes?|source|lineage|transfer|mastering|equipment|taper|recorded by|transferred by|mastered by)\s*(?::|$)\s*/i;

// A label is recognized only at the start of a retained line. Flattened search
// text has no retained lines, so its callers turn labels off.
export function textBlocks(
  value: unknown,
  { labels = true }: { labels?: boolean } = {},
): TextBlock[] {
  const parts = (Array.isArray(value) ? value : [value]).filter(
    (part): part is string => typeof part === "string",
  );
  const lines = splitLines(linkify(parts.flatMap((part, index) => [
    ...(index ? [{ text: "\n\n" }] : []),
    ...readSpans(part),
  ])));
  const blocks: TextBlock[] = [];
  let open: TextBlock | undefined;
  for (const line of lines) {
    if (!line.length) {
      open = undefined;
      continue;
    }
    const first = line[0];
    const match =
      labels && !first.href
        ? (setLabel.exec(first.text) ?? sectionLabel.exec(first.text))
        : null;
    if (match) {
      const rest = [
        { ...first, text: first.text.slice(match[0].length) },
        ...line.slice(1),
      ].filter((span) => span.text);
      open = {
        kind: setLabel.test(first.text) ? "set" : "section",
        label: match[1],
        spans: rest,
      };
      blocks.push(open);
      continue;
    }
    if (!open) {
      open = { kind: "paragraph", spans: [] };
      blocks.push(open);
    } else if (open.spans.length) {
      open.spans.push({ text: "\n" });
    }
    open.spans.push(...line);
  }
  return blocks;
}

export type RetainedField = { value: unknown; structure: boolean };

// An editorial value wins, including a deliberately empty one. Otherwise show
// the retained source; the flattened search projection is only a last resort.
export function retainedField(detail: Detail, field: string): RetainedField {
  const editorial = detail.editorial || {};
  if (Object.hasOwn(editorial, field))
    return { value: editorial[field], structure: true };
  const source = detail.source_metadata?.[field];
  if (source !== undefined && source !== "")
    return { value: source, structure: true };
  return { value: detail.metadata[field], structure: false };
}

export const blockText = (block: TextBlock) =>
  block.spans.map((span) => span.text).join("");

export const plainText = (field: RetainedField) =>
  textBlocks(field.value, { labels: false }).map(blockText).join("\n\n");

// Whitespace is the only thing normalized; the order and wording of the chain
// are unchanged. A shortened preview ends with an ellipsis at a link boundary.
export function concisePreview(
  text: string,
  limit = 96,
): { preview: string; shortened: boolean } {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return { preview: flat, shortened: false };
  const head = flat.slice(0, limit);
  const boundary = Math.max(head.lastIndexOf(" > "), head.lastIndexOf(", "));
  const cut = boundary > limit / 2 ? boundary : head.lastIndexOf(" ");
  return {
    preview: `${head.slice(0, cut > 0 ? cut : limit).trimEnd()} …`,
    shortened: true,
  };
}
