import { NextResponse } from "next/server"
import { getBook } from "@/lib/server/audiobook-store"

export const runtime = "nodejs"

function getFormatMeta(format: string) {
  switch (format) {
    case "mp3":
      return {
        contentType: "audio/mpeg",
        extension: "mp3",
        label: "MP3 bundle placeholder",
      }
    case "m4b":
      return {
        contentType: "audio/mp4",
        extension: "m4b",
        label: "M4B audiobook placeholder",
      }
    case "zip":
      return {
        contentType: "application/zip",
        extension: "zip",
        label: "ZIP chapters placeholder",
      }
    default:
      return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const book = await getBook(id)
  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const format = url.searchParams.get("format")?.toLowerCase() ?? ""
  const meta = getFormatMeta(format)

  if (!meta) {
    return NextResponse.json({ error: "Unsupported format." }, { status: 400 })
  }

  const payload = [
    `Narrator export`,
    `Book: ${book.title}`,
    `Author: ${book.author}`,
    `Voice: ${book.voiceName ?? "Not selected"}`,
    `Format: ${format.toUpperCase()}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "This is a placeholder file from the demo backend flow.",
  ].join("\n")

  const filename = `${book.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.${meta.extension}`
  const data = new TextEncoder().encode(payload)

  return new NextResponse(data, {
    headers: {
      "Content-Type": meta.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
