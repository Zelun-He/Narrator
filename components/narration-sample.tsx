"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

const sampleUrl = "/samples/lj.wav";
const bars = [
  12, 24, 18, 32, 40, 23, 33, 16, 28, 38, 22, 14, 30, 42, 25, 18, 34, 24, 12,
  22,
];

export function NarrationSample({ compact = false }: { compact?: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const player = audio.current;
    return () => player?.pause();
  }, []);

  async function toggle() {
    const player = audio.current;
    if (!player) return;
    setError(false);
    if (!player.paused) {
      player.pause();
      return;
    }
    try {
      await player.play();
    } catch {
      setError(true);
    }
  }

  return (
    <div className={compact ? "sample-inline" : "sample-player"}>
      <audio
        ref={audio}
        src={sampleUrl}
        preload="none"
        onPlay={() => {
          document
            .querySelectorAll<HTMLAudioElement>(".story-site audio")
            .forEach((player) => {
              if (player !== audio.current) player.pause();
            });
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onError={() => {
          setPlaying(false);
          setError(true);
        }}
        onTimeUpdate={() => {
          const player = audio.current;
          if (player?.duration)
            setProgress(player.currentTime / player.duration);
        }}
      />
      <button
        type="button"
        className={
          compact ? "story-button story-button-outline" : "sample-toggle"
        }
        onClick={() => void toggle()}
        aria-label={
          playing ? "Pause narration sample" : "Play narration sample"
        }
        aria-pressed={playing}
      >
        {compact ? (
          <span className="sample-play-icon">
            {playing ? <Pause size={13} /> : <Play size={13} />}
          </span>
        ) : playing ? (
          <Pause size={20} />
        ) : (
          <Play size={20} />
        )}
        {compact && (playing ? "Pause sample" : "Hear a sample")}
      </button>
      {!compact && (
        <div className="sample-details">
          <span className="story-label">
            {playing ? "NOW PLAYING" : "A LITTLE LISTEN"}
          </span>
          <p className="sample-title">The sound of a story.</p>
          <div className="sample-wave" aria-hidden="true">
            {bars.map((height, i) => (
              <span
                key={i}
                style={{ height: height / 2 }}
                className={i / bars.length < progress ? "played" : undefined}
              />
            ))}
          </div>
          <span className="sample-credit">LJ · bundled narration demo</span>
        </div>
      )}
      {error && (
        <p className="sample-error" role="alert">
          This sample couldn’t play. Please try again.
        </p>
      )}
    </div>
  );
}
