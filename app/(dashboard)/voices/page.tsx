"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceCard } from "@/components/voice-card";
import { LibraryLink, PageHeading } from "@/components/studio-elements";
import { VOICE_OPTIONS } from "@/lib/voice-options";
function VoiceStudio() {
  const params = useSearchParams();
  const bookId = params.get("bookId");
  const router = useRouter();
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState("");
  useEffect(() => {
    if (!bookId) return;
    let active = true;
    fetch(`/api/books/${bookId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        if (active) setBookTitle(d.book.title);
      })
      .catch(() => {
        if (active)
          setError(
            "This book couldn’t load. Return to your library and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [bookId]);
  async function generate() {
    if (!bookId) return;
    setBusy(true);
    setError(null);
    try {
      const voice = VOICE_OPTIONS.find((v) => v.id === voiceId)!;
      const r = await fetch(`/api/books/${bookId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, voiceName: voice.name }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Narration couldn’t start.");
      router.push(`/processing?bookId=${bookId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="studio-container studio-container-narrow">
      <LibraryLink />
      <PageHeading
        eyebrow="THE VOICE STUDIO"
        title="A voice for your words."
        description="Get a feel for your narrator. Clear, natural English narration, included for free."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          {bookTitle && (
            <p className="text-sm">
              Narrator for <strong>{bookTitle}</strong>
            </p>
          )}
          {VOICE_OPTIONS.map((v) => (
            <VoiceCard
              key={v.id}
              {...v}
              selected={Boolean(bookId) && v.id === voiceId}
              onSelect={setVoiceId}
              previewOnly={!bookId}
            />
          ))}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {bookId ? (
            <Button
              onClick={() => void generate()}
              disabled={busy || !bookTitle}
            >
              {busy ? (
                <Loader2 className="animate-spin" size={15} />
              ) : (
                <ArrowRight size={15} />
              )}{" "}
              {busy ? "Starting…" : "Start narration"}
            </Button>
          ) : (
            <Button asChild>
              <Link href="/upload">
                Give your book this voice
                <ArrowRight size={15} />
              </Link>
            </Button>
          )}
        </div>
        <aside className="form-aside">
          <p className="eyebrow">A LITTLE LISTENING ADVICE</p>
          <h2 className="mt-4 font-serif text-2xl">
            Find the rhythm of your story.
          </h2>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Listen for clarity, pacing, and how the voice carries a sentence.
            Headphones help you catch the little details.
          </p>
          <p className="mt-5 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
            Narrator currently includes one English voice. Your manuscript stays
            editable until you start creation.
          </p>
        </aside>
      </div>
    </div>
  );
}
export default function VoicesPage() {
  return (
    <Suspense
      fallback={<div className="studio-container">Loading voice studio…</div>}
    >
      <VoiceStudio />
    </Suspense>
  );
}
