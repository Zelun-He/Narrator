import { Readable } from "node:stream";
import { ZipFile } from "yazl";
import { ownedBook, chapterRows } from "@/lib/server/audiobook-store";
import { withUser, ApiError } from "@/lib/server/api";
import {
  audioResponse,
  attachment,
  safeAudioPath,
} from "@/lib/server/audio-response";
import { stat } from "node:fs/promises";
export const runtime = "nodejs";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withUser(request, async (user) => {
    const book = ownedBook(user.id, id),
      format = new URL(request.url).searchParams.get("format") || "mp3";
    if (book.status !== "completed" || !book.mp3_path)
      throw new ApiError(
        409,
        "Your audiobook download will be ready when narration finishes.",
      );
    if (format === "mp3")
      return audioResponse(
        request,
        book.mp3_path,
        "audio/mpeg",
        attachment(book.title, "mp3"),
      );
    if (format !== "zip")
      throw new ApiError(400, "Choose MP3 or ZIP chapter audio.");
    const chapters = chapterRows(id);
    for (const chapter of chapters) {
      if (!chapter.audio_path)
        throw new ApiError(409, "Chapter audio is incomplete.");
      await stat(safeAudioPath(chapter.audio_path)).catch(() => {
        throw new ApiError(404, "A chapter file is unavailable.");
      });
    }
    const zip = new ZipFile();
    const output = zip.outputStream as Readable;
    zip.on("error", (error) => output.destroy(error));
    for (const chapter of chapters)
      zip.addFile(
        chapter.audio_path!,
        `${String(chapter.chapter_index + 1).padStart(3, "0")}-${chapter.name.replace(/[^a-zA-Z0-9 _-]/g, "_").slice(0, 80)}.wav`,
        { compress: false },
      );
    zip.end();
    request.signal.addEventListener("abort", () => output.destroy(), {
      once: true,
    });
    return new Response(Readable.toWeb(output) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachment(book.title, "zip"),
      },
    });
  });
}
