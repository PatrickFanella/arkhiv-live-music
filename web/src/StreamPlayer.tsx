import { useRef, useState } from "react";
import { useAudioControls } from "@subcult/archive-viewer/audio";
import type { Track } from "./archive";

// The brand owns track selection; Arkhiv owns listener state, completion,
// volume preferences and transport cleanup. A new track remounts this player.
export default function StreamPlayer({
  track,
  onEnded,
}: {
  track: Track;
  onEnded: () => void;
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
  return (
    <div className="stream-player">
      <audio
        ref={audio}
        // Volume extensions use Web Audio, which silences cross-origin media
        // unless it was fetched with CORS. Archive's audio CDN supports CORS.
        crossOrigin="anonymous"
        src={track.url}
        controls
        {...controls.events}
        onLoadedMetadata={() => {
          const seconds = audio.current?.duration;
          if (seconds && Number.isFinite(seconds)) setDuration(seconds);
          if (audio.current?.paused) void controls.toggle();
        }}
      />
      {controls.error && (
        <div>
          <p role="alert">{controls.error}</p>
          <button
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
