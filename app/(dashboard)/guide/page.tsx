import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LibraryLink, PageHeading } from "@/components/studio-elements";
import { Button } from "@/components/ui/button";
export default function GuidePage() {
  return (
    <div className="studio-container studio-container-narrow">
      <LibraryLink />
      <PageHeading
        eyebrow="GETTING STARTED"
        title="A little guidance, a new beginning."
        description="Everything you need to take your first book from the page to your headphones."
      />
      <div className="grid gap-5 sm:grid-cols-3">
        {[
          {
            n: "01",
            title: "Upload your book",
            text: "Add your manuscript, title, and author name. English TXT files work best; PDF and DOCX extraction is experimental.",
          },
          {
            n: "02",
            title: "Preview your narrator",
            text: "Listen to the included English voice and review your book details before starting narration. There’s no subscription or checkout.",
          },
          {
            n: "03",
            title: "Listen chapter by chapter",
            text: "Follow narration progress, open the listening room, and download each chapter when its audio is available.",
          },
        ].map((s) => (
          <section key={s.n} className="studio-panel">
            <span className="font-serif text-3xl text-primary">{s.n}</span>
            <h2 className="mt-5 text-sm font-semibold">{s.title}</h2>
            <p className="panel-description mt-3">{s.text}</p>
          </section>
        ))}
      </div>
      <section className="studio-panel mt-6">
        <h2 className="panel-title">Before you upload</h2>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            Use headings such as “Chapter 1” and “Chapter 2” on separate lines.
          </li>
          <li>Remove headers, footers, and notes you don’t want read aloud.</li>
          <li>
            Choose a document containing selectable text. Scanned PDFs need text
            extraction first.
          </li>
          <li>Only upload books you wrote or have permission to narrate.</li>
        </ul>
      </section>
      <div className="mt-7">
        <Button asChild size="lg">
          <Link href="/upload">
            Create your first audiobook
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </div>
  );
}
