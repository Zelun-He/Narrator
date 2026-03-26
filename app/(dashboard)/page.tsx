"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatsCards } from "@/components/stats-cards"
import { BookCard } from "@/components/book-card"
import { Card, CardContent } from "@/components/ui/card"
import type { BookListItem } from "@/lib/audiobook-types"

export default function DashboardPage() {
  const [books, setBooks] = useState<BookListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadBooks = async () => {
      try {
        const response = await fetch("/api/books", { cache: "no-store" })
        if (!response.ok) return
        const data = (await response.json()) as { books: BookListItem[] }
        if (mounted) {
          setBooks(data.books ?? [])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadBooks()
    const interval = setInterval(loadBooks, 5000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Your Audiobooks</h1>
          <p className="text-sm text-muted-foreground">
            Manage and monitor your AI-generated audiobooks.
          </p>
        </div>
        <Button asChild className="mt-3 sm:mt-0">
          <Link href="/upload">
            <Plus className="size-4" />
            Create New Audiobook
          </Link>
        </Button>
      </div>

      <StatsCards books={books} />

      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Recent Projects</h2>
        {loading ? (
          <Card className="saas-surface border-white/40">
            <CardContent className="py-8 text-sm text-muted-foreground">Loading audiobooks...</CardContent>
          </Card>
        ) : books.length === 0 ? (
          <Card className="saas-surface border-white/40">
            <CardContent className="py-8 text-sm text-muted-foreground">
              No audiobooks yet. Click "Create New Audiobook" to upload your first manuscript.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

