import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecordingContent from "./RecordingContent";
import { concisePreview, retainedField, safeHref, textBlocks } from "./recording-text";
import type { Detail } from "./archive";

const detail = (overrides: Partial<Detail> = {}): Detail => ({
  metadata: {},
  source_metadata: {},
  editorial: {},
  ...overrides,
});
const text = (blocks: ReturnType<typeof textBlocks>) =>
  blocks.map((block) => block.spans.map((span) => span.text).join(""));

describe("retained recording text", () => {
  it("keeps paragraphs and line breaks from source markup", () => {
    const blocks = textBlocks(
      "<div>Band</div><div>Chicago, IL</div><div><br /></div><div>Loaned&nbsp;tape</div><p>Second</p>",
    );
    expect(text(blocks)).toEqual(["Band\nChicago, IL", "Loaned tape", "Second"]);
  });

  it("treats array entries as separate retained paragraphs", () => {
    expect(text(textBlocks(["One", 7, "Two"]))).toEqual(["One", "Two"]);
  });

  it("drops script and style bodies and leaves escaped markup as text", () => {
    const blocks = textBlocks(
      '<script>alert(1)</script><style>p{}</style>Kept <img src=x onerror=alert(1)> &lt;script&gt;x&lt;/script&gt;<script>never closed',
    );
    expect(text(blocks)).toEqual(["Kept <script>x</script>"]);
  });

  it("keeps segue marks that are not tags", () => {
    expect(text(textBlocks("Voodoo> Delphi Plane > Bertha"))).toEqual([
      "Voodoo> Delphi Plane > Bertha",
    ]);
  });

  it.each([
    "javascript:alert(1)",
    "JaVa\tScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//evil.example/x",
    "/relative",
    "https://user:pass@evil.example/",
  ])("does not link %s", (href) => {
    expect(safeHref(href)).toBeUndefined();
    const blocks = textBlocks(`<a href="${href}">label</a>`);
    expect(blocks[0].spans.every((span) => !span.href)).toBe(true);
  });

  it("keeps safe markup links and links bare URLs without trailing punctuation", () => {
    const blocks = textBlocks(
      '<a href="https://example.org/a?b=1&amp;c=2">set</a> see https://example.org/x.',
    );
    expect(blocks[0].spans[0]).toEqual({
      text: "set",
      href: "https://example.org/a?b=1&c=2",
    });
    expect(blocks[0].spans.at(-2)).toEqual({
      text: "https://example.org/x",
      href: "https://example.org/x",
    });
    expect(blocks[0].spans.at(-1)).toEqual({ text: "." });
  });

  it("shows percent-escaped links as readable text and keeps the exact target", () => {
    const blocks = textBlocks(
      'Venue: https://en.wikipedia.org/wiki/T.T._the_Bear%27s_Place<br><a href="https://example.org/Caf%C3%A9">https://example.org/Caf%C3%A9</a> and https://example.org/50%zz',
    );
    const links = blocks.flatMap((block) => block.spans).filter((span) => span.href);
    expect(links).toEqual([
      {
        text: "https://en.wikipedia.org/wiki/T.T._the_Bear's_Place",
        href: "https://en.wikipedia.org/wiki/T.T._the_Bear%27s_Place",
      },
      { text: "https://example.org/Café", href: "https://example.org/Caf%C3%A9" },
      { text: "https://example.org/50%zz", href: "https://example.org/50%zz" },
    ]);
  });

  it("recognizes explicit set and encore boundaries at line starts only", () => {
    const blocks = textBlocks(
      "<b>Set 1:</b> Voodoo> Bertha<br>Set II<br>Eyes<br>E: Wolfman<br>Encore<br>Ripple<br>the set one was cut",
    );
    expect(blocks.map((block) => [block.kind, block.label])).toEqual([
      ["set", "Set 1"],
      ["set", "Set II"],
      ["set", "E"],
      ["set", "Encore"],
    ]);
    expect(text(blocks)[3]).toBe("Ripple\nthe set one was cut");
  });

  it("does not guess boundaries or labels from flattened search text", () => {
    const flat = "Setlist Set 1: Voodoo Encore: Ripple";
    const blocks = textBlocks(flat, { labels: false });
    expect(blocks).toHaveLength(1);
    expect(blocks[0].kind).toBe("paragraph");
    expect(text(blocks)).toEqual([flat]);
  });

  it("prefers an editorial value, even when empty, then the retained source", () => {
    const base = {
      metadata: { description: "flat" },
      source_metadata: { description: "<p>source</p>" },
    };
    expect(retainedField(detail({ ...base, editorial: { description: "edit" } }), "description"))
      .toEqual({ value: "edit", structure: true });
    expect(retainedField(detail({ ...base, editorial: { description: "" } }), "description").value).toBe("");
    expect(retainedField(detail(base), "description")).toEqual({ value: "<p>source</p>", structure: true });
    expect(retainedField(detail({ metadata: { description: "flat" } }), "description"))
      .toEqual({ value: "flat", structure: false });
  });

  it("previews long lineage at a chain boundary without rewording it", () => {
    const chain = `${"A".repeat(60)} > ${"B".repeat(60)} > C`;
    expect(concisePreview(chain)).toEqual({ preview: `${"A".repeat(60)} …`, shortened: true });
    expect(concisePreview("SBD  >  DAT\n> FLAC")).toEqual({ preview: "SBD > DAT > FLAC", shortened: false });
  });
});

describe("RecordingContent", () => {
  it("renders hostile source as inert text", () => {
    const html = renderToString(
      <RecordingContent
        detail={detail({
          source_metadata: {
            description:
              '<img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a><script>alert(2)</script>',
          },
        })}
      />,
    );
    expect(html).toContain("click");
    expect(html).not.toMatch(/<img|<script|javascript:|onerror/);
  });

  it("states missing source and lineage instead of omitting them", () => {
    const html = renderToString(<RecordingContent detail={detail()} />);
    expect(html).toContain("Source not recorded");
    expect(html).toContain("Lineage not recorded");
  });

  it("shows retained lineage with a preview and its full text", () => {
    const lineage = `${"A".repeat(60)} > ${"B".repeat(60)}`;
    const html = renderToString(
      <RecordingContent detail={detail({ source_metadata: { lineage } })} />,
    );
    expect(html).toContain("<summary>");
    expect(html).toContain(`${"B".repeat(60)}`);
    expect(html).not.toContain("Lineage not recorded");
  });

  it("does not present the songs search projection as a setlist", () => {
    const html = renderToString(
      <RecordingContent
        detail={detail({
          metadata: { songs: "Dark Star China Cat Rider Dark Star" },
        })}
      />,
    );
    expect(html).not.toContain("Dark Star");
    expect(html).not.toContain("Setlist");
  });

  it("renders a retained setlist field separately, keeping multi-song lines whole", () => {
    const html = renderToString(
      <RecordingContent
        detail={detail({
          source_metadata: { setlist: "Set 1:\nChina Cat Sunflower > I Know You Rider" },
        })}
      />,
    );
    expect(html).toContain("Setlist");
    expect(html).toContain("China Cat Sunflower &gt; I Know You Rider");
  });

  it("discloses the remainder of long notes", () => {
    const description = Array.from({ length: 4 }, (_, index) => `Paragraph ${index} ${"x".repeat(500)}`).join("\n\n");
    const html = renderToString(
      <RecordingContent detail={detail({ source_metadata: { description } })} />,
    );
    expect(html).toContain("Read the full notes");
    expect(html.indexOf("Paragraph 2")).toBeGreaterThan(html.indexOf("Read the full notes"));
  });

  it("applies an editorial description over retained source", () => {
    const html = renderToString(
      <RecordingContent
        detail={detail({
          editorial: { description: "Corrected note" },
          source_metadata: { description: "Original note" },
        })}
      />,
    );
    expect(html).toContain("Corrected note");
    expect(html).not.toContain("Original note");
  });
});
