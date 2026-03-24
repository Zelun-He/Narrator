import { NextResponse } from "next/server"
import { startGeneration } from "@/lib/server/audiobook-store"

export const runtime = "nodejs"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => null)
  const voiceId = String(body?.voiceId ?? "").trim()
  const voiceName = String(body?.voiceName ?? "").trim()
  const { id } = await params

  if (!voiceId || !voiceName) {
    return NextResponse.json(
      { error: "A voice selection is required to generate the audiobook." },
      { status: 400 }
    )
  }

  const book = await startGeneration({ bookId: id, voiceId, voiceName })
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  return NextResponse.json({ book })
}
