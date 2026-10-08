"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import DashboardShell from "./dashboard-shell";
import DashboardPage from "./library-dashboard";
import { DEMO_BOOKS } from "@/lib/demo-books";
import { VOICE_OPTIONS } from "@/lib/voice-options";
import { PageHeading, BookCover, CreationSteps } from "./studio-elements";
import { VoiceCard } from "./voice-card";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
function DemoContent({ page }: { page: string }) {
  const bookId = useSearchParams().get("bookId");
  const book = DEMO_BOOKS.find(b => b.id === bookId) ?? DEMO_BOOKS[0];
  if (page === "library") return <DashboardPage demoBooks={DEMO_BOOKS} />;
  return <div className="studio-container studio-container-narrow">
    <Link href="/demo/library" className="text-sm text-primary">← Back to sample library</Link>
    <PageHeading eyebrow="DEMO STUDIO" title={
      page === "player" ? book.title : page === "processing" ? "Your words are finding a voice." :
      page === "voices" ? "A voice for your words." : page === "requests" ? "Every chapter, remembered." :
      page === "account" ? "Make yourself at home." : page === "guide" ? "From manuscript to audiobook." : "Bring your story to life."
    } description="Explore Narrator with sample data. Your real accounts and manuscripts are kept separate." />
    {page === "player" ? <section className="studio-panel space-y-6">
      <div className="flex justify-center rounded-xl bg-secondary p-8"><BookCover title={book.title} author={book.author} color={book.coverColor} /></div>
      <h2 className="panel-title">Hear the narrator</h2>
      <p className="panel-description">This is the public LJ voice sample, rather than audio from the fictional book.</p>
      <audio controls preload="none" src="/samples/lj.wav" className="w-full" aria-label="LJ narration sample" />
    </section> : page === "voices" ? VOICE_OPTIONS.map(v => <VoiceCard key={v.id} {...v} selected={false} onSelect={() => {}} previewOnly />) :
    page === "processing" ? <section className="studio-panel">
      <h2 className="panel-title">{book.title}</h2><p className="panel-description">Sample progress · {book.progress}%</p>
      <Progress value={book.progress} aria-label="Sample narration progress" className="mt-6" />
      <p className="mt-5 text-sm text-muted-foreground">This preview stays at a fixed example state. No narration job is running.</p>
    </section> : page === "requests" ? <section className="studio-panel">
      <h2 className="panel-title">Sample narration history</h2><div className="mt-5 divide-y">{DEMO_BOOKS.map(b => <div key={b.id} className="flex flex-wrap justify-between gap-3 py-4"><span>{b.title}</span><span className="text-sm text-muted-foreground">{b.status === "completed" ? "Completed" : b.status === "processing" ? "Processing" : "Failed"} · Example event</span></div>)}</div>
    </section> : page === "account" ? <section className="studio-panel"><h2 className="panel-title">testuser</h2><p className="panel-description">Public demo profile. It has no saved password, private library, or administrator access.</p></section> : <>
      <CreationSteps current={1} />
      <section className="studio-panel"><h2 className="panel-title">Your manuscript → your audiobook</h2><ol className="mt-5 list-decimal space-y-4 pl-5 text-sm text-muted-foreground"><li>Upload your TXT, DOCX or text-based PDF.</li><li>Choose your narrator and review your chapters.</li><li>Follow progress, listen and download your audiobook.</li></ol>
      <p className="mt-6 text-sm text-muted-foreground">Manuscript uploads are disabled in the demo. A working author backend is required to save and narrate real books.</p></section>
      <Button asChild variant="outline" className="mt-6"><Link href="/demo/voices">Preview the narrator</Link></Button>
    </>}
  </div>;
}
export function DemoStudio({ page }: { page: string }) {
  return <DashboardShell demo user={{ name: "testuser", email: "Demo preview" }}>
    <Suspense fallback={<div className="studio-container">Opening demo…</div>}><DemoContent page={page} /></Suspense>
  </DashboardShell>;
}
