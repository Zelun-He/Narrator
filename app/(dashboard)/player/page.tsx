"use client"

export const dynamic = "force-dynamic"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Play, Pause, Download, FileArchive, FileAudio, Headphones } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AudioPlayer } from "@/components/audio-player"
import { cn } from "@/lib/utils"
import type { BookDetails } from "@/lib/audiobook-types"

interface Chapter {
  id: string
  name: string
  duration: string
}

const downloads = [
  {
    label: "Download MP3",
    description: "Individual MP3 files for each chapter",
    icon: FileAudio,
    size: "245 MB",
    format: "mp3",
  },
  {
    label: "Download M4B Audiobook",
    description: "Single audiobook file with chapters",
    icon: Headphones,
    size: "198 MB",
    format: "m4b",
  },
  {
    label: "Download ZIP of chapters",
    description: "All chapters in a compressed archive",
    icon: FileArchive,
    size: "238 MB",
    format: "zip",
  },
]

function PlayerPageContent() {
  const searchParams = useSearchParams()
  const bookId = searchParams.get("bookId")
  const [book, setBook] = useState<BookDetails | null>(null)
  const [currentChapter, setCurrentChapter] = useState<string | null>(null)
  const [playingChapter, setPlayingChapter] = useState<string | null>(null)

  useEffect(() => {
    if (!bookId) return

    let mounted = true
    const loadBook = async () => {
      const response = await fetch(`/api/books/${bookId}`, { cache: "no-store" })
      if (!response.ok) return
      const data = (await response.json()) as { book: BookDetails }
      if (!mounted) return

      setBook(data.book)
      const firstChapter = data.book.chaptersList[0]?.id ?? null
      setCurrentChapter((prev) => prev ?? firstChapter)
      setPlayingChapter((prev) => prev ?? firstChapter)
    }

    loadBook()
    return () => {
      mounted = false
    }
  }, [bookId])

  const chapters: Chapter[] = useMemo(
    () =>
      (book?.chaptersList ?? []).map((chapter) => ({
        id: chapter.id,
        name: chapter.name,
        duration: chapter.duration ?? "--:--",
      })),
    [book]
  )

  const activeChapter = chapters.find((c) => c.id === currentChapter)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">Audiobook Player</h1>
        <p className="text-sm text-muted-foreground">
          {book
            ? `Listen to "${book.title}" narrated by ${book.voiceName ?? "your selected voice"}.`
            : "Load a completed audiobook from the dashboard to start listening."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card className="saas-surface border-white/40">
            <CardHeader>
              <CardTitle className="text-base">Chapters</CardTitle>
              <CardDescription>
                {chapters.length} chapters {" "}
                {/* total duration */}
                <span className="font-mono">
                  {"(runtime estimated)"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chapters.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No chapter audio available yet. Wait until processing is complete.
                </p>
              ) : (
                <div className="flex flex-col divide-y">
                {chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      setCurrentChapter(chapter.id)
                      setPlayingChapter(chapter.id)
                    }}
                    className={cn(
                      "flex items-center justify-between py-3 text-left transition-colors hover:bg-muted/50 -mx-6 px-6 rounded-md",
                      currentChapter === chapter.id && "bg-[#A78BFA]/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full",
                          currentChapter === chapter.id
                            ? "bg-[#A78BFA] text-white"
                            : "bg-muted"
                        )}
                      >
                        {playingChapter === chapter.id ? (
                          <Pause className="size-3.5" />
                        ) : (
                          <Play className="size-3.5 ml-0.5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-sm",
                          currentChapter === chapter.id && "font-medium"
                        )}
                      >
                        {chapter.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {chapter.duration}
                    </span>
                  </button>
                ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="saas-surface border-white/40">
            <CardHeader>
              <CardTitle className="text-base">Downloads</CardTitle>
              <CardDescription>Export your audiobook in different formats.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {downloads.map((download) => (
                  <button
                    key={download.label}
                    className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-muted/50"
                    onClick={() => {
                      if (!bookId) return
                      window.location.href = `/api/books/${bookId}/download?format=${download.format}`
                    }}
                    disabled={!bookId}
                  >
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#0EA5E9]/15">
                      <download.icon className="size-5 text-[#0EA5E9]" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium">{download.label}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {bookId ? download.size : "Unavailable"}
                      </span>
                    </div>
                    <Download className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <AudioPlayer
            title={book?.title ?? "No Audiobook Selected"}
            chapter={activeChapter?.name || ""}
            duration={activeChapter?.duration || "00:00"}
            currentTime="04:32"
          />
        </div>
      </div>
    </div>
  )
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading player...</div>}>
      <PlayerPageContent />
    </Suspense>
  )
}
