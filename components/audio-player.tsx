"use client"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

interface AudioPlayerProps {
  title: string
  chapter: string
  audioUrl?: string
  duration?: string
  onPrevious?: () => void
  onNext?: () => void
  isLoading?: boolean
}

export function AudioPlayer({
  title,
  chapter,
  audioUrl,
  duration,
  onPrevious,
  onNext,
  isLoading = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState([0])
  const [volume, setVolume] = useState([75])
  const [currentTime, setCurrentTime] = useState("0:00")
  const [displayDuration, setDisplayDuration] = useState(duration || "--:--")
  const [hasError, setHasError] = useState(false)

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Update audio source when audioUrl changes
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      setHasError(false)
    }
  }, [audioUrl])

  // Update progress as audio plays
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      if (audio.duration) {
        const percent = (audio.currentTime / audio.duration) * 100
        setProgress([percent])
        setCurrentTime(formatTime(audio.currentTime))
        setDisplayDuration(formatTime(audio.duration))
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    const handleError = () => {
      setHasError(true)
      setIsPlaying(false)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("error", handleError)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("error", handleError)
    }
  }, [])

  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return

    if (isPlaying && audioUrl) {
      audioRef.current.play().catch(() => {
        setHasError(true)
        setIsPlaying(false)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, audioUrl])

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

  const handleProgressChange = (value: number[]) => {
    setProgress(value)
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (value[0] / 100) * audioRef.current.duration
    }
  }

  const canPlay = !!audioUrl && !isLoading && !hasError

  return (
    <div className="saas-surface flex flex-col gap-4 rounded-xl border border-[#A78BFA]/20 p-6">
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{chapter}</p>
      </div>

      {/* Status Messages */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Generating audio...
        </div>
      )}

      {hasError && (
        <div className="flex items-center justify-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-3" />
          Failed to load audio
        </div>
      )}

      {!audioUrl && !isLoading && (
        <div className="text-center text-xs text-muted-foreground">
          Audio not yet generated
        </div>
      )}

      {/* Progress Bar */}
      {canPlay && (
        <div className="flex flex-col gap-2">
          <Slider
            value={progress}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="cursor-pointer"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">{currentTime}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{displayDuration}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Previous chapter"
          onClick={onPrevious}
          disabled={!canPlay}
        >
          <SkipBack className="size-4" />
        </Button>
        <Button
          size="icon-lg"
          className="rounded-full bg-[#A78BFA] text-white hover:bg-[#A78BFA]/90"
          onClick={() => setIsPlaying(!isPlaying)}
          disabled={!canPlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Next chapter"
          onClick={onNext}
          disabled={!canPlay}
        >
          <SkipForward className="size-4" />
        </Button>
      </div>

      {/* Volume Control */}
      {canPlay && (
        <div className="flex items-center gap-2 self-center">
          <Volume2 className="size-3.5 text-muted-foreground" />
          <Slider
            value={volume}
            onValueChange={setVolume}
            max={100}
            step={1}
            className="w-24 cursor-pointer"
          />
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </div>
  )
}
