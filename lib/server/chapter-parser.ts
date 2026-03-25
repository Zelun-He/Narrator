import path from "node:path"

export interface ChapterSeed {
  name: string
  content: string
}

const DEFAULT_CHAPTER_COUNT = 10
const MAX_CHAPTERS = 50
const MIN_CHUNK_SIZE = 2800

function normalizeChapterName(raw: string, index: number): string {
  const trimmed = raw.trim().replace(/[\s:.-]+$/g, "")
  if (!trimmed) return `Chapter ${index + 1}`
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}...` : trimmed
}

function chunkByParagraphs(text: string): ChapterSeed[] {
  const clean = text.replace(/\r\n/g, "\n").trim()
  if (!clean) {
    return Array.from({ length: DEFAULT_CHAPTER_COUNT }, (_, index) => ({
      name: `Chapter ${index + 1}`,
      content: "",
    }))
  }

  const paragraphs = clean
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)

  const approxCount = Math.max(1, Math.min(MAX_CHAPTERS, Math.ceil(clean.length / MIN_CHUNK_SIZE)))
  const perChapter = Math.max(1, Math.ceil(paragraphs.length / approxCount))

  const chapters: ChapterSeed[] = []
  for (let i = 0; i < paragraphs.length; i += perChapter) {
    const body = paragraphs.slice(i, i + perChapter).join("\n\n")
    chapters.push({
      name: `Chapter ${chapters.length + 1}`,
      content: body,
    })
  }

  return chapters.slice(0, MAX_CHAPTERS)
}

function splitByHeadings(text: string): ChapterSeed[] {
  const clean = text.replace(/\r\n/g, "\n").trim()
  if (!clean) return []

  const heading = /^\s*((chapter|part|section)\s+[\w\-.:]+.*?)\s*$/gim
  const markers: Array<{ name: string; index: number }> = []

  for (const match of clean.matchAll(heading)) {
    const name = normalizeChapterName(match[1] ?? "", markers.length)
    markers.push({ name, index: match.index ?? 0 })
  }

  if (markers.length < 2) return []

  const chapters: ChapterSeed[] = []
  for (let i = 0; i < markers.length; i += 1) {
    const start = markers[i].index
    const end = markers[i + 1]?.index ?? clean.length
    const content = clean.slice(start, end).trim()
    chapters.push({ name: markers[i].name, content })
  }

  return chapters.slice(0, MAX_CHAPTERS)
}

export function buildChapterSeeds(fileName: string, textContent: string): ChapterSeed[] {
  const ext = path.extname(fileName).toLowerCase()

  if (ext === ".txt") {
    const headingSplit = splitByHeadings(textContent)
    if (headingSplit.length > 0) return headingSplit
    return chunkByParagraphs(textContent)
  }

  return Array.from({ length: DEFAULT_CHAPTER_COUNT }, (_, index) => ({
    name: `Chapter ${index + 1}`,
    content: "",
  }))
}
