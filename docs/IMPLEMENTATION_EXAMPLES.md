# Piper TTS Implementation Examples

## Quick Start

### 1. Basic Frontend Usage (React Component)

```typescript
// In your React component
import { TtsDemo } from '@/components/tts-demo';

export default function Page() {
  return <TtsDemo />;
}
```

### 2. API Endpoint Testing

#### Using cURL
```bash
# Streaming mode (direct binary response)
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' \
  -o output.wav

# Persistent mode (returns JSON with URL)
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world", "persist": true}' | jq
```

#### Using fetch (JavaScript)
```javascript
// Streaming mode
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello world' }),
});

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);
audio.play();

// Persistent mode
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello world', persist: true }),
});

const data = await response.json();
console.log(data.audioUrl); // '/audio/piper-123456789-abc.wav'
```

---

## Advanced Usage

### 1. Server-Side TTS Service Usage

Use the `TtsService` class directly in your backend code:

```typescript
// app/api/generate-chapter/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { bookText, chapterNumber } = await req.json();

    // Generate persistent audio (saves to /public/audio)
    const metadata = await ttsService.generatePersistentAudio(bookText);

    // Store metadata in database
    // await db.chapters.update({ audioUrl: metadata.url, duration: metadata.duration });

    return NextResponse.json({
      success: true,
      audioUrl: metadata.url,
      duration: metadata.duration,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 2. Batch Processing Multiple Texts

```typescript
// app/api/batch-tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { texts } = await req.json();

    if (!Array.isArray(texts) || texts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Texts array required' },
        { status: 400 }
      );
    }

    // Generate audio for all texts in parallel
    const results = await Promise.all(
      texts.map((text) => ttsService.generatePersistentAudio(text))
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      audioFiles: results.map((r) => ({
        url: r.url,
        duration: r.duration,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Audio Management Endpoints

#### List all generated audio files
```bash
curl http://localhost:3000/api/audio/list | jq
```

Response:
```json
{
  "success": true,
  "count": 5,
  "totalSize": 1048576,
  "files": [
    {
      "filename": "piper-1709876532891-xyz789.wav",
      "url": "/audio/piper-1709876532891-xyz789.wav",
      "duration": 2.5,
      "createdAt": 1709876532891
    }
  ]
}
```

#### Delete specific audio file
```bash
curl -X DELETE http://localhost:3000/api/audio/delete \
  -H "Content-Type: application/json" \
  -d '{"filename": "piper-1709876532891-xyz789.wav"}'
```

#### Cleanup old files (7+ days old)
```bash
curl -X POST http://localhost:3000/api/audio/cleanup
```

Cleanup specific age:
```bash
curl -X POST http://localhost:3000/api/audio/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMs": 86400000}'  # 24 hours
```

---

## Real-World Scenarios

### Scenario 1: Audiobook Generation Pipeline

```typescript
// lib/server/audiobook-generator.ts
import { ttsService } from './tts-service';

export async function generateAudioBook(bookData: {
  title: string;
  chapters: { title: string; content: string }[];
}) {
  const audioChapters = [];

  for (const chapter of bookData.chapters) {
    console.log(`Generating audio for: ${chapter.title}`);

    try {
      const metadata = await ttsService.generatePersistentAudio(chapter.content);

      audioChapters.push({
        title: chapter.title,
        audioUrl: metadata.url,
        duration: metadata.duration,
      });

      console.log(`✓ Generated: ${metadata.url} (${metadata.duration}s)`);
    } catch (error) {
      console.error(`✗ Failed to generate audio for ${chapter.title}:`, error);
      // Handle error - retry, skip, or notify user
    }
  }

  return {
    title: bookData.title,
    chapters: audioChapters,
    totalDuration: audioChapters.reduce((sum, ch) => sum + ch.duration, 0),
  };
}
```

### Scenario 2: Real-Time Chat-to-Speech

```typescript
// Frontend React hook
import { useCallback, useState } from 'react';

export function useChatAudio() {
  const [isGenerating, setIsGenerating] = useState(false);

  const speak = useCallback(async (message: string) => {
    setIsGenerating(true);

    try {
      // Use streaming mode for instant playback
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create and play audio
      const audio = new Audio(audioUrl);
      audio.play();

      return new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { speak, isGenerating };
}

// Usage in chat component
function ChatBubble({ message, isBot }: { message: string; isBot: boolean }) {
  const { speak, isGenerating } = useChatAudio();

  if (!isBot) return <div>{message}</div>;

  return (
    <div className="flex gap-2">
      <div>{message}</div>
      <button
        onClick={() => speak(message)}
        disabled={isGenerating}
        className="text-blue-500 hover:text-blue-700 disabled:opacity-50"
      >
        {isGenerating ? '🔄' : '🔊'}
      </button>
    </div>
  );
}
```

### Scenario 3: Scheduled Cleanup Task

```typescript
// lib/server/cleanup-scheduler.ts
import { ttsService } from './tts-service';

export function scheduleAudioCleanup() {
  // Run cleanup every 24 hours
  setInterval(() => {
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const deletedCount = ttsService.cleanupOldAudioFiles(maxAgeMs);
    console.log(`[Cleanup] Removed ${deletedCount} old audio files`);
  }, 24 * 60 * 60 * 1000);
}

// Call in your app initialization
// import { scheduleAudioCleanup } from '@/lib/server/cleanup-scheduler';
// scheduleAudioCleanup();
```

### Scenario 4: Caching with Database

```typescript
// lib/server/cached-tts-service.ts
import { ttsService } from './tts-service';
import crypto from 'crypto';

interface CachedAudio {
  id: string;
  textHash: string;
  audioUrl: string;
  duration: number;
  createdAt: Date;
}

export async function generateAudioWithCache(
  text: string,
  db: any // Your database instance
): Promise<CachedAudio> {
  const textHash = crypto.createHash('sha256').update(text).digest('hex');

  // Check if audio already exists for this text
  const cached = await db.cachedAudio.findUnique({ where: { textHash } });
  if (cached && cached.audioUrl) {
    return cached;
  }

  // Generate new audio
  const metadata = await ttsService.generatePersistentAudio(text);

  // Store in cache
  const cachedRecord = await db.cachedAudio.create({
    data: {
      textHash,
      audioUrl: metadata.url,
      duration: metadata.duration,
    },
  });

  return cachedRecord;
}
```

---

## Configuration & Customization

### Environment Variables

```bash
# .env.local
TTS_MAX_TEXT_LENGTH=5000
TTS_PROCESS_TIMEOUT=30000
TTS_SPEAKER_INDEX=0
TTS_SPEAKING_RATE=1.0
```

### Custom Piper Config

```typescript
// lib/server/piper-config.ts
import { getPiperConfig } from '@/lib/server/piper';

// Override defaults
const customConfig = {
  ...getPiperConfig(),
  speakerIndex: 1,
  speakingRate: 1.2,
};

// Use in generateTts
await generateTts({ text: 'Hello' }, customConfig);
```

---

## Error Handling Patterns

### Try-Catch with User Feedback

```typescript
async function safeTTS(text: string): Promise<string | null> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const error = await response.json();
      
      switch (response.status) {
        case 400:
          throw new Error('Invalid text input');
        case 503:
          throw new Error('TTS service not available');
        case 500:
          throw new Error('Failed to generate audio');
        default:
          throw new Error(error.error || 'Unknown error');
      }
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('TTS Error:', error);
    // Show user-friendly error message
    return null;
  }
}
```

### Retry Logic

```typescript
async function ttWithRetry(
  text: string,
  maxRetries: number = 3
): Promise<string | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }

      throw new Error(`Failed after ${maxRetries} attempts`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }

  return null;
}
```

---

## Performance Tips

1. **Use persistent mode for long-lived content** (books, chapters)
2. **Use streaming mode for ephemeral content** (chat, notifications)
3. **Implement text caching** to avoid regenerating same audio
4. **Schedule cleanup tasks** during off-peak hours
5. **Use Promise.all()** for batch processing
6. **Monitor audio directory size** to prevent disk space issues
7. **Consider CDN** for serving persistent audio files

---

## Monitoring & Logging

```typescript
// lib/server/tts-monitoring.ts
export function logTtsMetrics(result: {
  text: string;
  duration: number;
  fileSize: number;
  timestamp: number;
}) {
  const textChars = result.text.length;
  const timeMs = Date.now() - result.timestamp;
  const charsPerSecond = (textChars / result.duration).toFixed(2);

  console.log(`[TTS] Generated ${textChars} chars in ${timeMs}ms`);
  console.log(`[TTS] Duration: ${result.duration.toFixed(2)}s`);
  console.log(`[TTS] File size: ${(result.fileSize / 1024).toFixed(2)}KB`);
  console.log(`[TTS] Speed: ${charsPerSecond} chars/second`);
}
```
