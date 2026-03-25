import { NextResponse } from "next/server"
import { getBookStatus } from "@/lib/server/audiobook-store"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const status = await getBookStatus(id)

  if (!status) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 })
  }

  return NextResponse.json({ status })
}
