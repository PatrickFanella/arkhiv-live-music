import { Fragment } from "react";
import type { ReactNode } from "react";
import { label } from "./archive";
import type { Detail } from "./archive";
import { recordingCopy as copy } from "./brand";
import {
  blockText,
  concisePreview,
  plainText,
  retainedField,
  textBlocks,
} from "./recording-text";
import type { RetainedField, Span, TextBlock } from "./recording-text";

const longNotes = 1200;

const Spans = ({ spans }: { spans: Span[] }) =>
  spans.map((span, index) => (
    <Fragment key={index}>
      {span.href ? (
        <a href={span.href} target="_blank" rel="noreferrer nofollow">
          {span.text}
        </a>
      ) : (
        span.text
      )}
    </Fragment>
  ));

const Blocks = ({ blocks }: { blocks: TextBlock[] }) =>
  blocks.map((block, index) => (
    <p className={`recording-text ${block.kind}`} key={index}>
      {block.label && (
        <>
          <strong>{block.label}</strong>
          {block.spans.length > 0 && " "}
        </>
      )}
      <Spans spans={block.spans} />
    </p>
  ));

// Long notes keep their opening visible and disclose the remainder.
function Notes({ field }: { field: RetainedField }) {
  const blocks = textBlocks(field.value, { labels: field.structure });
  if (!blocks.length) return null;
  let used = 0;
  let visible = 0;
  for (const block of blocks) {
    used += blockText(block).length;
    if (visible && used > longNotes) break;
    visible += 1;
  }
  return (
    <div className="recording-notes">
      <Blocks blocks={blocks.slice(0, visible)} />
      {visible < blocks.length && (
        <details className="recording-more">
          <summary>{copy.readFullNotes}</summary>
          <Blocks blocks={blocks.slice(visible)} />
        </details>
      )}
    </div>
  );
}

function FullText({
  field,
  missing,
  preview = false,
}: {
  field: RetainedField;
  missing: string;
  preview?: boolean;
}) {
  const text = plainText(field);
  if (!text) return <>{missing}</>;
  const full: ReactNode = (
    <span className="recording-field-text">
      <Blocks blocks={textBlocks(field.value, { labels: false })} />
    </span>
  );
  const summary = concisePreview(text);
  return preview && summary.shortened ? (
    <details className="recording-more">
      <summary>{summary.preview}</summary>
      {full}
    </details>
  ) : (
    full
  );
}

const facts = ["date", "venue", "coverage", "taper", "transferer", "subject"];

// Shared by every surface that presents a recording. `metadata.songs` is a
// search projection of file titles, so it is not shown as a setlist here.
export default function RecordingContent({ detail }: { detail: Detail }) {
  const setlist = retainedField(detail, "setlist");
  const notes = retainedField(detail, "notes");
  return (
    <div className="recording-content">
      <Notes field={retainedField(detail, "description")} />
      {plainText(setlist) && (
        <>
          <h3>{copy.setlist}</h3>
          <Notes field={setlist} />
        </>
      )}
      {plainText(notes) && (
        <>
          <h3>{copy.notes}</h3>
          <Notes field={notes} />
        </>
      )}
      <dl>
        {facts.map(
          (key) =>
            label(detail.metadata[key]) && (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{label(detail.metadata[key])}</dd>
              </div>
            ),
        )}
        <div>
          <dt>source</dt>
          <dd>
            <FullText
              field={retainedField(detail, "source")}
              missing={copy.sourceMissing}
            />
          </dd>
        </div>
        <div>
          <dt>lineage</dt>
          <dd>
            <FullText
              field={retainedField(detail, "lineage")}
              missing={copy.lineageMissing}
              preview
            />
          </dd>
        </div>
      </dl>
    </div>
  );
}
