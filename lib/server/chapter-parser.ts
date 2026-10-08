import { ApiError } from "./errors";
import { MAX_CHAPTERS, MAX_TEXT_CHARACTERS, MAX_WORDS } from "./runtime";
export interface ChapterSeed {
  name: string;
  content: string;
}
export type ChapterParseStrategy = "heading" | "paragraph" | "default";
export interface ChapterParseSourceStats {
  characterCount: number;
  paragraphCount: number;
  headingCount: number;
}
export interface ChapterParseResult {
  chapters: ChapterSeed[];
  strategy: ChapterParseStrategy;
  sourceStats: ChapterParseSourceStats;
}

export function buildChapterSeeds(
  _fileName: string,
  textContent: string,
): ChapterParseResult {
  const text = textContent
    .replace(/\r\n?/g, "\n")
    .replace(/\uFEFF/g, "")
    .trim();
  if (!text || !/[\p{L}\p{N}]/u.test(text))
    throw new ApiError(400, "The manuscript has no readable text.");
  if (text.includes("\0"))
    throw new ApiError(
      400,
      "Please upload a UTF-8 text manuscript, DOCX, or text-based PDF.",
    );
  if (
    text.length > MAX_TEXT_CHARACTERS ||
    text.split(/\s+/u).length > MAX_WORDS
  )
    throw new ApiError(413, "The manuscript exceeds the 100,000-word limit.");
  const headings = [
    ...text.matchAll(
      /^[ \t]*((?:chapter|part|section)[ \t]+[^\n]{1,115})[ \t]*$/gim,
    ),
  ];
  const paragraphs = text.split(/\n\s*\n/).filter((part) => part.trim());
  const chapters: ChapterSeed[] = [];
  if (headings.length) {
    const first = headings[0].index ?? 0;
    if (text.slice(0, first).trim())
      chapters.push({
        name: "Opening pages",
        content: text.slice(0, first).trim(),
      });
    headings.forEach((heading, i) =>
      chapters.push({
        name: heading[1].trim(),
        content: text
          .slice(heading.index, headings[i + 1]?.index ?? text.length)
          .trim(),
      }),
    );
  } else {
    let body = "";
    for (const paragraph of paragraphs) {
      if (body && body.length + paragraph.length > 12_000) {
        chapters.push({
          name: `Chapter ${chapters.length + 1}`,
          content: body.trim(),
        });
        body = "";
      }
      body += paragraph + "\n\n";
    }
    if (body.trim())
      chapters.push({
        name: `Chapter ${chapters.length + 1}`,
        content: body.trim(),
      });
  }
  if (chapters.length > MAX_CHAPTERS)
    throw new ApiError(
      413,
      `The manuscript has more than ${MAX_CHAPTERS} chapters. Please split it into smaller books.`,
    );
  return {
    chapters,
    strategy: headings.length ? "heading" : "paragraph",
    sourceStats: {
      characterCount: text.length,
      paragraphCount: paragraphs.length,
      headingCount: headings.length,
    },
  };
}
