"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Plus,
  ArrowUpRight,
  Search,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/stats-cards";
import { BookCard } from "@/components/book-card";
import type { BookListItem } from "@/lib/audiobook-types";

export default function DashboardPage() {
  const [books, setBooks] = useState<BookListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let mounted = true;
    const loadBooks = async () => {
      try {
        const response = await fetch("/api/books", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (mounted) {
          setBooks(data.books ?? []);
          setError(null);
        }
      } catch {
        if (mounted) setError("Your library couldn’t load. Please try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadBooks();
    const interval = setInterval(loadBooks, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [retry]);
  async function handleDeleteBook(id: string) {
    const response = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (!response.ok)
      throw new Error("Couldn’t delete this audiobook. Please try again.");
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }
  const visible = books.filter(
    (b) =>
      (filter === "all" || b.status === filter) &&
      `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="studio-container">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">THE AUTHOR’S WORKSPACE</p>
        <Link
          href="/guide"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          A little guidance <ArrowUpRight className="ml-1 inline size-3" />
        </Link>
      </div>
      <section className="studio-hero">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-copy">
          <span className="hero-kicker">YOUR WORDS. A NEW WAY TO LISTEN.</span>
          <h1>
            Your next chapter,
            <br />
            <em>out loud.</em>
          </h1>
          <p>
            Turn the book you’ve written into an audiobook.
            <br className="hidden sm:block" /> A voice for every story, at no
            cost to you.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-5">
            <Button
              asChild
              size="lg"
              className="hero-create focus-visible:outline-2 focus-visible:outline-[#fff2db] focus-visible:outline-offset-4 focus-visible:ring-0"
            >
              <Link href="/upload">
                <Plus size={17} />
                Create an audiobook
              </Link>
            </Button>
            <Link
              href="/voices"
              className="hero-explore inline-flex items-center gap-2 text-sm font-medium"
            >
              Explore the voice <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hero-note">
            <span />
            No subscription. Just your story.
          </div>
        </div>
      </section>
      <StatsCards books={books} />
      <section className="mt-10" aria-labelledby="library-title">
        <div className="library-heading">
          <div>
            <h2
              id="library-title"
              className="text-xl font-semibold tracking-tight"
            >
              Your bookshelf
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Stories in the making, and ready to be heard.
            </p>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input
              aria-label="Search books by title or author"
              placeholder="Find a story…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        <div className="library-tabs" aria-label="Filter audiobooks">
          {[
            { id: "all", label: "All books" },
            { id: "completed", label: "Ready to listen" },
            { id: "processing", label: "In progress" },
            { id: "failed", label: "Needs attention" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? "active" : ""}
            >
              {f.label}
              <span>
                {
                  books.filter((b) => f.id === "all" || b.status === f.id)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
        {error ? (
          <div role="alert" className="empty-state">
            <p>{error}</p>
            <Button variant="outline" onClick={() => setRetry((r) => r + 1)}>
              <RefreshCw size={15} />
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Loading library"
            aria-busy="true"
          >
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : visible.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((book) => (
              <BookCard key={book.id} {...book} onDelete={handleDeleteBook} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpen size={30} className="text-primary" />
            <h3 className="font-serif text-2xl">
              {books.length
                ? "No matching stories"
                : "Your first audiobook starts here."}
            </h3>
            <p className="text-sm text-muted-foreground">
              {books.length
                ? "Try another title, author, or filter."
                : "Bring your manuscript. We’ll help give it a voice."}
            </p>
            <Button asChild variant="outline">
              <Link
                href={books.length ? "/" : "/upload"}
                onClick={(e) => {
                  if (books.length) {
                    e.preventDefault();
                    setQuery("");
                    setFilter("all");
                  }
                }}
              >
                {books.length ? "Clear filters" : "Upload your book"}
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        )}
      </section>
      <div className="studio-footer">
        <span>Written by you. Brought to life with Narrator.</span>
        <Link href="/guide">
          Manuscript to audiobook <ArrowUpRight size={12} />
        </Link>
      </div>
    </div>
  );
}
