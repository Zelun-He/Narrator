import { NextResponse } from "next/server"
import { createBook, listBooks } from "@/lib/server/audiobook-store"
import { VOICE_OPTIONS } from "@/lib/voice-options"

export const runtime = "nodejs"

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"])

function hasValidExtension(fileName: string): boolean {
  const normalized = fileName.toLowerCase()
  return Array.from(ALLOWED_EXTENSIONS).some((ext) => normalized.endsWith(ext))
}

export async function GET() {
  const books = await listBooks()
  return NextResponse.json({ books })
}

export async function POST(request: Request) {
  const formData = await request.formData()
  const title = String(formData.get("title") ?? "").trim()
  const author = String(formData.get("author") ?? "").trim()
  const language = String(formData.get("language") ?? "").trim()
  const voiceId = String(formData.get("voiceId") ?? "").trim()
  const file = formData.get("file")

  if (!title || !author || !language || !voiceId) {
    return NextResponse.json(
      { error: "Book title, author name, language, and narrator voice are required." },
      { status: 400 }
    )
  }

  const selectedVoice = VOICE_OPTIONS.find((voice) => voice.id === voiceId)
  if (!selectedVoice) {
    return NextResponse.json({ error: "Selected narrator voice is invalid." }, { status: 400 })
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A manuscript file is required." }, { status: 400 })
  }

  if (!hasValidExtension(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload PDF, DOCX, or TXT." },
      { status: 400 }
    )
  }

  const book = await createBook({
    title,
    author,
    language,
    file,
    voiceId: selectedVoice.id,
    voiceName: selectedVoice.name,
  })
  return NextResponse.json({ book }, { status: 201 })
}
