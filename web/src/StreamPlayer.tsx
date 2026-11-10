import { useRef, useState } from "react";
import { clock, useAudioControls } from "@subcult/archive-viewer/audio";
import type { Track } from "./archive";
import { playerCopy } from "./brand";

const icon = (path: string) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">
    <path d={path} />
  </svg>
);
const icons = {
  previous: icon("M6 5h2v14H6zM20 5v14L9 12z"),
  next: icon("M16 5h2v14h-2zM4 5v14l11-7z"),
  play: icon("M7 4.5v15L19.5 12z"),
  pause: icon("M6 5h4v14H6zM14 5h4v14h-4z"),
  volume: icon("M4 9v6h4l5 4V5L8 9zM15.5 8.2a5 5 0 0 1 0 7.6l-1-1.2a3.4 3.4 0 0 0 0-5.2z"),
  muted: icon("M4 9v6h4l5 4V5L8 9zM16 9.4l1.1-1.1 2 2 2-2 1.1 1.1-2 2 2 2-1.1 1.1-2-2-2 2-1.1-1.1 2-2z"),
};

// The brand owns track selection and these controls; Arkhiv owns listener
// state, completion, volume preferences and transport cleanup. A new track
// remounts this player, and the audio element itself has no native controls.
export default function StreamPlayer({
  track,
  onEnded,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  track: Track;
  onEnded: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(Number.MAX_SAFE_INTEGER);
  const controls = useAudioControls({
    audio,
    start: 0,
    end: duration,
    onEnded,
    initialVolume: 0.7,
  });
  const known = duration < Number.MAX_SAFE_INTEGER;
  const position = Math.min(controls.position, known ? duration : controls.position);
  // Previous restarts the track after its first few seconds, like most players.
  const restart = controls.position > 3;
  return (
    <div className="stream-player">
      <audio
        ref={audio}
        // Volume extensions use Web Audio, which silences cross-origin media
        // unless it was fetched with CORS. Archive's audio CDN supports CORS.
        crossOrigin="anonymous"
        src={track.url}
        {...controls.events}
        onLoadedMetadata={() => {
          const seconds = audio.current?.duration;
          if (seconds && Number.isFinite(seconds)) setDuration(seconds);
          if (audio.current?.paused) void controls.toggle();
        }}
      />
      <div className="transport">
        <button
          type="button"
          className="transport-skip"
          aria-label={restart ? playerCopy.restart : playerCopy.previous}
          disabled={!restart && !hasPrevious}
          onClick={() => (restart ? controls.seek(0) : onPrevious())}
        >
          {icons.previous}
        </button>
        <button
          type="button"
          className="transport-play"
          aria-label={controls.playing ? playerCopy.pause : playerCopy.play}
          aria-busy={controls.pending && !controls.error ? true : undefined}
          onClick={() => void controls.toggle()}
        >
          {controls.playing ? icons.pause : icons.play}
        </button>
        <button
          type="button"
          className="transport-skip"
          aria-label={playerCopy.next}
          disabled={!hasNext}
          onClick={onNext}
        >
          {icons.next}
        </button>
      </div>
      <div className="scrubber">
        <span className="time">{clock(position)}</span>
        <input
          type="range"
          min={0}
          max={known ? Math.floor(duration) : 0}
          step={1}
          value={known ? Math.floor(position) : 0}
          disabled={!known}
          aria-label={playerCopy.seek}
          aria-valuetext={
            known ? `${clock(position)} of ${clock(duration)}` : playerCopy.loading
          }
          onChange={(event) => controls.seek(Number(event.target.value))}
        />
        <span className="time">{known ? clock(duration) : "–:––"}</span>
      </div>
      <div className="volume">
        <button
          type="button"
          className="transport-skip"
          aria-label={playerCopy.mute}
          aria-pressed={controls.muted}
          onClick={() => controls.changeMuted(!controls.muted)}
        >
          {controls.muted ? icons.muted : icons.volume}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={controls.muted ? 0 : controls.volume}
          aria-label={playerCopy.volume}
          aria-valuetext={`${Math.round((controls.muted ? 0 : controls.volume) * 100)}%`}
          onChange={(event) => {
            const value = Number(event.target.value);
            controls.changeVolume(value);
            if (controls.muted && value > 0) controls.changeMuted(false);
          }}
        />
      </div>
      {controls.error && (
        <div className="stream-error">
          <p role="alert">{controls.error}</p>
          <button
            type="button"
            onClick={() => {
              audio.current?.load();
              controls.reset();
            }}
          >
            Retry playback
          </button>
        </div>
      )}
    </div>
  );
}
