import { NextResponse } from "next/server"
import { listBookChapters } from "@/lib/server/audiobook-store"
import type { ChapterStatus } from "@/lib/audiobook-types"

export const runtime = "nodejs"

const ALLOWED_STATUSES = new Set<ChapterStatus>(["pending", "processing", "completed", "failed"])

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const chapters = await listBookChapters(id)

  if (!chapters) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const statusFilter = url.searchParams.get("status")

  if (!statusFilter) {
    return NextResponse.json({ chapters })
  }

  if (!ALLOWED_STATUSES.has(statusFilter as ChapterStatus)) {
    return NextResponse.json(
      { error: "Unsupported status filter. Use pending, processing, completed, or failed." },
      { status: 400 }
    )
  }

  return NextResponse.json({
    chapters: chapters.filter((chapter) => chapter.status === statusFilter),
  })
}
