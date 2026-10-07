"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Check, Loader2, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface VoiceCardProps {
  id: string;
  name: string;
  description: string;
  accent: string;
  gender: string;
  selected: boolean;
  onSelect: (id: string) => void;
  previewOnly?: boolean;
}
export function VoiceCard({
  id,
  name,
  description,
  accent,
  gender,
  selected,
  onSelect,
  previewOnly = false,
}: VoiceCardProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const request = useRef<AbortController | null>(null);
  function release() {
    audio.current?.pause();
    audio.current = null;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  }
  useEffect(
    () => () => {
      request.current?.abort();
      release();
    },
    [],
  );
  async function preview() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    if (audio.current) {
      try {
        await audio.current.play();
        setPlaying(true);
      } catch {
        setError("Playback was blocked. Please try again.");
      }
      return;
    }
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/voices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: "Every story begins with a possibility. Beyond the last familiar street, a new chapter was waiting to be written.",
        }),
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl.current = URL.createObjectURL(blob);
      const player = new Audio(objectUrl.current);
      audio.current = player;
      player.onended = () => {
        setPlaying(false);
        release();
      };
      player.onerror = () => {
        setPlaying(false);
        setError("This preview couldn’t play. Please try again.");
        release();
      };
      await player.play();
      if (!controller.signal.aborted) setPlaying(true);
    } catch {
      if (!controller.signal.aborted) {
        setError(
          "Voice preview is unavailable right now. You can still review your manuscript.",
        );
        release();
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <div
      className={cn(
        "studio-panel",
        selected && "border-primary/50 ring-2 ring-primary/10",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mic2 size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">
              {name.replace(" (Default)", "")}
            </h3>
            <span className="rounded bg-primary/10 px-2 py-1 text-[9px] text-primary">
              Included · free
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
          <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            {accent} English · {gender}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void preview()}
          disabled={loading}
          aria-label={playing ? "Pause voice preview" : "Play voice preview"}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : playing ? (
            <Pause size={14} />
          ) : (
            <Play size={14} />
          )}{" "}
          {loading
            ? "Preparing…"
            : playing
              ? "Pause preview"
              : "Listen to a sample"}
        </Button>
        {!previewOnly && (
          <Button
            type="button"
            variant={selected ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={selected}
            onClick={() => onSelect(id)}
          >
            {selected ? (
              <>
                <Check size={14} />
                Selected
              </>
            ) : (
              "Use this voice"
            )}
          </Button>
        )}
      </div>
      {error && (
        <p
          className="mt-4 text-xs leading-relaxed text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
