import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export const runtime = 'nodejs';

/**
 * POST /api/audio/cleanup
 * Cleans up audio files older than specified age (in milliseconds)
 *
 * Request Body (optional):
 * {
 *   "maxAgeMs": 86400000 // 24 hours, defaults to 7 days
 * }
 */
export async function POST(req: NextRequest) {
  try {
    let maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days default

    try {
      const body = await req.json();
      if (body.maxAgeMs && typeof body.maxAgeMs === 'number') {
        maxAgeMs = body.maxAgeMs;
      }
    } catch {
      // No body provided, use default
    }

    const deletedCount = ttsService.cleanupOldAudioFiles(maxAgeMs);

    return NextResponse.json(
      {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} old audio file(s)`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cleaning up audio files:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
