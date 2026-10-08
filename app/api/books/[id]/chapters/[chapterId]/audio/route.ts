import { ownedBook, chapterRows } from "@/lib/server/audiobook-store";
import { withUser, ApiError } from "@/lib/server/api";
import { audioResponse, attachment } from "@/lib/server/audio-response";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  const { id, chapterId } = await params;
  return withUser(request, (user) => {
    const book = ownedBook(user.id, id),
      chapter = chapterRows(id).find((c) => c.id === chapterId);
    if (!chapter?.audio_path)
      throw new ApiError(404, "This chapter is not ready yet.");
    return audioResponse(
      request,
      chapter.audio_path,
      "audio/wav",
      new URL(request.url).searchParams.has("download")
        ? attachment(`${book.title}-${chapter.chapter_index + 1}`, "wav")
        : undefined,
    );
  });
}
export const HEAD = GET;
