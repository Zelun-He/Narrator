import { NextRequest, NextResponse } from "next/server";
import { generateTts, getPiperConfig, TtsGenerationOptions } from "@/lib/server/piper";
import path from "path";

export const runtime = "nodejs";

/**
 * POST /api/tts
 * Generates speech audio from text using Piper TTS
 *
 * Request Body:
 * {
 *   "text": "Hello world", // required
 *   "voice": "en_US-lessac-medium", // optional
 *   "speakerIndex": 0, // optional
 *   "speakingRate": 1.0, // optional
 *   "persist": false // optional: if true, saves to /public/audio instead of temp
 * }
 *
 * Response (success):
 * {
 *   "success": true,
 *   "audioUrl": "/audio/piper-1234567890.wav" // if persist=true
 *   "audio": "base64-encoded-audio", // if persist=false (included in Content-Disposition)
 *   "duration": 2.5,
 *   "timestamp": 1234567890
 * }
 *
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "timestamp": 1234567890
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await req.json();
    const {
      text,
      voice,
      speakerIndex,
      speakingRate,
      persist = false,
    } = body;

    // Validate required fields
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Missing or invalid 'text' field. Text must be a non-empty string.",
          timestamp: startTime,
        },
        { status: 400 }
      );
    }

    // Get Piper configuration
    let config;
    try {
      config = getPiperConfig();
    } catch (err) {
      console.error("Piper config error:", err);
      return NextResponse.json(
        {
          success: false,
          error: "Piper TTS service is not properly configured. Check server logs.",
          timestamp: startTime,
        },
        { status: 503 }
      );
    }

    // Prepare TTS options
    const ttsOptions: TtsGenerationOptions = {
      text: text.trim(),
      voice,
      speakerIndex,
      speakingRate,
    };

    // If persist mode, set output path to /public/audio
    if (persist) {
      const audioFileName = `piper-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`;
      const outputPath = path.join(process.cwd(), "public", "audio", audioFileName);
      ttsOptions.outputPath = outputPath;
    }

    // Generate TTS audio
    const result = await generateTts(ttsOptions, config);

    // Handle generation failure
    if (!result.success) {
      console.error("TTS generation failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to generate audio",
          timestamp: startTime,
        },
        { status: 500 }
      );
    }

    // Return based on persistence mode
    if (persist && result.audioUrl) {
      // Persistent mode: return URL
      return NextResponse.json(
        {
          success: true,
          audioUrl: result.audioUrl,
          duration: result.duration,
          timestamp: result.timestamp,
        },
        { status: 200 }
      );
    } else if (result.audioBuffer) {
      // Streaming mode: return binary audio directly
      return new Response(new Uint8Array(result.audioBuffer), {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": result.audioBuffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Audio generation completed but no audio data available",
        timestamp: startTime,
      },
      { status: 500 }
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("TTS API error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: startTime,
      },
      { status: 500 }
    );
  }
}