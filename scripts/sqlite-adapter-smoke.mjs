import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const DATA_DIR = path.join(process.cwd(), "data")
const SMOKE_DB_FILE = path.join(DATA_DIR, "books.sqlite.smoke")
const INSERT_BATCH_SIZE = 100
const ITERATIONS = 75
const BOOKS_PER_ITERATION = 40

function buildBook(iteration, index) {
  const ts = new Date(Date.now() + iteration * 1000 + index).toISOString()

  return {
    id: `book-${iteration}-${index}`,
    title: `Smoke Book ${iteration}-${index}`,
    author: "Smoke Author",
    language: "en",
    fileName: `smoke-${iteration}-${index}.txt`,
    storedFileName: `smoke-${iteration}-${index}.txt`,
    fileType: "text/plain",
    fileSize: 128,
    status: "processing",
    progress: Math.min(100, iteration + index),
    coverColor: "#4ECDC4",
    chaptersList: [],
    voiceName: "Alloy",
    generationStartedAt: ts,
    createdAt: ts,
    updatedAt: ts,
  }
}

function configureDb(db) {
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA busy_timeout = 5000")
  db.exec("PRAGMA synchronous = NORMAL")
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
}

function saveBooks(db, books) {
  db.exec("BEGIN IMMEDIATE")
  try {
    db.prepare("DELETE FROM books").run()
    const insertStmt = db.prepare(`
      INSERT INTO books (id, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)

    for (let i = 0; i < books.length; i += INSERT_BATCH_SIZE) {
      const batch = books.slice(i, i + INSERT_BATCH_SIZE)
      for (const book of batch) {
        insertStmt.run(book.id, JSON.stringify(book), book.createdAt, book.updatedAt)
      }
    }

    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
}

function verifyBooks(db, expectedBooks) {
  const rows = db
    .prepare("SELECT id, payload FROM books ORDER BY id")
    .all()
  const ids = rows.map((row) => row.id)
  const expectedIds = expectedBooks.map((book) => book.id).sort()

  if (ids.length !== expectedBooks.length) {
    throw new Error(`Expected ${expectedBooks.length} rows, got ${ids.length}`)
  }

  for (let i = 0; i < expectedIds.length; i += 1) {
    if (ids[i] !== expectedIds[i]) {
      throw new Error(`ID mismatch at ${i}: expected ${expectedIds[i]}, got ${ids[i]}`)
    }
  }

  for (const row of rows) {
    const parsed = JSON.parse(row.payload)
    if (typeof parsed.id !== "string" || !parsed.id) {
      throw new Error(`Invalid payload for row ${row.id}`)
    }
  }
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true })
  await rm(SMOKE_DB_FILE, { force: true })

  const db = new DatabaseSync(SMOKE_DB_FILE)
  try {
    configureDb(db)

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      const books = Array.from({ length: BOOKS_PER_ITERATION }, (_, index) => buildBook(iteration, index))
      saveBooks(db, books)
      verifyBooks(db, books)
    }

    console.log(`SQLite adapter smoke check passed (${ITERATIONS} iterations).`)
  } finally {
    db.close()
    await rm(SMOKE_DB_FILE, { force: true })
  }
}

main().catch((error) => {
  console.error("SQLite adapter smoke check failed.")
  console.error(error)
  process.exitCode = 1
})
