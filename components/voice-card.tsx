"use client"

import { useState } from "react"
import { Play, Pause, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface VoiceCardProps {
  id: string
  name: string
  description: string
  accent: string
  gender: string
  selected: boolean
  onSelect: (id: string) => void
  previewOnly?: boolean
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioRef] = useState<HTMLAudioElement | null>(null)

  async function togglePreview(e: React.MouseEvent) {
    e.stopPropagation()
    
    if (isPlaying) {
      setIsPlaying(false)
      return
    }

    try {
      setIsPlaying(true)
      const response = await fetch("/api/voices/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `This is the ${name} voice. Perfect for audiobooks and narration.`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate preview")
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      // Create and play audio element
      const audio = new Audio(audioUrl)
      audio.onended = () => {
        setIsPlaying(false)
        URL.revokeObjectURL(audioUrl)
      }
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    } catch (error) {
      console.error("Preview error:", error)
      setIsPlaying(false)
    }
  }

  return (
    <Card
      className={cn(
        "saas-surface border-white/40 transition-all hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        !previewOnly && "cursor-pointer",
        selected && "border-[#4ECDC4] ring-2 ring-[#4ECDC4]/20"
      )}
      onClick={() => {
        if (!previewOnly) onSelect(id)
      }}
    >
      <CardContent className="flex items-center gap-4 pt-0">
        <div className={cn(
          "relative flex size-12 shrink-0 items-center justify-center rounded-full",
          selected ? "bg-[#4ECDC4]/15" : "bg-accent"
        )}>
          {selected ? (
            <Check className="size-5 text-[#4ECDC4]" />
          ) : (
            <span className="text-lg font-semibold text-foreground">
              {name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <h3 className="text-sm font-semibold">{name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {accent}
            </span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {gender}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          onClick={togglePreview}
          aria-label={isPlaying ? "Pause preview" : "Play preview"}
        >
          {isPlaying ? (
            <Pause className="size-3.5" />
          ) : (
            <Play className="size-3.5" />
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
