/**
 * Audio Generation Service
 * Handles batch TTS generation for book chapters using Piper
 */

import { ttsService } from "./tts-service"
import { updateChapterAudioUrl } from "./audiobook-store"
import path from "path"
import fs from "fs/promises"
import type { Chapter } from "@/lib/audiobook-types"

export interface ChapterForGeneration {
  id: string
  text: string
  index: number
}

export interface AudioGenerationTask {
  bookId: string
  chapters: ChapterForGeneration[]
  voiceId: string
}

export interface GeneratedAudio {
  chapterId: string
  audioUrl: string
  duration: number
  size: number
}

/**
 * Generate audio for all chapters in a book
 * Processes chapters sequentially or in parallel (configurable)
 */
export async function generateAudioForBook(
  task: AudioGenerationTask,
  options: {
    parallelLimit?: number
    onProgress?: (completed: number, total: number) => void
  } = {}
): Promise<{
  success: boolean
  generatedChapters: GeneratedAudio[]
  failedChapters: Array<{ id: string; error: string }>
  error?: string
}> {
  const { parallelLimit = 2 } = options

  try {
    // Create audio directory for this book
    const audioDir = path.join(process.cwd(), "public", "audio", `book-${task.bookId}`)
    await fs.mkdir(audioDir, { recursive: true })

    const generatedChapters: GeneratedAudio[] = []
    const failedChapters: Array<{ id: string; error: string }> = []

    // Process chapters in batches to avoid overwhelming the system
    for (let i = 0; i < task.chapters.length; i += parallelLimit) {
      const batch = task.chapters.slice(i, i + parallelLimit)

      const batchResults = await Promise.allSettled(
        batch.map((chapter) => generateChapterAudio(task.bookId, chapter, audioDir))
      )

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j]
        const chapter = batch[j]

        if (result.status === "fulfilled") {
          const generatedAudio = result.value
          generatedChapters.push(generatedAudio)
          
          // Persist the audio URL to the database
          await updateChapterAudioUrl({
            bookId: task.bookId,
            chapterId: generatedAudio.chapterId,
            audioUrl: generatedAudio.audioUrl,
            duration: generatedAudio.duration,
          })
        } else {
          const error = result.reason instanceof Error ? result.reason.message : String(result.reason)
          failedChapters.push({
            id: chapter.id,
            error,
          })
        }

        // Report progress
        const completed = generatedChapters.length + failedChapters.length
        options.onProgress?.(completed, task.chapters.length)
      }
    }

    return {
      success: failedChapters.length === 0,
      generatedChapters,
      failedChapters,
    }
  } catch (error) {
    return {
      success: false,
      generatedChapters: [],
      failedChapters: task.chapters.map((ch) => ({
        id: ch.id,
        error: "Unknown error during generation",
      })),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Generate audio for a single chapter
 */
async function generateChapterAudio(
  bookId: string,
  chapter: ChapterForGeneration,
  audioDir: string,
  retries: number = 3
): Promise<GeneratedAudio> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Generate audio using TTS service
      const audioMetadata = await ttsService.generatePersistentAudio(chapter.text)

      if (!audioMetadata.filepath) {
        throw new Error("TTS service did not return audio filepath")
      }

      // Move file from /public/audio/piper-*.wav to /public/audio/book-{bookId}/chapter-*.wav
      const newFileName = `chapter-${chapter.index + 1}-${chapter.id}.wav`
      const newFilePath = path.join(audioDir, newFileName)

      // Copy the file to the book-specific directory
      const fileContent = await fs.readFile(audioMetadata.filepath)
      await fs.writeFile(newFilePath, fileContent)

      // Clean up the original temp file
      try {
        await fs.unlink(audioMetadata.filepath)
      } catch {
        // Ignore cleanup errors
      }

      const audioUrl = `/audio/book-${bookId}/${newFileName}`

      return {
        chapterId: chapter.id,
        audioUrl,
        duration: audioMetadata.duration || 0,
        size: fileContent.length,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Wait before retrying (exponential backoff)
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  throw lastError || new Error("Failed to generate audio after retries")
}

/**
 * Cleanup old audio files for a book
 */
export async function cleanupBookAudio(bookId: string): Promise<boolean> {
  try {
    const audioDir = path.join(process.cwd(), "public", "audio", `book-${bookId}`)

    // Check if directory exists
    try {
      await fs.stat(audioDir)
    } catch {
      return true // Already doesn't exist
    }

    // Remove directory and all files
    await fs.rm(audioDir, { recursive: true, force: true })
    return true
  } catch (error) {
    console.error(`Failed to cleanup audio for book ${bookId}:`, error)
    return false
  }
}

/**
 * Get audio directory for a book
 */
export function getAudioDirForBook(bookId: string): string {
  return path.join(process.cwd(), "public", "audio", `book-${bookId}`)
}

/**
 * Get audio URL for a chapter
 */
export function getChapterAudioUrl(bookId: string, chapterIndex: number, chapterId: string): string {
  return `/audio/book-${bookId}/chapter-${chapterIndex + 1}-${chapterId}.wav`
}

/**
 * Validate chapter text before generating audio
 */
export function validateChapterText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Chapter text is empty" }
  }

  if (text.length > 50000) {
    // 50KB limit per chapter (roughly 10,000 words)
    return { valid: false, error: "Chapter text exceeds maximum length" }
  }

  return { valid: true }
}
