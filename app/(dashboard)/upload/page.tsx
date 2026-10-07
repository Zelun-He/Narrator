"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Headphones,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploadZone } from "@/components/file-upload-zone";
import { VoiceCard } from "@/components/voice-card";
import {
  CreationSteps,
  LibraryLink,
  PageHeading,
} from "@/components/studio-elements";
import { VOICE_OPTIONS } from "@/lib/voice-options";
export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [voiceId, setVoiceId] = useState(VOICE_OPTIONS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadKey = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const valid = Boolean(file && title.trim() && author.trim());
  const voice = VOICE_OPTIONS.find((v) => v.id === voiceId)!;
  function changeStep(next: number) {
    setStep(next);
    setError(null);
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    if (step === 1) {
      changeStep(2);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      uploadKey.current ??= crypto.randomUUID();
      const form = new FormData();
      form.append("file", file!);
      form.append("title", title.trim());
      form.append("author", author.trim());
      form.append("language", "english");
      form.append("voiceId", voiceId);
      const response = await fetch("/api/books", {
        method: "POST",
        headers: { "Idempotency-Key": uploadKey.current },
        body: form,
      });
      const data = await response.json();
      if (response.status === 401) {
        window.location.assign("/login?next=/upload");
        return;
      }
      if (!response.ok || !data.book?.id)
        throw new Error(
          data.error || "Your manuscript couldn’t upload. Please try again.",
        );
      const id = data.book.id;
      router.push(`/processing?bookId=${id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection interrupted. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="studio-container studio-container-narrow">
      <LibraryLink />
      <PageHeading
        eyebrow="BRING YOUR STORY TO LIFE"
        title="From manuscript to microphone."
        description="A few simple steps to give your book a voice. Free to create, yours to listen to."
      />
      <CreationSteps current={step} />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <form onSubmit={submit} className="flex flex-col gap-6">
          {step === 1 ? (
            <>
              <section className="studio-panel">
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="panel-title outline-none"
                >
                  First, your manuscript.
                </h2>
                <p className="panel-description mb-6">
                  Choose the book you’d like to bring to life.
                </p>
                <FileUploadZone
                  selectedFile={file}
                  onFileSelect={(next) => {
                    setFile(next);
                    if (next && !title)
                      setTitle(
                        next.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " "),
                      );
                  }}
                />
              </section>
              <section className="studio-panel">
                <h2 className="panel-title">Make it yours.</h2>
                <p className="panel-description mb-6">
                  These details will appear in your audiobook library.
                </p>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="title">
                      Book title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      className="studio-input"
                      placeholder="The title of your story"
                      value={title}
                      required
                      maxLength={200}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="author">
                      Author name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="author"
                      className="studio-input"
                      placeholder="Your name or pen name"
                      value={author}
                      required
                      maxLength={200}
                      autoComplete="name"
                      onChange={(e) => setAuthor(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t pt-4 text-xs">
                    <span className="text-muted-foreground">
                      Manuscript language
                    </span>
                    <span>English</span>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2
                  ref={heading}
                  tabIndex={-1}
                  className="panel-title mb-2 outline-none"
                >
                  Meet your narrator.
                </h2>
                <p className="panel-description mb-5">
                  Listen to a sample before you create your audiobook.
                </p>
                {VOICE_OPTIONS.map((v) => (
                  <VoiceCard
                    key={v.id}
                    {...v}
                    selected={v.id === voiceId}
                    onSelect={setVoiceId}
                  />
                ))}
                <p className="mt-3 text-xs text-muted-foreground">
                  One English voice is currently available, included at no cost.
                </p>
              </section>
              <section className="studio-panel">
                <h2 className="panel-title">One last look.</h2>
                <dl className="mt-5 space-y-4 text-sm">
                  {[
                    ["Book", title],
                    ["Author", author],
                    ["Manuscript", file?.name],
                    ["Language", "English"],
                    ["Narrator", voice.name.replace(" (Default)", "")],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-6">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-all text-right font-medium">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex justify-between border-t pt-4 text-sm">
                  <span>Cost to create</span>
                  <span className="font-semibold text-primary">Free</span>
                </div>
              </section>
            </>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
            >
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {step === 2 ? (
              <Button
                type="button"
                variant="ghost"
                disabled={submitting}
                onClick={() => {
                  uploadKey.current = null;
                  changeStep(1);
                }}
              >
                <ArrowLeft size={15} />
                Edit manuscript
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                All fields marked * are required.
              </p>
            )}
            <Button type="submit" size="lg" disabled={!valid || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Starting narration…
                </>
              ) : (
                <>
                  {step === 1 ? "Continue to narrator" : "Create my audiobook"}
                  <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </form>
        <aside className="form-aside">
          <p className="eyebrow">YOUR STORY’S NEXT CHAPTER</p>
          <h2 className="mt-4 font-serif text-2xl leading-tight">
            You’ve done the writing.
            <br />
            <em>Let’s give it a voice.</em>
          </h2>
          <div className="mt-7 space-y-6">
            {[
              {
                icon: FileText,
                title: "Bring your manuscript",
                text: "Use chapter headings to keep your story organized.",
              },
              {
                icon: Headphones,
                title: "Hear it come to life",
                text: "Preview the narrator, then follow your chapters as they’re created.",
              },
              {
                icon: Download,
                title: "Listen and keep it",
                text: "Play your audiobook and download an MP3 or chapter audio.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <item.icon size={17} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold">{item.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 border-t pt-5 text-[11px] leading-relaxed text-muted-foreground">
            TXT, DOCX, and text-based PDF are supported, up to 10 MB and 100,000
            words. Scanned PDFs need OCR first. Only upload work you have
            permission to narrate.
          </p>
        </aside>
      </div>
    </div>
  );
}
