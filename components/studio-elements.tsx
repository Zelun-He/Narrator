import Link from "next/link";
import { ArrowLeft, Check, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="editorial-title">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export function CreationSteps({ current }: { current: number }) {
  return (
    <ol className="creation-steps" aria-label="Audiobook creation progress">
      {["Your manuscript", "Narrator & review", "Create & listen"].map(
        (label, index) => (
          <li
            key={label}
            aria-current={current === index + 1 ? "step" : undefined}
            className={cn(
              current === index + 1 && "step-active",
              current > index + 1 && "step-done",
            )}
          >
            <span>
              {current > index + 1 ? <Check size={14} /> : `0${index + 1}`}
            </span>
            <p>{label}</p>
          </li>
        ),
      )}
    </ol>
  );
}

export function LibraryLink() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={15} /> Back to library
    </Link>
  );
}

const coverPalette: Record<string, string> = {
  "#FF6B6B": "#a15e4e",
  "#4ECDC4": "#4f7468",
  "#F59E0B": "#825f32",
  "#A78BFA": "#75678a",
  "#0EA5E9": "#45677c",
  "#FF9F43": "#826043",
};

export function BookCover({
  title,
  author,
  color = "#34554b",
  decorative = false,
}: {
  title: string;
  author: string;
  color?: string;
  decorative?: boolean;
}) {
  return (
    <div
      className="book-cover"
      style={{ backgroundColor: coverPalette[color.toUpperCase()] ?? color }}
      aria-hidden={decorative || undefined}
    >
      <span className="cover-edition">NARRATOR EDITION</span>
      <div className="cover-orbit" />
      <div className="cover-title">{title}</div>
      <div className="cover-author">{author}</div>
      <AudioLines className="cover-mark" size={20} />
    </div>
  );
}
