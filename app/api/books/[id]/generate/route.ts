import { NextResponse } from "next/server"
import { startGeneration, getBookRecord } from "@/lib/server/audiobook-store"
import { extractChaptersFromManuscript } from "@/lib/server/manuscript-processor"
import { generateAudioForBook } from "@/lib/server/audio-generation-service"
import path from "path"

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

  try {
    // Get book record first to access fileName
    const bookRecord = await getBookRecord(id)
    if (!bookRecord) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 })
    }

    // Extract manuscript path from book filename
    const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads")
    const uploadPath = path.join(UPLOADS_DIR, bookRecord.fileName)

    // Determine file type from fileName
    const ext = path.extname(bookRecord.fileName).toLowerCase().slice(1) as "txt" | "pdf" | "docx"

    // Start generation (updates status to processing)
    const book = await startGeneration({ bookId: id, voiceId, voiceName })
    if (!book) {
      return NextResponse.json({ error: "Book not found." }, { status: 404 })
    }

    // Extract chapters from manuscript
    let extractedChapters
    try {
      extractedChapters = await extractChaptersFromManuscript(uploadPath, ext)
    } catch (error) {
      return NextResponse.json(
        {
          error: `Failed to extract chapters from manuscript: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 }
      )
    }

    // Update chapters with extracted content
    const updatedChapters = extractedChapters.map((extracted, index) => ({
      id: `${id}-chapter-${index + 1}`,
      name: extracted.title || `Chapter ${index + 1}`,
      textContent: extracted.text,
      status: "pending" as const,
      duration: null,
      audioUrl: undefined,
      audioSize: undefined,
      generationError: undefined,
    }))

    // Update book with extracted chapters
    const updatedBook = {
      ...book,
      chaptersList: updatedChapters,
      uploadedFilePath: uploadPath,
    }

    // Start audio generation in background (fire and forget)
    generateAudioForBook({
      bookId: id,
      chapters: extractedChapters.map((ch, idx) => ({
        id: `${id}-chapter-${idx + 1}`,
        text: ch.text,
        index: idx,
      })),
      voiceId,
    }).catch((err) => {
      console.error(`Audio generation failed for book ${id}:`, err)
    })

    return NextResponse.json({ book: updatedBook })
  } catch (error) {
    console.error(`Generation error for book ${id}:`, error)
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    )
  }
}
