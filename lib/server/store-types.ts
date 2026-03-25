import type { BookStatus, Chapter } from "@/lib/audiobook-types"

export interface BookRecord {
  id: string
  title: string
  author: string
  language: string
  fileName: string
  storedFileName: string
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
}

export interface StoreData {
  books: BookRecord[]
}
