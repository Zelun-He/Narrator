import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export const runtime = 'nodejs';

/**
 * GET /api/audio/list
 * Lists all generated audio files with metadata
 */
export async function GET(req: NextRequest) {
  try {
    const audioFiles = ttsService.listAudioFiles();
    const totalSize = ttsService.getTotalAudioSize();

    return NextResponse.json(
      {
        success: true,
        count: audioFiles.length,
        totalSize,
        files: audioFiles,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error listing audio files:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
