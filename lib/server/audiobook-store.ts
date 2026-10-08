import { randomUUID, createHash } from "node:crypto";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { getDatabase } from "./database";
import { ApiError } from "./errors";
import { AUDIO_DIR, UPLOADS_DIR, MAX_ACTIVE_BOOKS } from "./runtime";
import { parseManuscript } from "./manuscript-processor";
import type {
  BookDetails,
  BookListItem,
  ChapterStatus,
  BookStatus,
} from "@/lib/audiobook-types";

export interface BookRow {
  id: string;
  owner_id: string;
  title: string;
  author: string;
  language: string;
  status: BookStatus;
  cover_color: string;
  created_at: string;
  voice_id: string;
  voice_name: string;
  error: string | null;
  mp3_path: string | null;
  stored_file_name: string;
  request_key: string;
  fingerprint: string;
}
export interface ChapterRow {
  id: string;
  book_id: string;
  chapter_index: number;
  name: string;
  text_content: string;
  status: ChapterStatus;
  duration_seconds: number | null;
  audio_path: string | null;
  audio_size: number | null;
  error: string | null;
}
export function ownedBook(ownerId: string, id: string): BookRow {
  const book = getDatabase()
    .prepare("SELECT * FROM books WHERE id=? AND owner_id=?")
    .get(id, ownerId) as BookRow | undefined;
  if (!book) throw new ApiError(404, "Audiobook not found.");
  return book;
}
export function chapterRows(id: string) {
  return getDatabase()
    .prepare("SELECT * FROM chapters WHERE book_id=? ORDER BY chapter_index")
    .all(id) as ChapterRow[];
}
function details(row: BookRow): BookDetails {
  const chapters = chapterRows(row.id);
  const job = getDatabase()
    .prepare("SELECT status FROM jobs WHERE book_id=?")
    .get(row.id) as { status: BookDetails["jobState"] } | undefined;
  const heartbeat = getDatabase()
    .prepare("SELECT MAX(last_seen) AS time FROM worker_heartbeat")
    .get() as { time: number | null };
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    language: row.language,
    status: row.status,
    chapters: chapters.length,
    progress:
      row.status === "completed"
        ? 100
        : Math.floor(
            (chapters.filter((c) => c.status === "completed").length /
              chapters.length) *
              95,
          ),
    coverColor: row.cover_color,
    createdAt: row.created_at,
    voiceId: row.voice_id,
    voiceName: row.voice_name,
    jobState: job?.status,
    generationError: row.error ?? undefined,
    workerAvailable: Boolean(
      heartbeat.time && heartbeat.time > Date.now() - 30_000,
    ),
    downloadUrl: row.mp3_path
      ? `/api/books/${row.id}/download?format=mp3`
      : undefined,
    chaptersList: chapters.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      duration:
        c.duration_seconds === null
          ? null
          : `${Math.floor(c.duration_seconds / 60)}:${String(Math.floor(c.duration_seconds % 60)).padStart(2, "0")}`,
      audioUrl: c.audio_path
        ? `/api/books/${row.id}/chapters/${c.id}/audio`
        : undefined,
      audioSize: c.audio_size ?? undefined,
      generationError: c.error ?? undefined,
    })),
  };
}
export function getBookDetails(ownerId: string, id: string) {
  return details(ownedBook(ownerId, id));
}
export function listBooks(ownerId: string): BookListItem[] {
  return (
    getDatabase()
      .prepare("SELECT * FROM books WHERE owner_id=? ORDER BY created_at DESC")
      .all(ownerId) as BookRow[]
  ).map((row) => {
    const { chaptersList: _chapters, ...book } = details(row);
    return book;
  });
}
function checkActive(ownerId: string) {
  const active = getDatabase()
    .prepare(
      "SELECT COUNT(*) AS total FROM books WHERE owner_id=? AND status='processing'",
    )
    .get(ownerId) as { total: number };
  if (active.total >= MAX_ACTIVE_BOOKS)
    throw new ApiError(
      429,
      "You already have two audiobooks in progress. Please wait for one to finish.",
    );
}
export async function createBook(input: {
  ownerId: string;
  title: string;
  author: string;
  language: string;
  file: File;
  voiceId: string;
  voiceName: string;
  requestKey: string;
}) {
  const db = getDatabase();
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const fingerprint = createHash("sha256")
    .update(bytes)
    .update(
      JSON.stringify([
        input.title,
        input.author,
        input.language,
        input.voiceId,
      ]),
    )
    .digest("hex");
  function existing() {
    const row = db
      .prepare("SELECT * FROM books WHERE owner_id=? AND request_key=?")
      .get(input.ownerId, input.requestKey) as BookRow | undefined;
    if (row && row.fingerprint !== fingerprint)
      throw new ApiError(
        409,
        "This upload request was already used for a different manuscript. Please start a new upload.",
      );
    return row;
  }
  const previous = existing();
  if (previous) return details(previous);
  checkActive(input.ownerId);
  const id = randomUUID();
  const storedName = `${id}${path.extname(input.file.name).toLowerCase()}`;
  const source = path.join(UPLOADS_DIR, storedName);
  await writeFile(source, bytes, { mode: 0o600 });
  try {
    const parsed = await parseManuscript(source, input.file.name);
    const result = db
      .transaction(() => {
        const duplicate = existing();
        if (duplicate) return duplicate.id;
        checkActive(input.ownerId);
        const now = new Date().toISOString();
        db.prepare(
          `INSERT INTO books (id,owner_id,title,author,language,file_name,stored_file_name,file_type,file_size,cover_color,voice_id,voice_name,status,created_at,updated_at,request_key,fingerprint)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'processing',?,?,?,?)`,
        ).run(
          id,
          input.ownerId,
          input.title,
          input.author,
          input.language,
          path.basename(input.file.name),
          storedName,
          path.extname(storedName),
          bytes.length,
          ["#4ECDC4", "#FF6B6B", "#0EA5E9", "#F59E0B"][
            parseInt(fingerprint.slice(0, 2), 16) % 4
          ],
          input.voiceId,
          input.voiceName,
          now,
          now,
          input.requestKey,
          fingerprint,
        );
        const insert = db.prepare(
          "INSERT INTO chapters (id,book_id,chapter_index,name,text_content,status) VALUES (?,?,?,?,?,'pending')",
        );
        parsed.chapters.forEach((chapter, i) =>
          insert.run(randomUUID(), id, i, chapter.name, chapter.content),
        );
        db.prepare(
          "INSERT INTO jobs (book_id,status,requested_at) VALUES (?,'queued',?)",
        ).run(id, Date.now());
        return id;
      })
      .immediate();
    if (result !== id) await rm(source, { force: true });
    return getBookDetails(input.ownerId, result);
  } catch (error) {
    await rm(source, { force: true });
    throw error;
  }
}
export function startGeneration(ownerId: string, id: string) {
  getDatabase()
    .transaction(() => {
      const book = ownedBook(ownerId, id);
      if (book.status !== "failed") return;
      checkActive(ownerId);
      getDatabase()
        .prepare(
          "UPDATE books SET status='processing', error=NULL, updated_at=? WHERE id=?",
        )
        .run(new Date().toISOString(), id);
      getDatabase()
        .prepare(
          "UPDATE chapters SET status='pending',error=NULL WHERE book_id=? AND status!='completed'",
        )
        .run(id);
      getDatabase()
        .prepare(
          "UPDATE jobs SET status='queued',attempts=0,lease_token=NULL,lease_until=0,requested_at=? WHERE book_id=?",
        )
        .run(Date.now(), id);
    })
    .immediate();
  return getBookDetails(ownerId, id);
}
export async function deleteBook(ownerId: string, id: string) {
  const book = ownedBook(ownerId, id);
  // Active jobs own their temporary files; deleting while narration runs is intentionally blocked.
  if (book.status === "processing")
    throw new ApiError(
      409,
      "Please wait for narration to finish before deleting this audiobook.",
    );
  getDatabase()
    .prepare("DELETE FROM books WHERE id=? AND owner_id=?")
    .run(id, ownerId);
  await Promise.all([
    rm(path.join(UPLOADS_DIR, book.stored_file_name), { force: true }),
    rm(path.join(AUDIO_DIR, id), { recursive: true, force: true }),
  ]);
}
