"use client";
import {
  ArrowUpRight,
  MoreHorizontal,
  Play,
  AudioLines,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookCover } from "@/components/studio-elements";
import type { BookListItem } from "@/lib/audiobook-types";
export function BookCard({
  id,
  title,
  author,
  status,
  chapters,
  progress,
  coverColor,
  onDelete,
}: BookListItem & { onDelete?: (id: string) => Promise<void> | void }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href =
    status === "completed"
      ? `/player?bookId=${id}`
      : status === "failed"
        ? `/voices?bookId=${id}`
        : `/processing?bookId=${id}`;
  async function remove() {
    setDeleting(true);
    try {
      await onDelete?.(id);
      setConfirm(false);
    } catch {
      setError("Couldn’t delete this book. Please try again.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <article className="project-card">
      <Link href={href} className="project-art" aria-label={`Open ${title}`}>
        <BookCover
          title={title}
          author={author}
          color={coverColor}
          decorative
        />
        <span className={`project-status status-${status}`}>
          <span />
          {status === "completed"
            ? "Ready to listen"
            : status === "failed"
              ? "Needs attention"
              : "In progress"}
        </span>
        <ArrowUpRight className="project-open" size={18} />
      </Link>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">
              <Link href={href}>{title}</Link>
            </h3>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              by {author}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Options for ${title}`}
              >
                <MoreHorizontal size={17} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={href}>Open audiobook</Link>
              </DropdownMenuItem>
              {onDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => {
                    setError(null);
                    setConfirm(true);
                  }}
                >
                  Delete audiobook
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-5 flex items-center justify-between border-t pt-4">
          <span className="text-xs text-muted-foreground">
            {chapters} {chapters === 1 ? "chapter" : "chapters"}
          </span>
          <Link
            href={href}
            className="inline-flex items-center gap-2 text-xs font-semibold text-primary"
          >
            {status === "completed" ? (
              <>
                <Play size={13} />
                Listen
              </>
            ) : status === "failed" ? (
              <>
                <RotateCcw size={13} />
                Try again
              </>
            ) : (
              <>
                <AudioLines size={13} />
                View progress
              </>
            )}
          </Link>
        </div>
        {status === "processing" && (
          <div className="mt-3 flex items-center gap-3">
            <Progress
              aria-label={`Narration progress for ${title}`}
              value={progress}
              className="h-1"
            />
            <span className="text-[10px] text-muted-foreground">
              {progress}%
            </span>
          </div>
        )}
      </div>
      <AlertDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!deleting) setConfirm(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the book from your library. You’ll need to upload the
              manuscript again to recreate it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep book</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleting ? "Deleting…" : "Delete book"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
