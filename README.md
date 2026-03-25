# Narrator - AI Audiobook Generator

Transform manuscripts into professional audiobooks with AI-powered narration.

## Project Overview

Narrator is a full-stack web application that converts written manuscripts (PDF, DOCX, TXT) into professionally narrated audiobooks using AI voice synthesis. The application provides a complete workflow from manuscript upload to audio playback with chapter navigation.

**Business Purpose**: Automate the audiobook creation process by eliminating the need to hire voice talent, book studio time, and perform manual post-production.

## Tech Stack

| Layer | Technology |
|-------|-------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI Components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS 4 |
| Form Handling | React Hook Form + Zod |
| Icons | Lucide React |
| Charts | Recharts |
| Storage | JSON file system (Node.js fs) |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                        │
│  Dashboard Layout → Upload → Voices → Processing → Player     │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Next.js API Routes)               │
│  /api/books → CRUD operations                                 │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (File System)                    │
│  data/books.json (metadata), data/uploads/ (manuscripts)     │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

- **Manuscript Upload**: Support for PDF, DOCX, and TXT files
- **AI Voice Selection**: Choose from 6 pre-defined AI voices with different accents and tones
- **Real-time Progress Tracking**: Live chapter-by-chapter generation progress
- **Audio Playback**: Built-in player with chapter navigation and playback controls
- **Download Options**: Export as MP3, M4B audiobook, or ZIP archive
- **Dashboard Analytics**: View statistics on all your audiobooks
- **Dark/Light Theme**: Toggle between themes

## Setup & Installation

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# or with npm
npm install
```

## How to Run

```bash
# Start development server
pnpm dev

# Build for production
npm run build

# Start production server
npm start
```

The application runs at `http://localhost:3000`.

## Folder Structure

```
Narrator/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard pages group
│   │   ├── page.tsx        # Main dashboard
│   │   ├── upload/         # Manuscript upload
│   │   ├── voices/         # Voice selection
│   │   ├── processing/     # Generation progress
│   │   └── player/        # Audio playback
│   └── api/               # API routes
│       └── books/         # Book endpoints
├── components/             # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Feature components
├── lib/                  # Core logic
│   ├── audiobook-types.ts  # TypeScript interfaces
│   ├── server/           # Server-side logic
│   │   └── audiobook-store.ts  # Data operations
│   └── utils.ts          # Utility functions
└── data/                 # Runtime data storage
    ├── books.json        # Book metadata
    └── uploads/          # Uploaded files
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/api/books` | List all books |
| POST | `/api/books` | Create new book |
| GET | `/api/books/[id]` | Get book details |
| POST | `/api/books/[id]/generate` | Start audio generation |
| GET | `/api/books/[id]/download` | Download audiobook files |

## User Flow

1. **Upload**: User uploads manuscript (PDF/DOCX/TXT) with title, author, and language
2. **Voice Selection**: User chooses an AI voice from the selection grid
3. **Processing**: System generates audiobook chapter-by-chapter with real-time progress
4. **Playback**: User can listen to the audiobook and download in various formats

## How to Test

1. Start the development server: `pnpm dev`
2. Open `http://localhost:3000`
3. Click "Create New Audiobook"
4. Fill in the form and upload a manuscript file
5. Select a voice and start generation
6. Wait for processing to complete
7. Test the audio player and download options

## Development Notes

- **Audio Generation**: Currently simulated based on elapsed time. To make it real, integrate an AI TTS service (ElevenLabs, PlayHT, Azure Speech) in the `startGeneration()` function in `lib/server/audiobook-store.ts`.
- **Storage**: Uses JSON file storage. For production, replace with a proper database (PostgreSQL, MongoDB).
- **Data Location**: Books are stored in `data/books.json`, uploads in `data/uploads/`.

## Contribution Guidelines

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests if applicable
4. Ensure code passes linting: `pnpm lint`
5. Commit your changes: `git commit -m "Add my feature"`
6. Push to the branch: `git push origin feature/my-feature`
7. Create a Pull Request

## License

Private - All rights reserved.
