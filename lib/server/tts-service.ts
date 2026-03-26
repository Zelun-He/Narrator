/**
 * TTS Service Layer
 * High-level abstraction for TTS operations
 * Can be used across the application for consistent audio generation
 */

import { generateTts, getPiperConfig, PiperConfig, TtsGenerationOptions, TtsResult } from './piper';
import fs from 'fs';
import path from 'path';

export interface AudioMetadata {
  filename: string;
  filepath: string;
  url: string;
  duration: number;
  createdAt: number;
  textHash?: string;
}

class TtsService {
  private config: PiperConfig;
  private audioDir: string;

  constructor() {
    this.config = getPiperConfig();
    this.audioDir = path.join(process.cwd(), 'public', 'audio');
    this.ensureAudioDirectory();
  }

  /**
   * Ensures audio directory exists
   */
  private ensureAudioDirectory(): void {
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
    }
  }

  /**
   * Generate and stream audio (no persistence)
   * Returns binary audio data
   */
  async generateStreamingAudio(text: string): Promise<Buffer> {
    const result = await generateTts(
      { text },
      this.config
    );

    if (!result.success) {
      throw new Error(`TTS generation failed: ${result.error}`);
    }

    if (!result.audioBuffer) {
      throw new Error('Audio buffer not available');
    }

    return result.audioBuffer;
  }

  /**
   * Generate and persist audio to /public/audio
   * Returns metadata for database/cache storage
   */
  async generatePersistentAudio(text: string): Promise<AudioMetadata> {
    const audioFileName = `piper-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`;
    const outputPath = path.join(this.audioDir, audioFileName);

    const result = await generateTts(
      {
        text,
        outputPath,
      },
      this.config
    );

    if (!result.success) {
      throw new Error(`TTS generation failed: ${result.error}`);
    }

    return {
      filename: audioFileName,
      filepath: outputPath,
      url: `/audio/${audioFileName}`,
      duration: result.duration || 0,
      createdAt: result.timestamp || Date.now(),
      textHash: this.hashText(text),
    };
  }

  /**
   * Check if audio already exists for text (cache lookup)
   */
  async getAudioMetadataByTextHash(textHash: string): Promise<AudioMetadata | null> {
    try {
      const files = fs.readdirSync(this.audioDir);

      for (const file of files) {
        const filePath = path.join(this.audioDir, file);
        const stat = fs.statSync(filePath);

        // Simple heuristic: check file name pattern
        // In production, you'd want to store metadata in a database
        // For now, we'll just indicate cache miss
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate audio with automatic caching
   * Returns URL if cached, generates new audio otherwise
   */
  async generateAudioWithCache(text: string): Promise<AudioMetadata> {
    const textHash = this.hashText(text);

    // Check cache (in production, query database)
    // const cached = await this.getAudioMetadataByTextHash(textHash);
    // if (cached) return cached;

    // Generate new audio
    return this.generatePersistentAudio(text);
  }

  /**
   * List all generated audio files
   */
  listAudioFiles(): AudioMetadata[] {
    try {
      if (!fs.existsSync(this.audioDir)) {
        return [];
      }

      const files = fs.readdirSync(this.audioDir);

      return files
        .filter((file) => file.endsWith('.wav'))
        .map((file) => {
          const filePath = path.join(this.audioDir, file);
          const stat = fs.statSync(filePath);

          return {
            filename: file,
            filepath: filePath,
            url: `/audio/${file}`,
            duration: 0, // Would need to parse WAV header for actual duration
            createdAt: stat.mtimeMs,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Error listing audio files:', error);
      return [];
    }
  }

  /**
   * Delete audio file by filename
   */
  deleteAudioFile(filename: string): boolean {
    try {
      // Security: prevent directory traversal
      if (filename.includes('..') || filename.includes('/')) {
        throw new Error('Invalid filename');
      }

      const filePath = path.join(this.audioDir, filename);

      if (!fs.existsSync(filePath)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return false;
    }
  }

  /**
   * Get file size in bytes
   */
  getAudioFileSize(filename: string): number {
    try {
      if (filename.includes('..') || filename.includes('/')) {
        throw new Error('Invalid filename');
      }

      const filePath = path.join(this.audioDir, filename);
      const stat = fs.statSync(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * Get total size of all audio files
   */
  getTotalAudioSize(): number {
    try {
      let total = 0;

      if (!fs.existsSync(this.audioDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.audioDir);

      files.forEach((file) => {
        const filePath = path.join(this.audioDir, file);
        const stat = fs.statSync(filePath);
        total += stat.size;
      });

      return total;
    } catch (error) {
      console.error('Error calculating total audio size:', error);
      return 0;
    }
  }

  /**
   * Clean up audio files older than specified age
   * Returns count of deleted files
   */
  cleanupOldAudioFiles(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    try {
      let deletedCount = 0;

      if (!fs.existsSync(this.audioDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.audioDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(this.audioDir, file);
        const stat = fs.statSync(filePath);

        if (now - stat.mtimeMs > maxAgeMs) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete ${file}:`, error);
          }
        }
      });

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old audio files:', error);
      return 0;
    }
  }

  /**
   * Hash text for cache keys
   */
  private hashText(text: string): string {
    // Simple hash function; in production use crypto.createHash('sha256')
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Export singleton instance
export const ttsService = new TtsService();
