import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import type { BookDetails, BookListItem, BookStatus, Chapter, ChapterStatus } from "@/lib/audiobook-types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "books.json")
const UPLOADS_DIR = path.join(DATA_DIR, "uploads")
const DEFAULT_CHAPTER_COUNT = 10
const CHAPTER_SECONDS = 8

const COVER_COLORS = ["#FF6B6B", "#4ECDC4", "#F59E0B", "#A78BFA", "#0EA5E9", "#FF9F43"]

interface BookRecord {
  id: string
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

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(UPLOADS_DIR, { recursive: true })

  try {
    await readFile(STORE_FILE, "utf8")
  } catch {
    const initial: StoreData = { books: [] }
    await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8")
  }
}

async function readStore(): Promise<StoreData> {
  await ensureStore()
  const raw = await readFile(STORE_FILE, "utf8")
  try {
    const parsed = JSON.parse(raw) as StoreData
    return parsed
  } catch {
    return { books: [] }
  }
}

async function writeStore(data: StoreData) {
  await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8")
}

function getDurationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const sec = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${sec}`
}

function estimateChapterCount(fileName: string, textContent: string): number {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === ".txt" && textContent.trim().length > 0) {
    const chapterMatches = textContent.match(/^chapter[\s0-9:-]/gim)
    if (chapterMatches && chapterMatches.length > 1) {
      return Math.min(50, chapterMatches.length)
    }
  }

  return DEFAULT_CHAPTER_COUNT
}

function chapterName(index: number): string {
  return `Chapter ${index + 1}`
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

export async function listBooks(): Promise<BookListItem[]> {
  const store = await readStore()
  let changed = false

  const books = store.books.map((book) => {
    const updated = reconcileProgress(book)
    if (updated !== book) changed = true
    return updated
  })

  if (changed) {
    await writeStore({ books })
  }

  return books
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .map(mapToListItem)
}

export async function getBook(bookId: string): Promise<BookDetails | null> {
  const store = await readStore()
  const index = store.books.findIndex((book) => book.id === bookId)
  if (index === -1) return null

  const updated = reconcileProgress(store.books[index])
  if (updated !== store.books[index]) {
    store.books[index] = updated
    await writeStore(store)
  }

  return mapToDetails(updated)
}

export async function getBookRecord(bookId: string): Promise<BookRecord | null> {
  const store = await readStore()
  const index = store.books.findIndex((book) => book.id === bookId)
  if (index === -1) return null

  const updated = reconcileProgress(store.books[index])
  if (updated !== store.books[index]) {
    store.books[index] = updated
    await writeStore(store)
  }

  return updated
}

export async function createBook(input: {
  title: string
  author: string
  language: string
  file: File
}): Promise<BookDetails> {
  const store = await readStore()
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const ext = path.extname(input.file.name) || ".bin"
  const fileName = `${id}${ext}`
  const filePath = path.join(UPLOADS_DIR, fileName)
  const buffer = Buffer.from(await input.file.arrayBuffer())
  await writeFile(filePath, buffer)

  const textContent = ext.toLowerCase() === ".txt" ? buffer.toString("utf8") : ""
  const chapterCount = estimateChapterCount(input.file.name, textContent)
  const chaptersList: Chapter[] = Array.from({ length: chapterCount }, (_, index) => ({
    id: `${id}-chapter-${index + 1}`,
    name: chapterName(index),
    status: index === 0 ? "processing" : "pending",
    duration: null,
  }))

  const book: BookRecord = {
    id,
    title: input.title.trim(),
    author: input.author.trim(),
    language: input.language.trim(),
    fileName: fileName,
    fileType: input.file.type || "application/octet-stream",
    fileSize: input.file.size,
    status: "processing",
    progress: 0,
    coverColor: COVER_COLORS[store.books.length % COVER_COLORS.length],
    chaptersList,
    voiceId: null,
    voiceName: null,
    generationStartedAt: null,
    createdAt: now,
    updatedAt: now,
  }

  store.books.push(book)
  await writeStore(store)
  return mapToDetails(book)
}

export async function startGeneration(input: {
  bookId: string
  voiceId: string
  voiceName: string
}): Promise<BookDetails | null> {
  const store = await readStore()
  const index = store.books.findIndex((book) => book.id === input.bookId)
  if (index === -1) return null

  const current = store.books[index]
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

  store.books[index] = updated
  await writeStore(store)
  return mapToDetails(updated)
}

export async function updateChapterAudioUrl(input: {
  bookId: string
  chapterId: string
  audioUrl: string
  duration: number
}): Promise<boolean> {
  const store = await readStore()
  const bookIndex = store.books.findIndex((book) => book.id === input.bookId)
  if (bookIndex === -1) return false

  const book = store.books[bookIndex]
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
  store.books[bookIndex] = book
  await writeStore(store)
  return true
}
