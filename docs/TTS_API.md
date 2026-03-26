# Piper TTS API Documentation

## Overview

The TTS API integrates Piper CLI for dynamic speech synthesis. Users input text via the frontend, the backend generates audio using Piper TTS, and returns either a URL (persistent storage) or binary audio data (streaming).

## Architecture

```
Frontend (React)
    ↓ POST /api/tts
Backend (Next.js)
    ↓ lib/server/piper.ts
Piper CLI (subprocess)
    ↓ Generates .wav
Response (audio URL or buffer)
    ↓
Frontend Audio Player
```

## API Endpoint

### POST `/api/tts`

Generates speech audio from input text.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Hello, this is a test message.",
  "voice": "en_US-lessac-medium",
  "speakerIndex": 0,
  "speakingRate": 1.0,
  "persist": false
}
```

### Request Parameters

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `text` | string | ✅ | — | Text to synthesize. Max 5000 characters. Must not be empty or whitespace-only. |
| `voice` | string | ❌ | `en_US-lessac-medium` | Voice model identifier (for future multi-voice support) |
| `speakerIndex` | number | ❌ | 0 | Speaker/variant index for the model |
| `speakingRate` | number | ❌ | 1.0 | Speaking rate multiplier (0.5 = slower, 2.0 = faster) |
| `persist` | boolean | ❌ | false | If `true`, saves file to `/public/audio` and returns URL. If `false`, returns binary audio. |

### Response (Success with persist=false)

**Status:** 200 OK
**Content-Type:** `audio/wav`
**Body:** Binary WAV audio data

```
[Binary audio data - can be played directly in <audio> element]
```

### Response (Success with persist=true)

**Status:** 200 OK
**Content-Type:** `application/json`

```json
{
  "success": true,
  "audioUrl": "/audio/piper-1709876532891-abc123.wav",
  "duration": 2.5,
  "timestamp": 1709876532891
}
```

### Response (Error)

**Status:** 400, 500, or 503
**Content-Type:** `application/json`

```json
{
  "success": false,
  "error": "Text exceeds maximum length of 5000 characters",
  "timestamp": 1709876532891
}
```

## Error Codes

| Status | Error Type | Description |
|--------|-----------|-------------|
| 400 | Bad Request | Missing or invalid `text` field |
| 500 | Internal Server Error | Piper process failed, file system error, or unknown error |
| 503 | Service Unavailable | Piper CLI not installed or model files not found |

## Usage Examples

### Example 1: Streaming Mode (Direct Binary Response)

**Request:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!"}' \
  -o output.wav
```

**cURL with JSON response:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!", "persist": true}'
```

**Response:**
```json
{
  "success": true,
  "audioUrl": "/audio/piper-1709876532891-xyz789.wav",
  "duration": 1.2,
  "timestamp": 1709876532891
}
```

### Example 2: Frontend JavaScript (Streaming)

```typescript
async function generateSpeech(text: string): Promise<void> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'TTS generation failed');
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audioElement = document.getElementById('audio-player') as HTMLAudioElement;
    audioElement.src = audioUrl;
    audioElement.play();
  } catch (error) {
    console.error('Error generating speech:', error);
  }
}
```

### Example 3: Frontend React Hook (with Persistent Storage)

```typescript
import { useState } from 'react';

interface TtsResponse {
  success: boolean;
  audioUrl?: string;
  error?: string;
  duration?: number;
}

export function useTextToSpeech() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (
    text: string,
    options?: {
      speakerIndex?: number;
      speakingRate?: number;
      persist?: boolean;
    }
  ): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          persist: options?.persist ?? false,
          speakerIndex: options?.speakerIndex,
          speakingRate: options?.speakingRate,
        }),
      });

      if (!response.ok) {
        const data: TtsResponse = await response.json();
        throw new Error(data.error || 'Failed to generate speech');
      }

      if (options?.persist) {
        const data: TtsResponse = await response.json();
        return data.audioUrl || null;
      } else {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
}

// Usage:
function TextToSpeechComponent() {
  const { generate, loading, error } = useTextToSpeech();

  const handleSpeak = async () => {
    const audioUrl = await generate('Hello, this is a test!', { persist: true });
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  return (
    <div>
      <button onClick={handleSpeak} disabled={loading}>
        {loading ? 'Generating...' : 'Speak'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### Example 4: Batch Processing (Multiple Texts)

```typescript
async function generateMultipleSpeech(texts: string[]): Promise<string[]> {
  const results = await Promise.all(
    texts.map(async (text) => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, persist: true }),
      });

      if (!response.ok) throw new Error(`Failed to generate: ${text}`);

      const data = await response.json();
      return data.audioUrl;
    })
  );

  return results;
}
```

## Configuration

### Backend Setup

1. **Piper CLI Location:** `tools/piper/` (Windows: `piper.exe`, Linux/Mac: `piper`)
2. **Model Location:** `tools/piper/en_US-lessac-medium.onnx`
3. **Output Modes:**
   - **Streaming (persist=false):** Temp file in OS temp directory, cleaned after response
   - **Persistent (persist=true):** Saved to `public/audio/` for static serving

### Required Files

```
project/
├── tools/piper/
│   ├── piper.exe (or piper binary)
│   ├── en_US-lessac-medium.onnx
│   ├── en_US-lessac-medium.onnx.json
│   ├── espeak-ng.dll (or .so/.dylib)
│   └── espeak-ng-data/
├── public/
│   └── audio/ (created automatically on first persist request)
└── app/api/tts/route.ts
```

## Performance Considerations

- **Text Limit:** 5000 characters (configurable in `lib/server/piper.ts`)
- **Timeout:** 30 seconds per request
- **Memory:** Piper runs as subprocess; audio buffered once in memory
- **Storage:** Persistent mode writes to disk; implement cleanup strategy for old files

### Cleanup Old Audio Files

```typescript
import { cleanupAudioFiles } from '@/lib/server/piper';
import path from 'path';

// Run periodically (e.g., cron job)
const audioDir = path.join(process.cwd(), 'public', 'audio');
const deletedCount = cleanupAudioFiles(audioDir, 24 * 60 * 60 * 1000); // 24 hours
console.log(`Cleaned up ${deletedCount} old audio files`);
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Piper executable not found" | Check `tools/piper/` directory and OS-specific binary name |
| "Piper model not found" | Download model file from Piper releases |
| "Piper process timeout" | Reduce text length or increase timeout in `spawnPiperProcess()` |
| "Output file was not created" | Check disk space and file permissions in temp/public directories |
| Audio quality poor | Experiment with `speakingRate` parameter or different voice models |

## Security Notes

- Input text is validated (max 5000 chars, non-empty)
- File paths are sanitized; no directory traversal possible
- Temp files are cleaned up immediately (streaming mode)
- Consider rate limiting in production
- Sanitize user input before passing to Piper if accepting HTML/markdown

## Future Enhancements

- [ ] Multi-language support
- [ ] Multiple voice models
- [ ] Speech rate/pitch parameters via UI
- [ ] Audio caching by text hash
- [ ] WebSocket streaming for large texts
- [ ] Database persistence for generated audios
- [ ] CDN integration for public audio files
