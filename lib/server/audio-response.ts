import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { AUDIO_DIR } from "./runtime";
import { ApiError } from "./errors";
export function safeAudioPath(file: string) {
  const relative = path.relative(AUDIO_DIR, path.resolve(file));
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new ApiError(404, "Audio not found.");
  return file;
}
export function attachment(name: string, extension: string) {
  const base =
    name.replace(/[^a-zA-Z0-9 _-]/g, "_").slice(0, 100) || "audiobook";
  return `attachment; filename="${base}.${extension}"`;
}
export async function audioResponse(
  request: Request,
  file: string,
  type: string,
  downloadName?: string,
) {
  safeAudioPath(file);
  const info = await stat(file).catch(() => {
    throw new ApiError(
      404,
      "This audio file is unavailable. Please contact the server administrator.",
    );
  });
  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Content-Length": String(info.size),
    "Cache-Control": "private, no-store",
  });
  if (downloadName) headers.set("Content-Disposition", downloadName);
  let start = 0,
    end = info.size - 1,
    status = 200;
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${info.size}` },
      });
    if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
    else {
      start = Number(match[1]);
      if (match[2]) end = Math.min(end, Number(match[2]));
    }
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= info.size
    )
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${info.size}` },
      });
    status = 206;
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
    headers.set("Content-Length", String(end - start + 1));
  }
  if (request.method === "HEAD") return new Response(null, { status, headers });
  const stream = createReadStream(file, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status,
    headers,
  });
}
