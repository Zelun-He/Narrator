import { NextResponse } from "next/server"
import { ttsService } from "@/lib/server/tts-service"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const text = String(body?.text ?? "").trim()

    if (!text) {
      return NextResponse.json(
        { error: "Preview text is required" },
        { status: 400 }
      )
    }

    if (text.length > 200) {
      return NextResponse.json(
        { error: "Preview text must be 200 characters or less" },
        { status: 400 }
      )
    }

    // Generate audio for the preview
    const previewText =
      text || "Welcome to our audiobook narration. This is a preview of the voice you selected."

    const audioBuffer = await ttsService.generateStreamingAudio(previewText)

    // Return audio with appropriate headers
    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    console.error("Voice preview error:", error)
    return NextResponse.json(
      { error: "Failed to generate voice preview" },
      { status: 500 }
    )
  }
}
