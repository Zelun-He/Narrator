# Piper TTS Integration - Setup Guide

## Overview

This guide covers the production-ready Piper TTS integration for your Next.js audiobook application. The system supports two modes:
- **Streaming**: Direct binary audio response (no disk storage)
- **Persistent**: Saves to `/public/audio` for static serving

---

## Prerequisites

1. **Piper CLI** installed in `tools/piper/`
   - Windows: `piper.exe`
   - Linux/Mac: `piper` binary
   - espeak-ng files required

2. **Piper Model** in `tools/piper/`
   - `en_US-lessac-medium.onnx`
   - `en_US-lessac-medium.onnx.json`
   - `espeak-ng-data/` directory

3. **Node.js 18+** (for child_process subprocess support)

4. **Writable directories**:
   - `public/audio/` (created automatically)
   - OS temp directory (system permissions)

---

## File Structure

```
project/
├── app/
│   └── api/
│       ├── tts/route.ts                 # Main TTS endpoint
│       └── audio/
│           ├── list/route.ts            # List audio files
│           ├── delete/route.ts          # Delete audio
│           └── cleanup/route.ts         # Cleanup old files
├── components/
│   └── tts-demo.tsx                     # React demo component
├── lib/server/
│   ├── piper.ts                         # Core Piper wrapper
│   └── tts-service.ts                   # High-level service
├── public/
│   └── audio/                           # Generated audio files (created auto)
├── tools/piper/
│   ├── piper.exe                        # Piper CLI executable
│   ├── en_US-lessac-medium.onnx         # Voice model
│   ├── en_US-lessac-medium.onnx.json    # Model config
│   └── espeak-ng-data/                  # Text-to-phoneme data
└── docs/
    ├── TTS_API.md                       # API documentation
    ├── IMPLEMENTATION_EXAMPLES.md       # Code examples
    └── SETUP_GUIDE.md                   # This file
```

---

## Quick Start (5 minutes)

### Step 1: Verify Piper Installation

```bash
# Windows
tools\piper\piper.exe --version

# Linux/Mac
tools/piper/piper --version
```

Expected output: `piper <version>`

### Step 2: Test Manual Generation

```bash
# Windows
echo "Hello world" | tools\piper\piper.exe --model tools\piper\en_US-lessac-medium.onnx --output_file test.wav

# Linux/Mac
echo "Hello world" | ./tools/piper/piper --model tools/piper/en_US-lessac-medium.onnx --output_file test.wav
```

### Step 3: Start Development Server

```bash
npm run dev
```

### Step 4: Test API Endpoint

```bash
# Streaming mode
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test"}' \
  -o output.wav

# Persistent mode
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test", "persist": true}' | jq
```

### Step 5: Use Demo Component

```tsx
// In any page
import { TtsDemo } from '@/components/tts-demo';

export default function TestPage() {
  return <TtsDemo />;
}
```

---

## Integration in Your App

### Option 1: Add TTS to Existing Page

```tsx
// app/(dashboard)/audiobook/page.tsx
import { TtsDemo } from '@/components/tts-demo';

export default function AudiobookPage() {
  return (
    <div>
      <h1>Audiobook Generator</h1>
      <TtsDemo />
    </div>
  );
}
```

### Option 2: Use Service Directly (Backend)

```ts
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ttsService } from '@/lib/server/tts-service';

export async function POST(req: NextRequest) {
  const { text } = await req.json();
  
  // Generate persistent audio
  const metadata = await ttsService.generatePersistentAudio(text);
  
  return NextResponse.json({
    audioUrl: metadata.url,
    duration: metadata.duration,
  });
}
```

### Option 3: Build Custom Component

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CustomTTS() {
  const [audio, setAudio] = useState<string | null>(null);

  const handleGenerate = async (text: string) => {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setAudio(url);
  };

  return (
    <div>
      <Button onClick={() => handleGenerate('Say something')}>
        Generate Audio
      </Button>
      {audio && <audio src={audio} controls />}
    </div>
  );
}
```

---

## Configuration Options

### Adjust Piper Config

Edit `lib/server/piper.ts` to change defaults:

```typescript
export function getPiperConfig(): PiperConfig {
  // ... existing code ...
  return {
    piperPath,
    modelPath,
    speakerIndex: 0,        // Change speaker variant
    speakingRate: 1.0,      // Adjust speech speed
  };
}
```

### Modify Request Parameters

The API accepts these per-request options:

```json
{
  "text": "Your text here",
  "speakerIndex": 0,        // 0-n depending on model
  "speakingRate": 1.0,      // 0.5 to 2.0
  "persist": false          // true for /public/audio storage
}
```

### Customize Timeout & Limits

Edit `lib/server/piper.ts`:

```typescript
// Line ~80: Adjust timeout (30s default)
setTimeout(() => {
  piper.kill();
  reject(new Error('Timeout after 30 seconds'));
}, 30000); // Change this value

// Line ~30: Adjust max text length (5000 default)
function validateInput(text: string, maxLength: number = 5000) {
  // ...
}
```

---

## Production Deployment

### Environment Setup

```bash
# .env.production
NODE_ENV=production
```

### Memory Optimization

- Piper runs as subprocess; limited to process memory
- Audio buffered once in memory before response
- Temp files auto-cleaned; persistent files managed by service
- Consider worker processes for high-volume scenarios

### Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": "Descriptive error message",
  "timestamp": 1709876532891
}
```

Handle errors client-side:

```typescript
try {
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const { error } = await response.json();
    throw new Error(error);
  }

  // Process response...
} catch (error) {
  console.error('TTS Error:', error.message);
  // Show user-friendly error message
}
```

### Storage Management

Monitor `/public/audio/` directory size:

```typescript
import { ttsService } from '@/lib/server/tts-service';

const totalSize = ttsService.getTotalAudioSize();
console.log(`Audio storage: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
```

Setup automated cleanup:

```bash
# Call cleanup endpoint daily
curl -X POST https://yoursite.com/api/audio/cleanup
```

Or in your app initialization:

```typescript
// lib/server/init.ts
import { ttsService } from './tts-service';

export function initializeCleanup() {
  // Cleanup files older than 7 days, run every 24 hours
  setInterval(() => {
    ttsService.cleanupOldAudioFiles(7 * 24 * 60 * 60 * 1000);
  }, 24 * 60 * 60 * 1000);
}
```

---

## Performance Benchmarks

Typical performance on modern hardware:

| Metric | Value |
|--------|-------|
| Generation time (100 chars) | ~500ms |
| Generation time (500 chars) | ~2s |
| Generation time (1000 chars) | ~4s |
| Max safe text length | 5000 chars |
| Process timeout | 30s |
| Memory per request | ~50-100MB |

Optimization tips:
- Keep text under 500 characters for best UX
- Batch process large texts
- Use persistent mode for reusable content
- Implement text caching by hash

---

## Troubleshooting

### Issue: "Piper executable not found"

```bash
# Verify Piper exists
ls -la tools/piper/  # Linux/Mac
dir tools\piper\    # Windows

# Check for Windows-specific path issues
echo $PATH  # Verify tools directory accessible
```

**Solution:** Ensure `piper.exe` (Windows) or `piper` (Unix) is in `tools/piper/` directory.

### Issue: "Model file not found"

```bash
# Verify model files
ls -la tools/piper/*.onnx
ls -la tools/piper/*.json
```

**Solution:** Download voice model from [Piper releases](https://github.com/rhasspy/piper/releases).

### Issue: "Piper process timeout"

**Causes:**
- Text too long
- System overloaded
- Piper hanging

**Solutions:**
1. Reduce text length
2. Increase timeout in `piper.ts` (line ~80)
3. Restart backend service
4. Check system resources

### Issue: Audio quality poor

**Solutions:**
1. Verify model file integrity
2. Try different voice model
3. Adjust `speakingRate` parameter
4. Check for TTS text encoding issues

### Issue: Disk space filling up

**Solutions:**
```typescript
// Manual cleanup
import { ttsService } from '@/lib/server/tts-service';

ttsService.cleanupOldAudioFiles(24 * 60 * 60 * 1000); // 24 hours

// Monitor size
const size = ttsService.getTotalAudioSize();
if (size > 1024 * 1024 * 1024) { // 1GB
  ttsService.cleanupOldAudioFiles(7 * 24 * 60 * 60 * 1000); // 7 days
}
```

---

## API Reference Summary

### POST `/api/tts`
Generate audio from text.
- **Streaming mode** (persist=false): Returns binary WAV
- **Persistent mode** (persist=true): Returns JSON with URL

### GET `/api/audio/list`
List all generated audio files with metadata.

### DELETE `/api/audio/delete`
Delete specific audio file by filename.

### POST `/api/audio/cleanup`
Cleanup audio files older than specified age (default 7 days).

See `docs/TTS_API.md` for complete API documentation.

---

## Next Steps

1. ✅ Verify Piper installation and models
2. ✅ Test manual TTS generation
3. ✅ Start dev server and test API
4. ✅ Integrate TTS component into your app
5. ✅ Configure storage cleanup
6. ✅ Deploy to production
7. ✅ Monitor performance and errors

---

## Support & Resources

- [Piper GitHub](https://github.com/rhasspy/piper)
- [Voice Models](https://github.com/rhasspy/piper/releases)
- [API Documentation](./TTS_API.md)
- [Implementation Examples](./IMPLEMENTATION_EXAMPLES.md)

---

## License & Attribution

Piper is licensed under MIT. Ensure compliance when distributing audio-enabled applications.
