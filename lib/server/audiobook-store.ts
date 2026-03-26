import { mkdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import type {
  BookDetails,
  BookListItem,
  BookStatus,
  Chapter,
  ChapterStatus,
} from "@/lib/audiobook-types"
import { buildChapterSeeds } from "@/lib/server/chapter-parser"
import { storeAdapter } from "@/lib/server/persistence"
import type { BookRecord } from "@/lib/server/store-types"

const DATA_DIR = path.join(process.cwd(), "data")
const UPLOADS_DIR = path.join(DATA_DIR, "uploads")
const CHAPTER_SECONDS = 8

const COVER_COLORS = ["#FF6B6B", "#4ECDC4", "#F59E0B", "#A78BFA", "#0EA5E9", "#FF9F43"]

interface CreateBookInput {
  title: string
  author: string
  language: string
  fileName: string
  fileType: string
  fileSize: number
  status: BookStatus
  progress: number
  coverColor: string
  chaptersList: Chapter[]
  voiceId: string | null
  voiceName: string | null
  generationStartedAt: string | null
  createdAt: string
  updatedAt: string
  // Audio generation fields
  uploadedFileName?: string
  uploadedFilePath?: string
  audioDirectory?: string
  failedChapters?: string[]
  generationError?: string
}

interface StoreData {
  books: BookRecord[]
}

export interface BookStatusSnapshot {
  bookId: string
  status: BookStatus
  progress: number
  chapterStats: {
    total: number
    completed: number
    processing: number
    pending: number
    failed: number
  }
  activeChapter: Chapter | null
  startedAt: string | null
  updatedAt: string
  parserMetadata?: {
    strategy?: BookRecord["parserStrategy"]
    sourceStats?: BookRecord["parserSourceStats"]
  }
}

function getDurationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${sec}`
}

function mapToListItem(book: BookRecord): BookListItem {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    language: book.language,
    status: book.status,
    chapters: book.chaptersList.length,
    progress: book.progress,
    coverColor: book.coverColor,
    createdAt: book.createdAt,
    voiceId: book.voiceId,
    voiceName: book.voiceName,
  }
}

function mapToDetails(book: BookRecord): BookDetails {
  return {
    ...mapToListItem(book),
    chaptersList: book.chaptersList,
  }
}

function reconcileProgress(book: BookRecord): BookRecord {
  if (!book.generationStartedAt || book.status !== "processing") {
    return book
  }

  const start = new Date(book.generationStartedAt).getTime()
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - start) / 1000))
  const total = book.chaptersList.length
  const completedCount = Math.min(total, Math.floor(elapsedSeconds / CHAPTER_SECONDS))
  const processingIndex = completedCount < total ? completedCount : -1
  const chapterDurationSeconds = 480

  const chapters = book.chaptersList.map((chapter, index) => {
    let status: ChapterStatus = "pending"
    let duration: string | null = null

    if (index < completedCount) {
      status = "completed"
      duration = getDurationLabel(chapterDurationSeconds + index * 17)
    } else if (index === processingIndex) {
      status = "processing"
    }

    return {
      ...chapter,
      status,
      duration,
    }
  })

  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const status: BookStatus = completedCount >= total ? "completed" : "processing"

  return {
    ...book,
    chaptersList: chapters,
    progress: status === "completed" ? 100 : progress,
    status,
    updatedAt: new Date().toISOString(),
  }
}

async function persistReconciled(books: BookRecord[]): Promise<BookRecord[]> {
  let changed = false
  const reconciled = books.map((book) => {
    const next = reconcileProgress(book)
    if (next !== book) changed = true
    return next
  })

  if (changed) {
    await storeAdapter.saveBooks(reconciled)
  }

  return reconciled
}

async function ensureUploadsDir() {
  await mkdir(UPLOADS_DIR, { recursive: true })
}

function getChapterStats(chapters: Chapter[]) {
  return chapters.reduce(
    (acc, chapter) => {
      acc[chapter.status] += 1
      return acc
    },
    { completed: 0, processing: 0, pending: 0, failed: 0 }
  )
}

function makeStatusSnapshot(book: BookRecord): BookStatusSnapshot {
  const stats = getChapterStats(book.chaptersList)

  return {
    bookId: book.id,
    status: book.status,
    progress: book.progress,
    chapterStats: {
      total: book.chaptersList.length,
      completed: stats.completed,
      processing: stats.processing,
      pending: stats.pending,
      failed: stats.failed,
    },
    activeChapter: book.chaptersList.find((chapter) => chapter.status === "processing") ?? null,
    startedAt: book.generationStartedAt,
    updatedAt: book.updatedAt,
    parserMetadata:
      book.parserStrategy || book.parserSourceStats
        ? {
            strategy: book.parserStrategy,
            sourceStats: book.parserSourceStats,
          }
        : undefined,
  }
}

export async function listBooks(): Promise<BookListItem[]> {
  const books = await persistReconciled(await storeAdapter.listBooks())

  return books
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .map(mapToListItem)
}

export async function getBook(bookId: string): Promise<BookDetails | null> {
  const current = await storeAdapter.getBook(bookId)
  if (!current) return null

  const updated = reconcileProgress(current)
  if (updated !== current) {
    await storeAdapter.saveBook(updated)
  }

  return mapToDetails(updated)
}

export async function deleteBook(bookId: string): Promise<boolean> {
  const existing = await storeAdapter.getBook(bookId)
  if (!existing) return false

  const deleted = await storeAdapter.deleteBook(bookId)
  if (!deleted) return false

  if (existing.storedFileName) {
    const uploadPath = path.join(UPLOADS_DIR, existing.storedFileName)
    await rm(uploadPath, { force: true }).catch(() => {})
  }

  return true
}

export async function getBookRecord(bookId: string): Promise<BookRecord | null> {
  const current = await storeAdapter.getBook(bookId)
  if (!current) return null

  const updated = reconcileProgress(current)
  if (updated !== current) {
    await storeAdapter.saveBook(updated)
  }

  return updated
}

export async function createBook(input: {
  title: string
  author: string
  language: string
  file: File
  voiceId: string
  voiceName: string
}): Promise<BookDetails> {
  const existingBooks = await storeAdapter.listBooks()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const ext = path.extname(input.file.name) || ".bin"
  const storedFileName = `${id}${ext}`
  const filePath = path.join(UPLOADS_DIR, storedFileName)
  await ensureUploadsDir()
  const buffer = Buffer.from(await input.file.arrayBuffer())
  await writeFile(filePath, buffer)

  const textContent = ext.toLowerCase() === ".txt" ? buffer.toString("utf8") : ""
  const parseResult = buildChapterSeeds(input.file.name, textContent)
  const chaptersList: Chapter[] = parseResult.chapters.map((seed, index) => ({
    id: `${id}-chapter-${index + 1}`,
    name: seed.name || `Chapter ${index + 1}`,
    status: index === 0 ? "processing" : "pending",
    duration: null,
  }))

  const book: BookRecord = {
    id,
    title: input.title.trim(),
    author: input.author.trim(),
    language: input.language.trim(),
    fileName: input.file.name,
    storedFileName,
    fileType: input.file.type || "application/octet-stream",
    fileSize: input.file.size,
    status: "processing",
    progress: 0,
    coverColor: COVER_COLORS[existingBooks.length % COVER_COLORS.length],
    chaptersList,
    parserStrategy: parseResult.strategy,
    parserSourceStats: parseResult.sourceStats,
    voiceId: input.voiceId,
    voiceName: input.voiceName,
    generationStartedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  await storeAdapter.saveBook(book)
  return mapToDetails(book)
}

export async function startGeneration(input: {
  bookId: string
  voiceId: string
  voiceName: string
}): Promise<BookDetails | null> {
  const current = await storeAdapter.getBook(input.bookId)
  if (!current) return null

  const resetChapters = current.chaptersList.map((chapter, chapterIndex) => ({
    ...chapter,
    status: chapterIndex === 0 ? "processing" : ("pending" as ChapterStatus),
    duration: null,
  }))

  const updated: BookRecord = {
    ...current,
    voiceId: input.voiceId,
    voiceName: input.voiceName,
    generationStartedAt: new Date().toISOString(),
    status: "processing",
    progress: 0,
    chaptersList: resetChapters,
    updatedAt: new Date().toISOString(),
  }

  await storeAdapter.saveBook(updated)
  return mapToDetails(updated)
}

export async function updateChapterAudioUrl(input: {
  bookId: string
  chapterId: string
  audioUrl: string
  duration: number
}): Promise<boolean> {
  const book = await storeAdapter.getBook(input.bookId)
  if (!book) return false
  const chapterIndex = book.chaptersList.findIndex((ch) => ch.id === input.chapterId)
  if (chapterIndex === -1) return false

  // Convert duration (seconds) to MM:SS format
  const minutes = Math.floor(input.duration / 60)
  const seconds = Math.round(input.duration % 60)
  const durationString = `${minutes}:${seconds.toString().padStart(2, "0")}`

  // Update the chapter with audio metadata
  book.chaptersList[chapterIndex] = {
    ...book.chaptersList[chapterIndex],
    audioUrl: input.audioUrl,
    duration: durationString,
    status: "completed" as ChapterStatus,
  }

  // Update book status - mark as completed if all chapters are done
  const allCompleted = book.chaptersList.every((ch) => ch.status === "completed")
  if (allCompleted) {
    book.status = "completed"
    book.progress = 100
  }

  book.updatedAt = new Date().toISOString()
  await storeAdapter.saveBook(book)
  return true
}
