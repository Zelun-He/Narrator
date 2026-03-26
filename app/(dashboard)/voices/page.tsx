"use client"

export const dynamic = "force-dynamic"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceCard } from "@/components/voice-card"

const voices = [
  {
    id: "1",
    name: "Lessac (Default)",
    description: "Clear, natural voice perfect for narrating any audiobook genre.",
    accent: "American",
    gender: "Neutral",
  },
]

function VoicesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = searchParams.get("bookId")
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!selectedVoice || !bookId || isSubmitting) return

    const voice = voices.find((item) => item.id === selectedVoice)
    if (!voice) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceId: voice.id,
          voiceName: voice.name,
        }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        setError(data.error ?? "Failed to start generation.")
        return
      }

      router.push(`/processing?bookId=${bookId}`)
    } catch {
      setError("Unexpected network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Select a Narrator</h1>
        <p className="text-sm text-muted-foreground">
          Choose an AI voice to narrate your audiobook. Click the play button to preview each voice.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            {...voice}
            selected={selectedVoice === voice.id}
            onSelect={setSelectedVoice}
          />
        ))}
      </div>

      {!bookId && (
        <p className="text-sm text-destructive">
          No active upload found. Please upload a manuscript before selecting a voice.
        </p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end">
        <Button onClick={handleGenerate} disabled={!selectedVoice || !bookId || isSubmitting}>
          {isSubmitting ? "Starting Generation..." : "Generate Audiobook"}
          {!isSubmitting && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  )
}

export default function VoicesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading voices...</div>}>
      <VoicesPageContent />
    </Suspense>
  )
}
