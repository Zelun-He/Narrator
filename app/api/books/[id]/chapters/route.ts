import { NextResponse } from "next/server"
import { listBookChapters } from "@/lib/server/audiobook-store"
import type { ChapterStatus } from "@/lib/audiobook-types"

export const runtime = "nodejs"

const ALLOWED_STATUSES = new Set<ChapterStatus>(["pending", "processing", "completed", "failed"])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const generatedAt = new Date().toISOString()
  const { id } = await params
  const chapterSnapshot = await listBookChapters(id)

  if (!chapterSnapshot) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get("status")

  if (!statusFilter) {
    return NextResponse.json({
      chapters: chapterSnapshot.chapters,
      apiVersion: "2026-03-25",
      generatedAt,
      bookId: chapterSnapshot.bookId,
      updatedAt: chapterSnapshot.updatedAt,
      revision: Date.parse(chapterSnapshot.updatedAt),
    })
  }

  if (!ALLOWED_STATUSES.has(statusFilter as ChapterStatus)) {
    return NextResponse.json(
      { error: "Unsupported status filter. Use pending, processing, completed, or failed." },
      { status: 400 }
    )
  }

  return NextResponse.json({
    chapters: chapterSnapshot.chapters.filter((chapter) => chapter.status === statusFilter),
    apiVersion: "2026-03-25",
    generatedAt,
    bookId: chapterSnapshot.bookId,
    updatedAt: chapterSnapshot.updatedAt,
    revision: Date.parse(chapterSnapshot.updatedAt),
  })
}
