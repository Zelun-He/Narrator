import { NextResponse } from "next/server";
import { getBookDetails } from "@/lib/server/audiobook-store";
import { withUser } from "@/lib/server/api";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withUser(request, (user) =>
    NextResponse.json({ chapters: getBookDetails(user.id, id).chaptersList }),
  );
}
