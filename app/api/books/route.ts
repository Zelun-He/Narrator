import { NextResponse } from "next/server";
import { createBook, listBooks } from "@/lib/server/audiobook-store";
import { withUser, ApiError, consumeQuota } from "@/lib/server/api";
import { VOICE_OPTIONS } from "@/lib/voice-options";
import { MAX_FILE_BYTES } from "@/lib/server/runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return withUser(request, (user) =>
    NextResponse.json({ books: listBooks(user.id) }),
  );
}
async function boundedForm(request: Request) {
  const limit = MAX_FILE_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length") || 0) > limit)
    throw new ApiError(413, "Please upload a manuscript smaller than 10 MB.");
  if (
    !request.headers.get("content-type")?.startsWith("multipart/form-data") ||
    !request.body
  )
    throw new ApiError(
      400,
      "Please upload a manuscript using the upload form.",
    );
  const chunks: Uint8Array[] = [];
  const reader = request.body.getReader();
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.length;
      if (size > limit) {
        await reader.cancel();
        throw new ApiError(
          413,
          "Please upload a manuscript smaller than 10 MB.",
        );
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type")! },
      body: Buffer.concat(chunks),
    }).formData();
  } catch {
    throw new ApiError(
      400,
      "The upload was incomplete. Please select your manuscript again.",
    );
  }
}
export async function POST(request: Request) {
  return withUser(request, async (user) => {
    consumeQuota(`upload:${user.id}`, 10, 60 * 60 * 1000);
    const form = await boundedForm(request);
    const title = String(form.get("title") || "").trim(),
      author = String(form.get("author") || "").trim(),
      language = String(form.get("language") || ""),
      voiceId = String(form.get("voiceId") || "");
    if (!title || !author || title.length > 200 || author.length > 200)
      throw new ApiError(
        400,
        "A book title and author name are required (up to 200 characters each).",
      );
    if (language !== "english")
      throw new ApiError(400, "English manuscripts are currently supported.");
    const voice = VOICE_OPTIONS.find((v) => v.id === voiceId);
    if (!voice)
      throw new ApiError(400, "Please select the available narrator.");
    const file = form.get("file");
    if (!(file instanceof File) || !file.size)
      throw new ApiError(400, "Select a manuscript with readable text.");
    if (file.size > MAX_FILE_BYTES)
      throw new ApiError(413, "Please upload a manuscript smaller than 10 MB.");
    if (!/\.(txt|docx|pdf)$/i.test(file.name))
      throw new ApiError(400, "Please upload TXT, DOCX, or a text-based PDF.");
    const requestKey =
      request.headers.get("idempotency-key") || crypto.randomUUID();
    if (!/^[\w-]{8,100}$/.test(requestKey))
      throw new ApiError(400, "Invalid upload request key.");
    const book = await createBook({
      ownerId: user.id,
      title,
      author,
      language,
      file,
      voiceId,
      voiceName: voice.name,
      requestKey,
    });
    return NextResponse.json({ book }, { status: 201 });
  });
}
