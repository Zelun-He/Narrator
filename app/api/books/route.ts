import { NextResponse } from "next/server"
import { createBook, listBooks } from "@/lib/server/audiobook-store"

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
  const file = formData.get("file")

  if (!title || !author || !language) {
    return NextResponse.json(
      { error: "Book title, author name, and language are required." },
      { status: 400 }
    )
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

  const book = await createBook({ title, author, language, file })
  return NextResponse.json({ book }, { status: 201 })
}
