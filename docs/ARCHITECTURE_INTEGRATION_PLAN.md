# Piper TTS Integration Architecture Plan

## Current System Analysis

### Existing Architecture
```
User Upload (PDF/DOCX/TXT)
    ↓
POST /api/books (Create book entry)
    ↓
data/books.json (Store metadata)
    ↓
POST /api/books/[id]/generate (Start generation with voice selection)
    ↓
Simulate progress (8 sec per chapter, fake data)
    ↓
GET /api/books/[id] (Poll for progress)
    ↓
Player page displays chapters
    ↓
❌ NO ACTUAL AUDIO GENERATED (Simulated only)
```

### Current Data Structure
```typescript
// Book Record
{
  id: string
  title: string
  author: string
  language: string
  status: "processing" | "completed" | "failed"
  progress: number (0-100)
  chaptersList: Chapter[]
  voiceName: string
  generationStartedAt: string
  createdAt: string
}

// Chapter (Current - Simulated)
{
  id: string
  name: string
  status: "completed" | "processing" | "pending" | "failed"
  duration: string (e.g., "8:00")
}
```

---

## Integration Plan

### Phase 1: Data Structure Enhancement

#### 1.1 Extend Chapter Type with Audio Metadata

**File:** `lib/audiobook-types.ts`

```typescript
export interface Chapter {
  id: string
  name: string
  status: ChapterStatus
  duration: string | null
  
  // NEW FIELDS
  textContent?: string          // Extracted chapter text
  audioUrl?: string             // URL to generated WAV file (/audio/piper-*.wav)
  audioPath?: string            // Full filesystem path
  audioSize?: number            // File size in bytes
  retries?: number              // Failed TTS generation retry count
}
```

#### 1.2 Extend BookRecord with Generation Metadata

**File:** `lib/server/audiobook-store.ts`

```typescript
interface BookRecord {
  // ... existing fields
  
  // NEW FIELDS
  uploadedFileName?: string     // Original uploaded file name
  uploadedFilePath?: string     // Path to uploaded manuscript
  fileContent?: string          // Extracted text from manuscript
  audioDirectory?: string       // Directory where chapter audio files stored
  failedChapters?: string[]     // IDs of chapters that failed TTS
  generationError?: string      // Error message if generation failed
}
```

---

### Phase 2: Create Manuscript Processing Service

#### 2.1 Chapter Extraction Service

**File:** `lib/server/manuscript-processor.ts` (NEW)

```typescript
export interface ExtractedChapter {
  index: number
  title: string
  text: string
}

export async function extractChaptersFromManuscript(
  filePath: string,
  fileType: "txt" | "pdf" | "docx"
): Promise<ExtractedChapter[]>
// - Parse text file for "Chapter X" markers
// - Extract chapter boundaries
// - Return array of chapters with title and text
// - Handle edge cases (no chapters = treat as single chapter)
```

---

### Phase 3: Create Audio Generation Service

#### 3.1 Batch TTS Generation Service

**File:** `lib/server/audio-generation-service.ts` (NEW)

```typescript
export interface AudioGenerationTask {
  bookId: string
  chapters: Array<{
    id: string
    text: string
    index: number
  }>
  voiceId: string
}

export async function generateAudioForBook(
  task: AudioGenerationTask
): Promise<{
  success: boolean
  generatedChapters: Array<{
    chapterId: string
    audioUrl: string
    duration: number
    size: number
  }>
  failedChapters: string[]
  error?: string
}>

// Internally:
// 1. Create /public/audio/book-{bookId}/ directory
// 2. For each chapter:
//    - Call ttsService.generatePersistentAudio(chapterText)
//    - Get audio URL and duration
//    - Store in chapter metadata
// 3. Handle retries on failure
// 4. Update book progress in real-time
```

---

### Phase 4: Integration with Existing Generate Endpoint

#### 4.1 Modified Generation Flow

**File:** `app/api/books/[id]/generate/route.ts`

**Current Flow:**
```typescript
POST /api/books/[id]/generate
→ startGeneration() (updates status, returns metadata)
→ Client polls GET /api/books/[id]
→ reconcileProgress() simulates chapter completion
```

**New Flow:**
```typescript
POST /api/books/[id]/generate
→ Get book metadata
→ Extract manuscript text from uploaded file
→ Call extractChaptersFromManuscript(uploadPath)
→ Update chapters in book record
→ Start async audio generation (no await)
→ Return book with chapters
→ Client polls GET /api/books/[id]
→ Get real progress from audio generation task
→ Player loads and plays generated audio files
```

#### 4.2 Implementation Details

```typescript
export async function POST(request, { params }) {
  const { id } = await params
  const { voiceId, voiceName } = await request.json()
  
  // 1. Get book
  const book = await getBook(id)
  
  // 2. Extract chapters from manuscript
  const chapters = await extractChaptersFromManuscript(
    book.uploadedFilePath,
    book.fileType
  )
  
  // 3. Update chapters in book
  book.chaptersList = chapters.map((ch, i) => ({
    id: generateId(),
    name: ch.title,
    textContent: ch.text,
    status: "pending",
    duration: null
  }))
  
  // 4. Start generation in background (fire and forget)
  generateAudioForBook({
    bookId: id,
    chapters: book.chaptersList.map(ch => ({
      id: ch.id,
      text: ch.textContent,
      index: chapters.indexOf(ch)
    })),
    voiceId
  }).catch(err => {
    // Log error, update book status to "failed"
    console.error(`Generation failed for book ${id}:`, err)
  })
  
  // 5. Return immediately with chapters
  return NextResponse.json({ 
    book: {
      ...book,
      status: "processing"
    }
  })
}
```

---

### Phase 5: Progress Tracking

#### 5.1 Real-time Progress Service

**File:** `lib/server/generation-progress-tracker.ts` (NEW)

```typescript
// Maintain in-memory or Redis cache of active generation tasks
const activeGenerations = new Map<string, {
  bookId: string
  totalChapters: number
  completedChapters: number
  failedChapters: string[]
  startTime: number
  estimatedEndTime: number
}>()

export function trackGenerationProgress(bookId: string) {
  return activeGenerations.get(bookId) || null
}

export function startTracking(bookId: string, totalChapters: number) {
  activeGenerations.set(bookId, {
    bookId,
    totalChapters,
    completedChapters: 0,
    failedChapters: [],
    startTime: Date.now(),
    estimatedEndTime: Date.now() + (totalChapters * 2000) // 2s avg per chapter
  })
}
```

#### 5.2 Modified Progress Calculation

**File:** `lib/server/audiobook-store.ts` - Update `reconcileProgress()`

```typescript
function reconcileProgress(book: BookRecord): BookRecord {
  // If generation is in progress:
  // 1. Check active generation tracker
  // 2. Get real progress from tracker (not time-based)
  // 3. Update chapter statuses based on completed audio files
  
  const tracker = trackGenerationProgress(book.id)
  if (tracker) {
    const progress = Math.round(
      (tracker.completedChapters / tracker.totalChapters) * 100
    )
    
    return {
      ...book,
      progress,
      status: tracker.completedChapters === tracker.totalChapters 
        ? "completed" 
        : "processing"
    }
  }
  
  // Fallback to existing logic if no tracker
  return book
}
```

---

### Phase 6: Update Player Component

#### 6.1 Load and Play Real Audio

**File:** `components/audio-player.tsx` (MODIFY)

**Current:**
```typescript
// Plays fake/placeholder audio
<audio src={placeholderUrl} />
```

**New:**
```typescript
// Each chapter gets its real audio URL
{chapter.audioUrl && (
  <div className="chapter-audio">
    <audio src={chapter.audioUrl} controls />
    <span>{chapter.duration}</span>
  </div>
)}

// Chapter list with audio progress
{chapters.map(ch => (
  <div>
    {ch.name}
    {ch.status === "completed" && ch.audioUrl && (
      <audio src={ch.audioUrl} />
    )}
    {ch.status === "processing" && (
      <Spinner />
    )}
    {ch.status === "failed" && (
      <Alert>Failed to generate audio</Alert>
    )}
  </div>
))}
```

---

## Architecture Diagram

### Before (Current - Simulated)
```
User Upload
    ↓
Create Book + Fake Chapters
    ↓
Fake Generation (Time-based progress)
    ↓
Player with Placeholder Audio
```

### After (With Piper TTS)
```
User Upload
    ↓
Extract Chapters from Manuscript
    ↓
Real TTS Generation (Per-chapter audio files)
    ├─→ Chapter 1 → Piper → /audio/book-{id}-ch-1.wav
    ├─→ Chapter 2 → Piper → /audio/book-{id}-ch-2.wav
    └─→ Chapter N → Piper → /audio/book-{id}-ch-n.wav
    ↓
Update Chapter Metadata (audioUrl, duration, size)
    ↓
Player with Real Audio
    ├─→ Chapter 1 → Play /audio/book-{id}-ch-1.wav
    ├─→ Chapter 2 → Play /audio/book-{id}-ch-2.wav
    └─→ Chapter N → Play /audio/book-{id}-ch-n.wav
```

---

## Data Flow

### Upload to Playback Flow

```
1. User uploads manuscript.pdf
   POST /api/books
   → Create book entry with uploadedFilePath

2. User selects voice and generates audiobook
   POST /api/books/[id]/generate
   → Read uploaded file
   → Extract chapters using manuscript-processor
   → Start background audio generation job
   → Return chapters (empty audioUrl)

3. Client polls progress
   GET /api/books/[id]
   → Check generation progress tracker
   → Get completed chapter count
   → Return updated book with progress %

4. Audio generation completes
   Chapter 1 audio generated → /audio/book-123-ch-1.wav
   → Update chapter metadata (audioUrl, duration)
   → Increment progress tracker
   → Next chapter starts

5. User navigates to player
   GET /player?bookId=...
   → Display chapters with audio URLs
   → Each chapter has <audio src="/audio/..." controls />

6. User clicks play
   <audio> element plays WAV file from /public/audio/
```

---

## File Organization

```
project/
├── lib/server/
│   ├── piper.ts                    # ✅ EXISTS - Core Piper wrapper
│   ├── tts-service.ts              # ✅ EXISTS - High-level service
│   ├── audiobook-store.ts          # MODIFY - Add audio metadata fields
│   ├── manuscript-processor.ts     # CREATE - Extract chapters from files
│   └── audio-generation-service.ts # CREATE - Batch TTS for chapters
│
├── app/api/
│   ├── tts/route.ts                # ✅ EXISTS - Standalone TTS endpoint
│   ├── audio/list,delete,cleanup/  # ✅ EXISTS - Audio management
│   ├── books/[id]/generate/        # MODIFY - Integrate TTS
│   └── books/[id]/route.ts         # MODIFY - Include audio metadata
│
├── components/
│   ├── audio-player.tsx            # MODIFY - Play real audio URLs
│   └── tts-demo.tsx                # ✅ EXISTS - Demo component
│
├── public/
│   └── audio/                      # ✅ EXISTS - Generated audio files
│
└── docs/
    ├── TTS_API.md                  # ✅ EXISTS
    ├── IMPLEMENTATION_EXAMPLES.md  # ✅ EXISTS
    ├── SETUP_GUIDE.md              # ✅ EXISTS
    ├── TESTING_GUIDE.md            # ✅ EXISTS
    └── ARCHITECTURE_INTEGRATION_PLAN.md # THIS FILE
```

---

## Implementation Order

1. **Enhance Data Types** (lib/audiobook-types.ts, audiobook-store.ts)
   - Add audioUrl, audioPath, duration to Chapter
   - Add audio-related fields to BookRecord

2. **Create Manuscript Processor** (lib/server/manuscript-processor.ts)
   - Extract chapters from uploaded files
   - Handle different file types (TXT, PDF, DOCX)

3. **Create Audio Generation Service** (lib/server/audio-generation-service.ts)
   - Batch process chapters through Piper TTS
   - Store audio files in /public/audio/book-{id}/
   - Update metadata

4. **Update Generation Endpoint** (app/api/books/[id]/generate/route.ts)
   - Extract manuscript chapters
   - Start audio generation job
   - Return updated book

5. **Add Progress Tracking** (lib/server/generation-progress-tracker.ts)
   - Track real progress, not simulated
   - Update reconcileProgress() to use tracker

6. **Update Player Component** (components/audio-player.tsx)
   - Load and display real audio URLs
   - Add error handling for failed chapters

7. **Test End-to-End**
   - Upload manuscript
   - Generate audiobook
   - Monitor progress
   - Play audio

---

## API Contracts

### POST /api/books/[id]/generate

**Before:**
```json
{
  "voiceId": "voice-1",
  "voiceName": "Sarah"
}
```

**After Response:**
```json
{
  "book": {
    "id": "book-123",
    "title": "...",
    "status": "processing",
    "progress": 0,
    "chaptersList": [
      {
        "id": "ch-1",
        "name": "Chapter 1: Introduction",
        "textContent": "Long chapter text...",
        "status": "pending",
        "audioUrl": null,
        "duration": null
      },
      // ... more chapters
    ]
  }
}
```

### GET /api/books/[id]

**After Response (During Generation):**
```json
{
  "id": "book-123",
  "status": "processing",
  "progress": 35,
  "chaptersList": [
    {
      "id": "ch-1",
      "name": "Chapter 1",
      "status": "completed",
      "audioUrl": "/audio/book-123-ch-1.wav",
      "duration": "8:32"
    },
    {
      "id": "ch-2",
      "name": "Chapter 2",
      "status": "completed",
      "audioUrl": "/audio/book-123-ch-2.wav",
      "duration": "7:45"
    },
    {
      "id": "ch-3",
      "name": "Chapter 3",
      "status": "processing",
      "audioUrl": null,
      "duration": null
    },
    {
      "id": "ch-4",
      "name": "Chapter 4",
      "status": "pending",
      "audioUrl": null,
      "duration": null
    }
  ]
}
```

---

## Error Handling

### Retry Strategy
```typescript
// If TTS generation fails for a chapter:
1. Retry up to 3 times with exponential backoff
2. Log error with chapter ID and text snippet
3. Mark chapter as failed if max retries exceeded
4. Continue with next chapter (don't block)
5. Return partial results to client
```

### Client-side Error Display
```typescript
{chapter.status === "failed" && (
  <Alert variant="destructive">
    Failed to generate audio for {chapter.name}
    <Button size="sm" onClick={() => retryChapter(chapter.id)}>
      Retry
    </Button>
  </Alert>
)}
```

---

## Performance Considerations

### Optimization 1: Parallel Chapter Processing
```typescript
// Generate up to 3 chapters in parallel
const parallelLimit = 3
for (let i = 0; i < chapters.length; i += parallelLimit) {
  const batch = chapters.slice(i, i + parallelLimit)
  await Promise.all(batch.map(ch => generateChapterAudio(ch)))
}
```

### Optimization 2: Streaming Updates
```typescript
// Don't wait for all chapters
// Update UI as each chapter completes
while (remainingChapters.length > 0) {
  const completed = await generateNextChapter()
  updateChapterMetadata(completed)
  notifyClient() // Update progress tracker
}
```

### Optimization 3: Caching
```typescript
// Don't regenerate if text hasn't changed
const textHash = sha256(chapterText)
const cached = await getCachedAudio(textHash)
if (cached) return cached.audioUrl
```

---

## Testing Strategy

### Unit Tests
- Extract chapters from different file formats
- TTS generation with various text lengths
- Progress calculation
- Audio metadata parsing

### Integration Tests
- Full upload → generate → play flow
- Error handling and retries
- Progress tracking accuracy
- File cleanup

### E2E Tests
- User uploads PDF
- Selects voice and generates
- Monitors progress in real-time
- Plays audiobook chapters in player
- Audio quality verification

---

## Rollout Plan

1. **Phase 1:** Deploy new data structures and services (no frontend changes)
2. **Phase 2:** Update generation endpoint with real TTS
3. **Phase 3:** Update player to display real audio
4. **Phase 4:** Monitor for errors and optimize
5. **Phase 5:** Remove simulated progress code

---

## Summary

The integration connects three main components:

1. **Input:** Uploaded manuscript file
2. **Processing:** Extract chapters → Generate audio via Piper TTS
3. **Output:** Real audio files playable in the player

This follows your existing patterns while adding real TTS capabilities to replace the current simulation.
