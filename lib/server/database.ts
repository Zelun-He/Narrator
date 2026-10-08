import Database from "better-sqlite3";
import { chmodSync } from "node:fs";
import { DATABASE_FILE, ensurePrivateDirectories } from "./runtime";

const state = globalThis as typeof globalThis & {
  narratorDatabase?: Database.Database;
};

export function getDatabase() {
  if (state.narratorDatabase) return state.narratorDatabase;
  ensurePrivateDirectories();
  const db = new Database(DATABASE_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      title TEXT NOT NULL, author TEXT NOT NULL, language TEXT NOT NULL,
      file_name TEXT NOT NULL, stored_file_name TEXT NOT NULL,
      file_type TEXT NOT NULL, file_size INTEGER NOT NULL,
      cover_color TEXT NOT NULL, voice_id TEXT NOT NULL, voice_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('processing','completed','failed')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      error TEXT, mp3_path TEXT, mp3_size INTEGER,
      request_key TEXT NOT NULL, fingerprint TEXT NOT NULL,
      UNIQUE(owner_id, request_key)
    );
    CREATE INDEX IF NOT EXISTS books_owner ON books(owner_id, created_at);
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_index INTEGER NOT NULL, name TEXT NOT NULL, text_content TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending','processing','completed','failed')),
      duration_seconds REAL, audio_path TEXT, audio_size INTEGER, error TEXT,
      UNIQUE(book_id, chapter_index)
    );
    CREATE TABLE IF NOT EXISTS jobs (
      book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('queued','processing','completed','failed')),
      requested_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      lease_token TEXT, lease_until INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS jobs_queue ON jobs(status, requested_at);
    CREATE TABLE IF NOT EXISTS worker_heartbeat (id TEXT PRIMARY KEY, last_seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS usage_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS request_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      state TEXT NOT NULL CHECK(state IN ('queued','processing','completed','failed')),
      attempt INTEGER NOT NULL,
      recorded_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS request_events_book ON request_events(book_id, id);
    -- Backfill a snapshot for existing books without inventing earlier transitions.
    INSERT INTO request_events(book_id,state,attempt,recorded_at)
      SELECT book_id,status,attempts,requested_at FROM jobs
      WHERE NOT EXISTS (SELECT 1 FROM request_events WHERE request_events.book_id=jobs.book_id);
    CREATE TRIGGER IF NOT EXISTS request_job_created AFTER INSERT ON jobs BEGIN
      INSERT INTO request_events(book_id,state,attempt,recorded_at)
      VALUES (NEW.book_id,NEW.status,NEW.attempts,CAST(strftime('%s','now') AS INTEGER)*1000);
    END;
    CREATE TRIGGER IF NOT EXISTS request_job_changed AFTER UPDATE ON jobs
      WHEN OLD.status != NEW.status OR OLD.attempts != NEW.attempts BEGIN
      INSERT INTO request_events(book_id,state,attempt,recorded_at)
      VALUES (NEW.book_id,NEW.status,NEW.attempts,CAST(strftime('%s','now') AS INTEGER)*1000);
    END;
  `);
  chmodSync(DATABASE_FILE, 0o600);
  state.narratorDatabase = db;
  return db;
}
