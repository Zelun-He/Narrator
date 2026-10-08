"use client";
import Link from "next/link";
import { usePagedResource } from "@/lib/use-paged-resource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
type Event = { id: number; bookId: string; title: string; state: string; attempt: number; recordedAt: number };
type History = { events: Event[]; total: number; pages: number };
const labels: Record<string, string> = { queued: "Queued for narration", processing: "Narration started", completed: "Audiobook completed", failed: "Narration needs attention" };
export function SavedRequests() {
  const list = usePagedResource<History>("/api/requests");
  return <section className="studio-panel space-y-5" aria-label="Saved narration requests" aria-busy={list.loading}>
    <label className="block space-y-2 text-sm" htmlFor="request-search"><span>Find a book in your history</span><Input id="request-search" type="search" maxLength={100} value={list.search} onChange={e => list.searchFor(e.target.value)} /></label>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" role="status">{list.loading ? "Loading your history…" : `${list.data?.total ?? 0} saved events`}</p>
      <Button variant="outline" onClick={list.refresh} disabled={list.loading}>Refresh history</Button>
    </div>
    {list.error && <p role="alert" className="text-sm text-destructive">{list.error}</p>}
    {!list.loading && !list.error && list.data?.events.length === 0 && <p className="panel-description">Upload your first manuscript and its narration history will appear here.</p>}
    {!list.loading && !list.error && <ol className="divide-y">{list.data?.events.map(event => <li key={event.id} className="flex flex-wrap items-center justify-between gap-3 py-5">
      <div className="min-w-0"><Link href={`/processing?bookId=${event.bookId}`} className="break-words text-sm font-semibold text-primary underline underline-offset-4">{event.title}</Link>
        <p className="mt-2 text-xs text-muted-foreground">{labels[event.state] ?? event.state}{event.attempt > 0 ? ` · Attempt ${event.attempt}` : ""}</p>
      </div>
      <time className="text-xs text-muted-foreground" dateTime={new Date(event.recordedAt).toISOString()}>{new Date(event.recordedAt).toLocaleString()}</time>
    </li>)}</ol>}
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" disabled={list.loading || list.page === 1} onClick={() => list.setPage(p => p - 1)}>Previous</Button>
      <span className="text-xs">Page {list.page} of {list.data?.pages ?? 1}</span>
      <Button variant="outline" disabled={list.loading || list.page >= (list.data?.pages ?? 1)} onClick={() => list.setPage(p => p + 1)}>Next</Button>
    </div>
  </section>;
}
