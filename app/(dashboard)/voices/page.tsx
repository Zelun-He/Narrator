"use client"

export const dynamic = "force-dynamic"

import { Suspense, useState } from "react"
import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VoiceCard } from "@/components/voice-card"
import { VOICE_OPTIONS } from "@/lib/voice-options"
import type { BookDetails } from "@/lib/audiobook-types"

function VoicesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = searchParams.get("bookId")
  const [bookVoice, setBookVoice] = useState<{ id: string; name: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) return
    let mounted = true

    const loadBook = async () => {
      const response = await fetch(`/api/books/${bookId}`, { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as { book: BookDetails }
      if (!mounted) return

      if (data.book.voiceId && data.book.voiceName) {
        setBookVoice({ id: data.book.voiceId, name: data.book.voiceName })
      }
    }

    loadBook()
    return () => {
      mounted = false
    }
  }, [bookId])

  async function handleGenerate() {
    if (!bookVoice || !bookId || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/books/${bookId}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voiceId: bookVoice.id,
          voiceName: bookVoice.name,
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
          Preview the available voices. Narrator selection now happens during manuscript upload.
        </p>
        {bookVoice && (
          <p className="mt-2 text-sm text-[#4ECDC4]">
            Selected narrator for this book: <strong>{bookVoice.name}</strong>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VOICE_OPTIONS.map((voice) => (
          <VoiceCard
            key={voice.id}
            {...voice}
            selected={bookVoice?.id === voice.id}
            onSelect={() => {}}
            previewOnly
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
        <Button onClick={handleGenerate} disabled={!bookVoice || !bookId || isSubmitting}>
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
