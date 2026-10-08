import { NextResponse } from "next/server";
import { startGeneration, ownedBook } from "@/lib/server/audiobook-store";
import { withUser, consumeQuota } from "@/lib/server/api";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withUser(request, (user) => {
    const book = ownedBook(user.id, id);
    if (book.status === "failed")
      consumeQuota(`retry:${user.id}`, 10, 60 * 60 * 1000);
    return NextResponse.json({ book: startGeneration(user.id, id) });
  });
}
