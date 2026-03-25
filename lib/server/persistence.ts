import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { BookRecord, StoreData } from "@/lib/server/store-types"

const DATA_DIR = path.join(process.cwd(), "data")
const STORE_FILE = path.join(DATA_DIR, "books.json")
const SQLITE_FILE = path.join(DATA_DIR, "books.sqlite")

interface StoreAdapter {
  listBooks(): Promise<BookRecord[]>
  getBook(bookId: string): Promise<BookRecord | null>
  saveBook(book: BookRecord): Promise<void>
  saveBooks(books: BookRecord[]): Promise<void>
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

class JsonStoreAdapter implements StoreAdapter {
  private async ensureStore() {
    await ensureDataDir()

    try {
      await readFile(STORE_FILE, "utf8")
    } catch {
      const initial: StoreData = { books: [] }
      await writeFile(STORE_FILE, JSON.stringify(initial, null, 2), "utf8")
    }
  }

  private async readStore(): Promise<StoreData> {
    await this.ensureStore()
    const raw = await readFile(STORE_FILE, "utf8")

    try {
      const parsed = JSON.parse(raw) as Partial<StoreData>
      return {
        books: Array.isArray(parsed.books) ? parsed.books : [],
      }
    } catch {
      return { books: [] }
    }
  }

  private async writeStore(data: StoreData) {
    await writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8")
  }

  async listBooks(): Promise<BookRecord[]> {
    const store = await this.readStore()
    return store.books
  }

  async getBook(bookId: string): Promise<BookRecord | null> {
    const store = await this.readStore()
    return store.books.find((book) => book.id === bookId) ?? null
  }

  async saveBook(book: BookRecord): Promise<void> {
    const store = await this.readStore()
    const index = store.books.findIndex((entry) => entry.id === book.id)

    if (index >= 0) {
      store.books[index] = book
    } else {
      store.books.push(book)
    }

    await this.writeStore(store)
  }

  async saveBooks(books: BookRecord[]): Promise<void> {
    await this.writeStore({ books })
  }
}

class SqliteStoreAdapter implements StoreAdapter {
  private async withDb<T>(operation: (db: import("node:sqlite").DatabaseSync) => T): Promise<T> {
    await ensureDataDir()
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

  private rowToBook(row: { payload: string }): BookRecord {
    return JSON.parse(row.payload) as BookRecord
  }

  async listBooks(): Promise<BookRecord[]> {
    return this.withDb((db) => {
      const stmt = db.prepare("SELECT payload FROM books ORDER BY created_at DESC")
      const rows = stmt.all() as Array<{ payload: string }>
      return rows.map((row) => this.rowToBook(row))
    })
  }

  async getBook(bookId: string): Promise<BookRecord | null> {
    return this.withDb((db) => {
      const stmt = db.prepare("SELECT payload FROM books WHERE id = ?")
      const row = stmt.get(bookId) as { payload: string } | undefined
      return row ? this.rowToBook(row) : null
    })
  }

  async saveBook(book: BookRecord): Promise<void> {
    await this.withDb((db) => {
      const stmt = db.prepare(`
        INSERT INTO books (id, payload, created_at, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          payload = excluded.payload,
          updated_at = excluded.updated_at
      `)

      stmt.run(book.id, JSON.stringify(book), book.createdAt, book.updatedAt)
    })
  }

  async saveBooks(books: BookRecord[]): Promise<void> {
    await this.withDb((db) => {
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
}

function resolveAdapter(): StoreAdapter {
  const backend = (process.env.NARRATOR_STORAGE_BACKEND ?? "json").toLowerCase()
  if (backend === "sqlite") {
    return new SqliteStoreAdapter()
  }

  return new JsonStoreAdapter()
}

export const storeAdapter = resolveAdapter()
