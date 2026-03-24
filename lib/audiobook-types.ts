export type BookStatus = "processing" | "completed" | "failed"

export type ChapterStatus = "completed" | "processing" | "pending" | "failed"

export interface Chapter {
  id: string
  name: string
  status: ChapterStatus
  duration: string | null
}

export interface BookListItem {
  id: string
  title: string
  author: string
  language: string
  status: BookStatus
  chapters: number
  progress: number
  coverColor: string
  createdAt: string
  voiceName: string | null
}

export interface BookDetails extends BookListItem {
  chaptersList: Chapter[]
}
