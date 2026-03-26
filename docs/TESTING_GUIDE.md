# Piper TTS Integration - Testing Guide

## 1️⃣ Prerequisites Check

### Verify Piper CLI Exists

**Windows:**
```bash
dir tools\piper\piper.exe
```

**Linux/Mac:**
```bash
ls -la tools/piper/piper
file tools/piper/piper  # Should show: ELF 64-bit executable
```

### Verify Model Files Exist

```bash
# Windows
dir tools\piper\*.onnx
dir tools\piper\*.json
dir tools\piper\espeak-ng-data\

# Linux/Mac
ls -la tools/piper/*.onnx
ls -la tools/piper/*.json
ls -la tools/piper/espeak-ng-data/
```

Expected output:
```
en_US-lessac-medium.onnx
en_US-lessac-medium.onnx.json
espeak-ng.dll (or .so/.dylib)
espeak-ng-data/ (directory with language dictionaries)
```

---

## 2️⃣ Manual Piper CLI Test

Test Piper directly without the API.

### Test 1: Basic TTS Generation

**Windows:**
```bash
echo Hello world | tools\piper\piper.exe --model tools\piper\en_US-lessac-medium.onnx --output_file test-output.wav
dir test-output.wav
```

**Linux/Mac:**
```bash
echo "Hello world" | ./tools/piper/piper --model tools/piper/en_US-lessac-medium.onnx --output_file test-output.wav
ls -lh test-output.wav
```

**Expected:** File `test-output.wav` created (10-50KB for short text)

### Test 2: Long Text

```bash
echo "This is a longer test sentence. The Piper TTS system should handle this text without any issues. It will generate high-quality speech synthesis." | tools\piper\piper.exe --model tools\piper\en_US-lessac-medium.onnx --output_file test-long.wav
```

**Expected:** Larger WAV file (50-200KB)

### Test 3: Error Handling (Invalid Model Path)

```bash
echo "test" | tools\piper\piper.exe --model invalid-path.onnx --output_file test.wav
```

**Expected:** Error message (Piper exits with code != 0)

### Test 4: With Speaker Index (if model supports)

```bash
echo "test" | tools\piper\piper.exe --model tools\piper\en_US-lessac-medium.onnx --speaker 0 --output_file test.wav
```

---

## 3️⃣ Backend Server Testing

### Start Development Server

```bash
npm run dev
```

**Expected output:**
```
> narrator@0.1.0 dev
> next dev

  ▲ Next.js 16.1.6
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 4.2s
```

Leave this running in a terminal.

---

## 4️⃣ API Endpoint Testing (cURL)

Open a **new terminal window** while the dev server runs.

### Test 1: Streaming Mode (Binary Audio Response)

**Request:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test message"}' \
  -o output-streaming.wav
```

**Expected:**
- File `output-streaming.wav` created
- Size: 10-50KB depending on text length
- Contains valid WAV header (RIFF WAVE format)

**Verify audio file:**
```bash
# Windows
dir output-streaming.wav
type output-streaming.wav | more  # Shows binary data with RIFF header

# Linux/Mac
ls -lh output-streaming.wav
file output-streaming.wav  # Shows: WAV audio, ...
```

### Test 2: Persistent Mode (Returns JSON with URL)

**Request:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, persistent mode test", "persist": true}' \
  -o response.json

type response.json  # Windows
cat response.json   # Linux/Mac
```

**Expected response:**
```json
{
  "success": true,
  "audioUrl": "/audio/piper-1709876532891-xyz789.wav",
  "duration": 1.5,
  "timestamp": 1709876532891
}
```

**Verify file exists:**
```bash
dir public\audio\  # Windows
ls -la public/audio/  # Linux/Mac
```

### Test 3: Error Handling - Empty Text

**Request:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": ""}'
```

**Expected response (400):**
```json
{
  "success": false,
  "error": "Text is required and must be a string",
  "timestamp": 1709876532891
}
```

### Test 4: Error Handling - Text Too Long

**Request:**
```bash
# Create 5001 character string
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "'$(printf 'a%.0s' {1..5001})'"}'
```

**Expected response (400):**
```json
{
  "success": false,
  "error": "Text exceeds maximum length of 5000 characters",
  "timestamp": 1709876532891
}
```

### Test 5: Error Handling - Missing Text Field

**Request:**
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected response (400):**
```json
{
  "success": false,
  "error": "Missing or invalid 'text' field. Text must be a non-empty string.",
  "timestamp": 1709876532891
}
```

### Test 6: List Audio Files

**Request:**
```bash
curl http://localhost:3000/api/audio/list | jq
```

**Expected response:**
```json
{
  "success": true,
  "count": 1,
  "totalSize": 24576,
  "files": [
    {
      "filename": "piper-1709876532891-xyz789.wav",
      "filepath": "c:/Tin N Nguyen/projects/IT/2026/Narrator/public/audio/piper-1709876532891-xyz789.wav",
      "url": "/audio/piper-1709876532891-xyz789.wav",
      "duration": 0,
      "createdAt": 1709876532891
    }
  ]
}
```

### Test 7: Delete Audio File

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/audio/delete \
  -H "Content-Type: application/json" \
  -d '{"filename": "piper-1709876532891-xyz789.wav"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Deleted piper-1709876532891-xyz789.wav"
}
```

### Test 8: Cleanup Old Files

**Request:**
```bash
curl -X POST http://localhost:3000/api/audio/cleanup \
  -H "Content-Type: application/json" \
  -d '{"maxAgeMs": 0}'  # Delete all files immediately
```

**Expected response:**
```json
{
  "success": true,
  "deletedCount": 1,
  "message": "Cleaned up 1 old audio file(s)"
}
```

---

## 5️⃣ Frontend Component Testing

### Method 1: Test Page

Create a new test page:

```bash
# Create test page
mkdir -p app/test
```

Create `app/test/page.tsx`:
```tsx
import { TtsDemo } from '@/components/tts-demo';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">TTS Testing</h1>
      <TtsDemo />
    </div>
  );
}
```

**Navigate to:** `http://localhost:3000/test`

### Method 2: Test in Browser Console

Navigate to `http://localhost:3000` and open browser DevTools (F12):

```javascript
// Test streaming mode
const response = await fetch('/api/tts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Hello from browser' }),
});

const blob = await response.blob();
console.log('Audio blob size:', blob.size);

// Create audio element and play
const audio = new Audio(URL.createObjectURL(blob));
audio.play();
```

### Method 3: Postman/REST Client

**Setup in VS Code:**

1. Install extension: "REST Client" by Huachao Zheng
2. Create `test.http` file:

```http
### Test Streaming Mode
POST http://localhost:3000/api/tts
Content-Type: application/json

{
  "text": "Hello from Postman test"
}

### Test Persistent Mode
POST http://localhost:3000/api/tts
Content-Type: application/json

{
  "text": "Hello from persistent mode",
  "persist": true
}

### List Audio Files
GET http://localhost:3000/api/audio/list

### Cleanup Files
POST http://localhost:3000/api/audio/cleanup
Content-Type: application/json

{
  "maxAgeMs": 86400000
}
```

Click "Send Request" above each request.

---

## 6️⃣ Integration Testing

### Test 1: Full Flow (Generate → List → Download)

```bash
# 1. Generate persistent audio
echo '{"text": "Integration test message", "persist": true}' | \
  curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d @- \
  -o gen-response.json

# 2. List files
curl http://localhost:3000/api/audio/list > list-response.json

# 3. Extract URL from response
filename=$(cat list-response.json | grep -o '"url":"[^"]*' | head -1 | cut -d'"' -f4)

# 4. Download file
curl "http://localhost:3000${filename}" -o integration-test.wav

# 5. Verify file
ls -lh integration-test.wav
```

### Test 2: Batch Processing

```bash
#!/bin/bash
# test-batch.sh

texts=(
  "First message"
  "Second message"
  "Third message"
)

for text in "${texts[@]}"; do
  echo "Generating: $text"
  curl -X POST http://localhost:3000/api/tts \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"$text\", \"persist\": true}" \
    -s | jq -r '.audioUrl'
done
```

### Test 3: Performance Test

```bash
#!/bin/bash
# test-performance.sh

echo "Starting performance test..."

for i in {1..5}; do
  start_time=$(date +%s%N | cut -b1-13)
  
  curl -X POST http://localhost:3000/api/tts \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Test message number $i\"}" \
    -o "perf-test-$i.wav" \
    -s
  
  end_time=$(date +%s%N | cut -b1-13)
  duration=$((end_time - start_time))
  
  echo "Request $i: ${duration}ms"
done
```

---

## 7️⃣ Browser-Based Testing

### Open Demo Component

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Create test page** at `app/demo/page.tsx`:
   ```tsx
   'use client';
   import { TtsDemo } from '@/components/tts-demo';
   
   export default function DemoPage() {
     return (
       <div className="p-8 max-w-2xl mx-auto">
         <TtsDemo />
       </div>
     );
   }
   ```

3. **Open browser:** `http://localhost:3000/demo`

4. **Test cases in UI:**
   - [ ] Type short text (< 100 chars) → Generate → Play
   - [ ] Type long text (500+ chars) → Generate → Play
   - [ ] Toggle streaming/persistent mode
   - [ ] Download audio file
   - [ ] Type empty text → See error
   - [ ] Type very long text (5000+ chars) → See error
   - [ ] Generate multiple times → Verify different files

---

## 8️⃣ Debugging & Logging

### Enable Debug Output

Add logging to `app/api/tts/route.ts`:

```typescript
console.log('TTS Request:', { text, persist });
console.log('TTS Response:', { success, audioUrl, error });
```

Check **terminal output** where `npm run dev` runs.

### Check Generated Audio Files

```bash
# List all generated audio files
dir public\audio\  # Windows
ls -la public/audio/  # Linux/Mac

# Check file size
dir public\audio\*.wav | sort /+36  # Windows by size
du -sh public/audio/*  # Linux/Mac
```

### Inspect Audio Properties

```bash
# Windows Media Player
start public\audio\piper-*.wav

# Linux
ffprobe public/audio/piper-*.wav  # If ffprobe installed

# Mac
afinfo public/audio/piper-*.wav
```

---

## 9️⃣ Common Test Scenarios

### Scenario 1: Quick Smoke Test
```bash
# 1. Generate audio
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Smoke test"}' \
  -o test.wav

# 2. Verify file exists and has content
dir test.wav
type test.wav | head -c 50  # Show first 50 bytes (RIFF header)
```

**Expected:** File exists, starts with "RIFF" (binary)

### Scenario 2: Edge Cases
```bash
# Whitespace only
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "   "}'

# Special characters
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello @#$%^&*()"}'

# Very long single word
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "supercalifragilisticexpialidocious supercalifragilisticexpialidocious"}'
```

### Scenario 3: Concurrent Requests
```bash
# Generate 3 audio files in parallel
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/tts \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"Request $i\", \"persist\": true}" \
    -o response-$i.json &
done
wait

# List all generated files
curl http://localhost:3000/api/audio/list | jq '.count'
```

---

## 🔟 Verification Checklist

- [ ] Piper CLI executable exists and is runnable
- [ ] Model files exist (`.onnx`, `.json`, espeak-ng-data)
- [ ] Manual Piper test generates valid WAV file
- [ ] Dev server starts without errors
- [ ] `/api/tts` returns valid audio in streaming mode
- [ ] `/api/tts` returns JSON with URL in persistent mode
- [ ] `/api/audio/list` returns file list
- [ ] Error handling works (empty text, text too long)
- [ ] Demo component renders in browser
- [ ] Audio plays in browser
- [ ] `/api/audio/delete` deletes files
- [ ] `/api/audio/cleanup` removes old files
- [ ] Multiple requests work concurrently
- [ ] File cleanup happens automatically for streaming mode
- [ ] Persistent files survive in `/public/audio/`

---

## 🚨 Troubleshooting Tests

### Issue: "Piper executable not found"

```bash
# Check path
where piper.exe  # Windows
which piper      # Linux/Mac

# Verify in project
ls -la tools/piper/piper.exe  # Windows
file tools/piper/piper        # Linux/Mac
```

### Issue: "Model file not found"

```bash
ls -la tools/piper/*.onnx
ls -la tools/piper/*.json
```

### Issue: Audio response is empty or invalid

```bash
# Check response headers
curl -i -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "test"}'

# Should show: Content-Type: audio/wav
```

### Issue: Persistent mode returns error

```bash
# Check /public/audio directory exists
ls -la public/audio/  # Linux/Mac
dir public\audio\    # Windows

# Manually create if missing
mkdir -p public/audio  # Linux/Mac
```

### Issue: Dev server crashes during TTS generation

```bash
# Check server logs for error messages
# Reduce text length in test
# Check available system memory
```

---

## Summary: Test in 5 Minutes

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Run tests
# Test 1: Manual Piper
echo "test" | tools\piper\piper.exe --model tools\piper\en_US-lessac-medium.onnx --output_file test.wav

# Test 2: API streaming
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "hello"}' -o output.wav

# Test 3: API persistent
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "hello", "persist": true}' | jq

# Test 4: Browser
# Open http://localhost:3000/demo (after creating page.tsx)
```

Done! All tests pass ✅
