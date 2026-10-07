"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Play, Download, ArrowRight, Headphones, Loader2 } from "lucide-react";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import {
  BookCover,
  LibraryLink,
  PageHeading,
} from "@/components/studio-elements";
import { cn } from "@/lib/utils";
import type { BookDetails } from "@/lib/audiobook-types";
function ListeningRoom() {
  const bookId = useSearchParams().get("bookId");
  const [book, setBook] = useState<BookDetails | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }
    let active = true;
    async function load() {
      try {
        const r = await fetch(`/api/books/${bookId}`, { cache: "no-store" });
        if (!r.ok)
          throw new Error(
            "This audiobook couldn’t load. Please open it again from your library.",
          );
        const d = await r.json();
        if (active) {
          setBook(d.book);
          setChapterId(
            d.book.chaptersList.find((c: { audioUrl?: string }) => c.audioUrl)
              ?.id ?? null,
          );
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Connection interrupted. Please try again.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [bookId]);
  const available = book?.chaptersList.filter((c) => c.audioUrl) ?? [];
  const chapter = available.find((c) => c.id === chapterId);
  const index = available.findIndex((c) => c.id === chapterId);
  return (
    <div className="studio-container studio-container-narrow">
      <LibraryLink />
      <PageHeading
        eyebrow="THE LISTENING ROOM"
        title={book?.title ?? "Make time for a story."}
        description={
          book
            ? `By ${book.author} · Narrated by ${book.voiceName?.replace(" (Default)", "") ?? "your narrator"}`
            : "Listen to your audiobook and keep the chapters you’ve created."
        }
      />
      {error ? (
        <div role="alert" className="empty-state">
          <p>{error}</p>
          <Button asChild variant="outline">
            <Link href="/library">Return to library</Link>
          </Button>
        </div>
      ) : loading ? (
        <div className="studio-panel flex items-center gap-3">
          <Loader2 size={18} className="animate-spin" />
          Opening your audiobook…
        </div>
      ) : !book ? (
        <div className="empty-state">
          <Headphones size={30} />
          <h2 className="font-serif text-2xl">Find your next listen.</h2>
          <p className="text-sm text-muted-foreground">
            Choose an audiobook from your bookshelf.
          </p>
          <Button asChild>
            <Link href="/library">
              Browse your library
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <div className="flex min-h-64 items-center justify-center rounded-xl bg-secondary py-8">
              <BookCover
                title={book.title}
                author={book.author}
                color={book.coverColor}
                decorative
              />
            </div>
            <AudioPlayer
              key={chapter?.id ?? "empty"}
              title={book.title}
              chapter={chapter?.name ?? "No audio available"}
              audioUrl={chapter?.audioUrl}
              duration={chapter?.duration ?? undefined}
              onPrevious={
                index > 0
                  ? () => setChapterId(available[index - 1].id)
                  : undefined
              }
              onNext={
                index >= 0 && index < available.length - 1
                  ? () => setChapterId(available[index + 1].id)
                  : undefined
              }
            />
          </div>
          <div>
            <section className="studio-panel">
              <div className="flex items-center justify-between gap-3">
                <h2 className="panel-title">Contents</h2>
                <span className="text-xs text-muted-foreground">
                  {available.length} of {book.chaptersList.length} ready
                </span>
              </div>
              <p className="panel-description">
                Choose a chapter, then press play in the player.
              </p>
              <div className="mt-5 divide-y">
                {book.chaptersList.map((c, i) => (
                  <div
                    key={c.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg py-2",
                      c.id === chapterId && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      disabled={!c.audioUrl}
                      onClick={() => setChapterId(c.id)}
                      aria-pressed={chapterId === c.id}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="w-5 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-full",
                          c.id === chapterId
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Play size={11} />
                      </span>
                      <span className="min-w-0 flex-1 text-sm">{c.name}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {c.audioUrl ? (c.duration ?? "Ready") : "Not ready"}
                      </span>
                    </button>
                    {c.audioUrl && (
                      <a
                        href={c.audioUrl}
                        download={`${book.title}-${i + 1}.wav`}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-primary"
                        aria-label={`Download ${c.name} as WAV`}
                      >
                        <Download size={16} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
              {!available.length && (
                <p className="mt-4 text-sm text-muted-foreground">
                  There’s no playable audio yet. Return to narration to check
                  your progress.
                </p>
              )}
            </section>
            <section className="mt-6 rounded-xl border border-dashed p-5">
              <div className="flex gap-3">
                <Download size={18} className="shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-medium">Keep your chapters</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Download available WAV audio using the arrow beside each
                    chapter. MP3 and M4B exports aren’t available yet.
                  </p>
                </div>
              </div>
            </section>
            <Button asChild variant="outline" className="mt-5">
              <Link href={`/processing?bookId=${book.id}`}>
                View narration progress
                <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function PlayerPage() {
  return (
    <Suspense
      fallback={<div className="studio-container">Loading listening room…</div>}
    >
      <ListeningRoom />
    </Suspense>
  );
}
