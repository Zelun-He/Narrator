import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface PiperConfig {
  piperPath: string;
  modelPath: string;
  speakerIndex?: number;
  speakingRate?: number;
}

export interface TtsGenerationOptions {
  text: string;
  voice?: string;
  speakerIndex?: number;
  speakingRate?: number;
  outputPath?: string; // optional: store in /public/audio, defaults to /tmp
}

export interface TtsResult {
  success: boolean;
  audioPath?: string;
  audioUrl?: string;
  audioBuffer?: Buffer;
  duration?: number;
  error?: string;
  timestamp: number;
}

/**
 * Validates text input for TTS generation
 */
function validateInput(text: string, maxLength: number = 5000): void {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required and must be a string");
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new Error("Text cannot be empty or whitespace only");
  }

  if (trimmed.length > maxLength) {
    throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
  }
}

/**
 * Spawns Piper CLI process and handles audio generation
 */
function spawnPiperProcess(
  piperPath: string,
  modelPath: string,
  text: string,
  outputFile: string,
  speakerIndex?: number,
  speakingRate?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["--model", modelPath, "--output_file", outputFile];

    if (speakerIndex !== undefined) {
      args.push("--speaker", speakerIndex.toString());
    }

    if (speakingRate !== undefined) {
      args.push("--speaking_rate", speakingRate.toString());
    }

    const piper = spawn(piperPath, args);

    let errorOutput = "";

    piper.stdin.write(text);
    piper.stdin.end();

    piper.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    piper.on("error", (err) => {
      reject(new Error(`Failed to spawn Piper process: ${err.message}`));
    });

    piper.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Piper process exited with code ${code}: ${errorOutput || "Unknown error"}`
          )
        );
      } else if (!fs.existsSync(outputFile)) {
        reject(new Error("Output file was not created by Piper"));
      } else {
        resolve();
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      piper.kill();
      reject(new Error("Piper process timeout after 30 seconds"));
    }, 30000);
  });
}

/**
 * Gets audio duration in seconds (basic WAV header parsing)
 */
function getAudioDuration(filePath: string): number {
  try {
    const buffer = fs.readFileSync(filePath);

    // WAV file structure: bytes 24-27 contain sample rate (little-endian)
    // bytes 40-43 contain subchunk2 size (data chunk size in bytes)
    if (buffer.length < 44 || buffer.toString("utf8", 0, 4) !== "RIFF") {
      return 0;
    }

    const sampleRate = buffer.readUInt32LE(24);
    const dataSize = buffer.readUInt32LE(40);
    const bytesPerSample = 2; // 16-bit audio

    const totalSamples = dataSize / bytesPerSample;
    const duration = totalSamples / sampleRate;

    return duration;
  } catch {
    return 0;
  }
}

/**
 * Main TTS generation function
 * Accepts dynamic text and generates audio file
 */
export async function generateTts(
  options: TtsGenerationOptions,
  config: PiperConfig
): Promise<TtsResult> {
  const startTime = Date.now();
  let outputFile: string | null = null;

  try {
    // Validate input
    validateInput(options.text);

    // Determine output path
    if (options.outputPath) {
      const outputDir = path.dirname(options.outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      outputFile = options.outputPath;
    } else {
      outputFile = path.join(os.tmpdir(), `piper-${Date.now()}-${Math.random().toString(36).substring(7)}.wav`);
    }

    // Spawn Piper process
    await spawnPiperProcess(
      config.piperPath,
      config.modelPath,
      options.text,
      outputFile,
      options.speakerIndex ?? config.speakerIndex,
      options.speakingRate ?? config.speakingRate
    );

    // Read generated audio file
    const audioBuffer = fs.readFileSync(outputFile);
    const duration = getAudioDuration(outputFile);

    // If outputPath was provided (persistence mode), return URL instead of buffer
    const result: TtsResult = {
      success: true,
      duration,
      timestamp: startTime,
    };

    if (options.outputPath) {
      result.audioPath = outputFile;
      result.audioUrl = `/audio/${path.basename(outputFile)}`;
    } else {
      result.audioBuffer = audioBuffer;
      // Clean up temp file
      fs.unlinkSync(outputFile);
      outputFile = null;
    }

    return result;
  } catch (error) {
    // Clean up temp file on error
    if (outputFile && fs.existsSync(outputFile)) {
      try {
        fs.unlinkSync(outputFile);
      } catch {
        // Ignore cleanup errors
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
      timestamp: startTime,
    };
  }
}

/**
 * Gets default Piper configuration based on OS and project structure
 */
export function getPiperConfig(): PiperConfig {
  const basePath = path.join(process.cwd(), "tools", "piper");

  // Detect executable based on OS
  let piperExecutable = "piper";
  if (process.platform === "win32") {
    piperExecutable = "piper.exe";
  }

  const piperPath = path.join(basePath, piperExecutable);
  const modelPath = path.join(basePath, "en_US-lessac-medium.onnx");

  // Verify paths exist
  if (!fs.existsSync(piperPath)) {
    throw new Error(`Piper executable not found at ${piperPath}`);
  }

  if (!fs.existsSync(modelPath)) {
    throw new Error(`Piper model not found at ${modelPath}`);
  }

  return {
    piperPath,
    modelPath,
    speakerIndex: 0,
    speakingRate: 1.0,
  };
}

/**
 * Cleans up audio files older than specified age (in milliseconds)
 * Useful for managing temp/public audio directory
 */
export function cleanupAudioFiles(
  directoryPath: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours default
): number {
  let deletedCount = 0;

  try {
    if (!fs.existsSync(directoryPath)) return 0;

    const files = fs.readdirSync(directoryPath);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(directoryPath, file);
      const stat = fs.statSync(filePath);

      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
  } catch (error) {
    console.error("Error cleaning up audio files:", error);
  }

  return deletedCount;
}
