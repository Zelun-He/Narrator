import { NextResponse } from "next/server"
import { deleteBook, getBook } from "@/lib/server/audiobook-store"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const book = await getBook(id)

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  return NextResponse.json({ book })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleted = await deleteBook(id)

  if (!deleted) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
