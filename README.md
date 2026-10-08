# Narrator

A free, self-hosted author studio: create an account, upload your manuscript, and turn it into an audiobook. The storybook interface includes a private bookshelf, narrator preview, chapter progress and a listening room. There are no paid TTS APIs or subscriptions.

## Preview without the backend

On `/login`, enter **testuser** and **123456** to open the public demo studio at `/demo/library`. This works without SQLite, a worker, or an authentication secret, including on Vercel. The preview uses fictional sample books and the public voice sample. It does not create an author account or session, call private APIs, grant administrator access, accept manuscripts, or save changes. All real author routes still require their normal authenticated session.

## Run with Docker

Install Docker with Compose, then:

```bash
docker compose up --build -d
```

Open **http://localhost:3000**. Create an account, upload TXT, DOCX or a text-based PDF, review the narrator and select **Create my audiobook**. Uploading automatically queues narration. The worker writes real WAV chapters and combines them into a downloadable MP3. Completed books also export a ZIP of chapter WAVs.

The first build downloads a verified 64 MB English voice model and installs Python/Piper. Allow at least 2 GB RAM, several GB of disk space and CPU time; book-length narration can take a while. Audio is generated locally. Authors may close their browser while the worker continues.

For a public server, set `BETTER_AUTH_URL` to your exact HTTPS origin before starting Compose, and put the web service behind an HTTPS reverse proxy with an 11 MB request-body limit. The default persistent volume stores accounts, sessions, manuscripts, audio and an automatically generated authentication secret. Do not delete the volume or change the secret unless you intend to invalidate sessions. Hosting and compute remain the operator’s responsibility; the software and narration engine require no paid service.

```bash
BETTER_AUTH_URL=https://your-domain.example docker compose up --build -d
docker compose logs -f worker
```

## Local development

Requires Node 24, Python 3.10+ and FFmpeg available on PATH. Run from the repository root:

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/setup-narration.py
cp .env.example .env.local
npm run dev
```

`npm run dev` starts both the web app and narration worker. For web-only UI or account development, use `npm run dev:web`; run a worker separately only with the web-only command:

```bash
npm run worker
```

On Windows use `.venv\Scripts\python.exe` for Python commands. The worker loads `.env.local` using Next.js environment loading. `NARRATOR_PYTHON` and `NARRATOR_FFMPEG` can override executable paths. The checked-in historical Windows binaries are no longer used.

For a local production run, use `npm run build` then `npm start`. This checks the narration runtime, starts the web server, migrates the database, then starts the worker once the server is healthy. A process failure stops the other process; interrupting the command shuts down both. For separately supervised services use `npm run start:web` and `NODE_ENV=production npm run worker`. Docker Compose already supervises them separately. Both processes must share `NARRATOR_DATA_DIR` (default `data/private`) and the same model directory. SQLite and files require a persistent local disk; this complete backend cannot run inside an ephemeral Vercel/serverless function. Do not place private data under `public/`.

## Accounts and saved requests

Accounts, password hashes, revocable sessions, manuscripts, jobs and request history live in **your own SQLite database** at `NARRATOR_DATA_DIR/narrator.sqlite`. No hosted authentication account, paid database or API key is required. The authentication secret is generated once and stored alongside it. Keep the directory on a persistent disk or the Compose volume.

- **Your account** (`/account`): update the display name, change the password using the current password, or log out other devices. Password changes revoke other sessions.
- **Request history** (`/requests`): searchable, paginated narration events, including queue entry, each worker attempt, retries, failures and completion. Database triggers save transitions in the same transaction as each job change, including worker recovery. Events survive browser/server restarts and are visible only to the book owner. Deleting a book removes its history with its manuscript. Existing books receive one current-state snapshot when upgraded.
- **Manage accounts** (`/admin`): an operator can search accounts, see book/session counts, suspend/restore access and revoke sessions. Suspensions revoke sessions and block sign-in, while retaining books. Ordinary authors cannot access the operator page or API. The operator does not get access to manuscript contents through this page.

Create your own account through `/signup`, then grant operator access **on the server**:

```bash
npm run accounts -- promote your-email@example.com
npm run accounts -- list
npm run accounts -- status
```

With Docker, use `docker compose exec web npm run accounts -- promote your-email@example.com`. Sign in again, then open **Manage accounts**. Public signup always creates an author; nobody is made administrator automatically. Role changes revoke the user's sessions. `npm run accounts -- demote EMAIL` removes operator access and refuses to remove the last active administrator. Password reset by email is not configured; authors can change their password while signed in. Account-management APIs deliberately disallow deleting accounts, changing roles or impersonating authors.

The combined local launcher binds to `127.0.0.1` by default. Set `NARRATOR_HOST=0.0.0.0` for access from another machine or a container. Use an exact matching `BETTER_AUTH_URL` when changing the public hostname or port. Docker's web-only command already listens on the container interface.

## Author experience

1. **Create an account or log in.** Email/password login uses Better Auth, hashed passwords and revocable, HTTP-only sessions. Manage your name, password and other signed-in devices in **Your account**. Email verification and email-based password recovery are not configured.
2. **Upload and review.** English TXT, DOCX and text-based PDF are supported, up to 10 MB / 100,000 words / 200 chapters. Scanned PDFs require OCR before upload. Chapter/Part/Section headings are retained; manuscripts without headings are split at paragraph boundaries.
3. **Create.** A persisted queue starts automatically. Progress advances only when chapter audio has been produced and saved. The interface identifies an offline worker, and a failed job can be retried without re-uploading or repeating completed chapters.
4. **Listen and download.** Chapter WAV playback supports HTTP Range requests for seeking. Completed books provide an actual MP3 and a ZIP containing numbered WAV chapters.
5. **Manage the library.** Books, progress, audio, downloads and deletion belong to the signed-in author. Another account receives 404 for every book endpoint. Deletion removes the saved manuscript and generated files. Active narration must finish before deletion.

Uploads are limited to two active books per account and ten upload attempts per hour. Auth attempts are rate-limited in SQLite. The default voice is **LJ**, trained on the public-domain LJ Speech dataset. Only this English voice is available; the other landing-page cast members remain labeled concepts.

## Architecture

- Next.js 16 / React 19 and a server-validated protected dashboard.
- Better Auth email/password accounts and sessions in SQLite, with secure cookies on HTTPS and origin checks on mutations.
- `lib/server/audiobook-store.ts`: account ownership, normalized books/chapters/jobs, transactional queuing and upload idempotency.
- `scripts/extract-manuscript.py`: bounded DOCX and PDF parsing; UTF-8 TXT parsing runs in Node.
- `scripts/narration-worker.ts`: sequential CPU narration, renewable leases, fencing tokens, persisted chapter results and crash recovery.
- `scripts/synthesize.py`: Piper synthesis in bounded text chunks, writing WAV incrementally.
- FFmpeg creates the full MP3 after all chapters finish; streaming ZIP export avoids loading the book into memory.
- Private audio is served through authenticated routes, never from `public/audio`. Legacy global TTS/file-management endpoints return 410, and old public audio URLs return 404. Public narrator samples live separately under `public/samples`.

A worker that crashes resumes after its 30-second lease expires. Completed chapters are reused; three consecutive crash attempts stop the job for an explicit author retry. Transient synthesis failures are shown immediately, with completed chapters preserved. Run one web process and one worker per shared local volume. Horizontal scaling across machines requires a shared database/object store and a different queue.

Historical anonymous JSON/SQLite books and public audio are not automatically assigned to an account. They remain untouched for manual migration; exposing them to every new user would violate library privacy. Existing architecture/integration documents describe the previous implementation and are historical.

## Validation

```bash
npm run typecheck
npm run build
npm run test:backend
npm run test:accounts
npm run test:demo # requires Playwright and Chromium
```

The backend integration suite launches an isolated production server and real worker, creates two accounts, and checks ownership, CSRF, upload limits, TXT/DOCX/PDF extraction, actual Piper WAVs, MP3/ZIP validity, Range playback, idempotent uploads, deletion, session revocation, server restarts and worker crash recovery. Install narration dependencies and download the model first. Test data is temporary and removed after the suite.

Optional browser verification requires Playwright and Chromium. Set `NARRATOR_BROWSER_TESTS=1` when running the suite. `NARRATOR_CHROMIUM_PATH`, `NARRATOR_PLAYWRIGHT_IMPORT` and `NARRATOR_AXE_IMPORT` support installed browser runtimes. It exercises signup → upload → generated audio → playback/download → logout/login in a mobile viewport.

`test:accounts` upgrades a pre-existing account database, starts the complete web/worker stack, tests operator permissions and role forgery, changes passwords, suspends/restores accounts, revokes devices, generates a real MP3, and checks private request history and sessions after restarting both processes. With browser verification enabled it also checks mobile hero centering, author profile updates, the history link and operator actions with Axe accessibility checks.

Back up the entire private data directory with web and worker stopped, including `auth-secret` and SQLite WAL files. Restore onto a persistent volume with matching ownership. Never commit author data, credentials or generated book audio.

## Licensing

The Python narration dependency `piper-tts` is GPL-3.0; preserve its license and corresponding-source obligations when redistributing the Docker image. The LJ voice uses the public-domain LJ Speech dataset; model information is downloaded with the model. See `docs/NARRATION_LICENSES.md` for upstream links. Self-hosted UI fonts retain their OFL licenses.
