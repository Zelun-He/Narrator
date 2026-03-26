import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import type { BookRecord, StoreData } from "../lib/server/store-types"

type StorageBackend = "json" | "sqlite"

interface MigrationConfig {
  from: StorageBackend
  to: StorageBackend
}

interface ValidationResult {
  sourceCount: number
  targetCount: number
  sourceIds: Set<string>
  targetIds: Set<string>
}

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "books.json")
const SQLITE_FILE = path.join(DATA_DIR, "books.sqlite")

function parseDirectionArg(raw: string | undefined, flag: "--from" | "--to"): StorageBackend {
  if (!raw) {
    throw new Error(`Missing ${flag} value. Use ${flag}=json or ${flag}=sqlite.`)
  }

  const normalized = raw.trim().toLowerCase()
  if (normalized === "json" || normalized === "sqlite") {
    return normalized
  }

  throw new Error(`Invalid ${flag} value: \"${raw}\". Use json or sqlite.`)
}

function parseArgs(argv: string[]): MigrationConfig {
  const argMap = new Map<string, string>()

  for (const arg of argv) {
    const [key, value] = arg.split("=", 2)
    if ((key === "--from" || key === "--to") && value) {
      argMap.set(key, value)
    }
  }

  const from = parseDirectionArg(argMap.get("--from"), "--from")
  const to = parseDirectionArg(argMap.get("--to"), "--to")

  if (from === to) {
    throw new Error("--from and --to must be different backends.")
  }

  return { from, to }
}

async function readJsonStore(): Promise<BookRecord[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8")
    const parsed = JSON.parse(raw) as Partial<StoreData>
    return Array.isArray(parsed.books) ? (parsed.books as BookRecord[]) : []
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }

    throw new Error(`Failed to read JSON store at ${STORE_FILE}.`)
  }
}

async function writeJsonStore(books: BookRecord[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true })
  const payload: StoreData = { books }
  await writeFile(STORE_FILE, JSON.stringify(payload, null, 2), "utf8")
}

async function withDb<T>(operation: (db: import("node:sqlite").DatabaseSync) => T): Promise<T> {
  await mkdir(DATA_DIR, { recursive: true })
  const { DatabaseSync } = await import("node:sqlite")
  const db = new DatabaseSync(SQLITE_FILE)

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `)

    return operation(db)
  } finally {
    db.close()
  }
}

async function readSqliteStore(): Promise<BookRecord[]> {
  return withDb((db) => {
    const stmt = db.prepare("SELECT payload FROM books ORDER BY created_at DESC")
    const rows = stmt.all() as Array<{ payload: string }>
    return rows.map((row) => JSON.parse(row.payload) as BookRecord)
  })
}

async function writeSqliteStore(books: BookRecord[]): Promise<void> {
  await withDb((db) => {
    const del = db.prepare("DELETE FROM books")
    del.run()

    const ins = db.prepare(`
      INSERT INTO books (id, payload, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)

    for (const book of books) {
      ins.run(book.id, JSON.stringify(book), book.createdAt, book.updatedAt)
    }
  })
}

async function readByBackend(backend: StorageBackend): Promise<BookRecord[]> {
  return backend === "json" ? readJsonStore() : readSqliteStore()
}

async function writeByBackend(backend: StorageBackend, books: BookRecord[]): Promise<void> {
  if (backend === "json") {
    await writeJsonStore(books)
    return
  }

  await writeSqliteStore(books)
}

function validateMigration(sourceBooks: BookRecord[], targetBooks: BookRecord[]): ValidationResult {
  const sourceIds = new Set(sourceBooks.map((book) => book.id))
  const targetIds = new Set(targetBooks.map((book) => book.id))

  return {
    sourceCount: sourceBooks.length,
    targetCount: targetBooks.length,
    sourceIds,
    targetIds,
  }
}

function printSummary(config: MigrationConfig, validation: ValidationResult): void {
  const missingInTarget = [...validation.sourceIds].filter((id) => !validation.targetIds.has(id))
  const extraInTarget = [...validation.targetIds].filter((id) => !validation.sourceIds.has(id))

  const valid =
    validation.sourceCount === validation.targetCount &&
    missingInTarget.length === 0 &&
    extraInTarget.length === 0

  console.log(`Migration ${config.from} -> ${config.to}`)
  console.log(`Records: source=${validation.sourceCount}, target=${validation.targetCount}`)
  console.log(`ID validation: ${valid ? "PASS" : "FAIL"}`)

  if (!valid) {
    if (missingInTarget.length > 0) {
      console.log(`Missing IDs in target (${missingInTarget.length}): ${missingInTarget.join(", ")}`)
    }

    if (extraInTarget.length > 0) {
      console.log(`Extra IDs in target (${extraInTarget.length}): ${extraInTarget.join(", ")}`)
    }

    process.exitCode = 1
  }
}

async function run(): Promise<void> {
  const config = parseArgs(process.argv.slice(2))
  const sourceBooks = await readByBackend(config.from)

  await writeByBackend(config.to, sourceBooks)

  const targetBooks = await readByBackend(config.to)
  const validation = validateMigration(sourceBooks, targetBooks)
  printSummary(config, validation)
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Migration failed: ${message}`)
  process.exit(1)
})
