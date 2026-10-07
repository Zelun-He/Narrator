import { NextResponse } from "next/server";
import { deleteBook, getBookDetails } from "@/lib/server/audiobook-store";
import { withUser } from "@/lib/server/api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withUser(request, (user) =>
    NextResponse.json({ book: getBookDetails(user.id, id) }),
  );
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withUser(request, async (user) => {
    await deleteBook(user.id, id);
    return NextResponse.json({ ok: true });
  });
}
