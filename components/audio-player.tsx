"use client"

import { useState } from "react"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Shuffle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface AudioPlayerProps {
  title: string
  chapter: string
  duration: string
  currentTime: string
}

export function AudioPlayer({ title, chapter, duration, currentTime }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState([35])
  const [volume, setVolume] = useState([75])

  return (
    <div className="saas-surface flex flex-col gap-4 rounded-xl border border-[#A78BFA]/20 p-6">
      <div className="flex flex-col items-center gap-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{chapter}</p>
      </div>

      <div className="flex flex-col gap-2">
        <Slider
          value={progress}
          onValueChange={setProgress}
          max={100}
          step={1}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">{currentTime}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{duration}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Shuffle">
          <Shuffle className="size-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Previous chapter">
          <SkipBack className="size-4" />
        </Button>
        <Button
          size="icon-lg"
          className="rounded-full bg-[#A78BFA] text-white hover:bg-[#A78BFA]/90"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5 ml-0.5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Next chapter">
          <SkipForward className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Repeat">
          <Repeat className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

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
    </div>
  )
}
