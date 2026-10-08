"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Loader2,
  ArrowRight,
  AlertTriangle,
  AudioLines,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CreationSteps,
  LibraryLink,
  PageHeading,
} from "@/components/studio-elements";
import type { BookDetails, ChapterStatus } from "@/lib/audiobook-types";
function StatusIcon({ status }: { status: ChapterStatus }) {
  return status === "completed" ? (
    <CheckCircle2 size={17} className="text-primary" />
  ) : status === "processing" ? (
    <Loader2 size={17} className="animate-spin text-primary" />
  ) : status === "failed" ? (
    <AlertTriangle size={17} className="text-destructive" />
  ) : (
    <Circle size={17} className="text-muted-foreground/40" />
  );
}
function ProcessingContent() {
  const bookId = useSearchParams().get("bookId");
  const [book, setBook] = useState<BookDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!bookId) {
      setLoading(false);
      return;
    }
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const r = await fetch(`/api/books/${bookId}`, { cache: "no-store" });
        if (!r.ok)
          throw new Error(
            r.status === 404
              ? "This audiobook couldn’t be found."
              : "Progress couldn’t load. Please try again.",
          );
        const d = await r.json();
        if (active) {
          setBook(d.book);
          setError(null);
          if (d.book.status === "processing") timer = setTimeout(load, 2000);
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
      clearTimeout(timer);
    };
  }, [bookId, retry]);
  const chapters = book?.chaptersList ?? [];
  const ready = chapters.filter((c) => Boolean(c.audioUrl)).length;
  const complete = book?.status === "completed";
  const failed = book?.status === "failed";
  const completed = chapters.filter((c) => c.status === "completed").length;
  return (
    <div className="studio-container studio-container-narrow">
      <LibraryLink />
      <PageHeading
        eyebrow="THE NEXT CHAPTER"
        title={
          failed
            ? "Let’s try that again."
            : complete
              ? "Your narration results."
              : "Your words are finding a voice."
        }
        description={
          book
            ? `“${book.title}” by ${book.author}. Follow your story, one chapter at a time.`
            : "Follow your audiobook’s narration progress here."
        }
      />
      <CreationSteps current={3} />
      {!bookId ? (
        <div className="empty-state">
          <AudioLines size={30} />
          <h2 className="font-serif text-2xl">Choose a story to follow.</h2>
          <p className="text-sm text-muted-foreground">
            Open an audiobook from your library to view its progress.
          </p>
          <Button asChild>
            <Link href="/library">
              Go to library
              <ArrowRight size={15} />
            </Link>
          </Button>
        </div>
      ) : error ? (
        <div role="alert" className="empty-state">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setRetry((r) => r + 1)}>
            <RefreshCw size={14} />
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div className="studio-panel flex items-center gap-3" aria-busy="true">
          <Loader2 className="animate-spin" size={18} />
          Loading your chapters…
        </div>
      ) : book ? (
        <>
          <section className="studio-panel">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="panel-title">
                  {failed
                    ? "Narration needs attention"
                    : complete
                      ? "Processing finished"
                      : book.jobState === "queued"
                        ? "Waiting to narrate"
                        : "Creating your narration"}
                </h2>
                <p className="panel-description">
                  {completed} of {chapters.length} chapters processed · {ready}{" "}
                  with audio available
                </p>
              </div>
              <span className="font-serif text-4xl text-primary">
                {book.progress}%
              </span>
            </div>
            <Progress
              aria-label="Overall narration progress"
              value={book.progress}
              className="mt-6 h-2"
            />
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              {complete && ready === 0
                ? "No playable audio is available yet. Try narration again, or return to your library."
                : failed
                  ? "Your manuscript and finished chapters are saved. Retry to continue from where narration stopped."
                  : complete
                    ? "Available chapters are ready in the listening room."
                    : book.workerAvailable
                      ? "Longer manuscripts take more time. You can close this page and come back; narration continues in the background."
                      : "Your manuscript is safely queued. The narration worker is currently offline; creation will begin when it reconnects."}
            </p>
          </section>
          {book.generationError && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {book.generationError}
            </p>
          )}
          <section className="studio-panel mt-6">
            <h2 className="panel-title">Chapter by chapter</h2>
            <div className="mt-5 divide-y">
              {chapters.map((chapter, i) => (
                <div key={chapter.id} className="flex items-center gap-3 py-4">
                  <span className="w-5 shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <StatusIcon status={chapter.status} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{chapter.name}</p>
                    {chapter.generationError && (
                      <p className="mt-1 text-xs text-destructive">
                        {chapter.generationError}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {chapter.audioUrl
                      ? "Audio ready"
                      : chapter.status === "completed"
                        ? "Processed"
                        : chapter.status === "processing"
                          ? "Narrating"
                          : chapter.status === "failed"
                            ? "Needs attention"
                            : "Queued"}
                  </span>
                  {chapter.audioUrl && chapter.duration && (
                    <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
                      {chapter.duration}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            {(failed || (complete && ready === 0)) && (
              <Button variant="outline" asChild>
                <Link href={`/voices?bookId=${bookId}`}>Retry narration</Link>
              </Button>
            )}
            {ready > 0 && (
              <Button asChild>
                <Link href={`/player?bookId=${bookId}`}>
                  Open listening room
                  <ArrowRight size={16} />
                </Link>
              </Button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
export default function ProcessingPage() {
  return (
    <Suspense
      fallback={<div className="studio-container">Loading narration…</div>}
    >
      <ProcessingContent />
    </Suspense>
  );
}
