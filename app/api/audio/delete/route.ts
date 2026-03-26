import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export const runtime = 'nodejs';

/**
 * DELETE /api/audio/delete
 * Deletes a specific audio file
 *
 * Request Body:
 * {
 *   "filename": "piper-1709876532891-abc123.wav"
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid filename',
        },
        { status: 400 }
      );
    }

    const deleted = ttsService.deleteAudioFile(filename);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'File not found or could not be deleted',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Deleted ${filename}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting audio file:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
