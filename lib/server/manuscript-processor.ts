/**
 * Manuscript Processor
 * Extracts chapters from uploaded manuscript files (TXT, PDF, DOCX)
 */

import fs from "fs/promises"
import path from "path"

export interface ExtractedChapter {
  index: number
  title: string
  text: string
}

/**
 * Extract chapters from text content
 * Looks for "Chapter X" patterns or splits by paragraph breaks
 */
function extractChaptersFromText(text: string): ExtractedChapter[] {
  // Normalize whitespace
  const normalized = text.trim()

  // Try to find chapter markers (Chapter 1, Chapter Two, Chapter 1: Title, etc.)
  const chapterPattern = /^chapter\s+.*?(?=\n|$)/gim
  const matches = Array.from(normalized.matchAll(chapterPattern))

  if (matches.length > 1) {
    // Multiple chapters detected
    const chapters: ExtractedChapter[] = []

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const startIdx = match.index || 0
      const endIdx = i < matches.length - 1 ? (matches[i + 1].index || 0) : normalized.length

      const chapterText = normalized.substring(startIdx, endIdx).trim()
      const lines = chapterText.split("\n")
      const title = lines[0].trim() || `Chapter ${i + 1}`
      const content = lines.slice(1).join("\n").trim()

      if (content.length > 0) {
        chapters.push({
          index: i,
          title,
          text: content,
        })
      }
    }

    if (chapters.length > 0) {
      return chapters
    }
  }

  // Fallback: If no chapters found, treat entire text as single chapter
  // Or split by paragraph breaks if text is very long
  if (normalized.length > 10000) {
    // Split into chapters by paragraph breaks
    const paragraphs = normalized.split(/\n\n+/).filter((p) => p.trim().length > 0)

    // Group paragraphs into chapters (roughly 2000-3000 words per chapter)
    const chapters: ExtractedChapter[] = []
    let currentChapter = ""
    let chapterIndex = 0

    for (const para of paragraphs) {
      currentChapter += para + "\n\n"

      // Rough word count
      if (currentChapter.split(/\s+/).length > 1500) {
        chapters.push({
          index: chapterIndex,
          title: `Chapter ${chapterIndex + 1}`,
          text: currentChapter.trim(),
        })
        currentChapter = ""
        chapterIndex++
      }
    }

    // Add remaining text as final chapter
    if (currentChapter.trim().length > 0) {
      chapters.push({
        index: chapterIndex,
        title: `Chapter ${chapterIndex + 1}`,
        text: currentChapter.trim(),
      })
    }

    return chapters
  }

  // Single chapter
  return [
    {
      index: 0,
      title: "Chapter 1",
      text: normalized,
    },
  ]
}

/**
 * Extract text from plain TXT file
 */
async function extractFromTxt(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, "utf-8")
    return content
  } catch (error) {
    throw new Error(`Failed to read TXT file: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Extract text from DOCX file (basic implementation)
 */
async function extractFromDocx(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    const str = buffer.toString("utf8", 0, Math.min(buffer.length, 1000000))

    // Extract text from XML: look for <w:t> tags (Word text)
    const textMatches = str.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || []
    const text = textMatches
      .map((match) => {
        const extracted = match.match(/>([^<]+)</)?.[1] || ""
        return extracted.trim()
      })
      .filter((t) => t.length > 0)
      .join(" ")

    if (text.length > 0) {
      return text
    }

    throw new Error("No text found in DOCX file")
  } catch (error) {
    throw new Error(
      `Failed to extract text from DOCX file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Extract text from PDF file (basic implementation)
 */
async function extractFromPdf(filePath: string): Promise<string> {
  try {
    const buffer = await fs.readFile(filePath)
    let text = buffer.toString("latin1")

    // Remove PDF headers and control characters
    text = text.replace(/%[^\n]*/g, "")
    text = text.replace(/[^\x20-\x7E\n]/g, " ")
    text = text.replace(/\s+/g, " ")

    if (text.trim().length > 0) {
      return text.trim()
    }

    throw new Error("No text found in PDF file")
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF file: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Main function to extract chapters from manuscript
 */
export async function extractChaptersFromManuscript(
  filePath: string,
  fileType: "txt" | "pdf" | "docx"
): Promise<ExtractedChapter[]> {
  // Verify file exists
  try {
    await fs.stat(filePath)
  } catch {
    throw new Error(`File not found: ${filePath}`)
  }

  let content: string

  // Extract text based on file type
  switch (fileType.toLowerCase()) {
    case "txt":
      content = await extractFromTxt(filePath)
      break
    case "docx":
      content = await extractFromDocx(filePath)
      break
    case "pdf":
      content = await extractFromPdf(filePath)
      break
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }

  // Extract chapters from content
  const chapters = extractChaptersFromText(content)

  if (chapters.length === 0) {
    throw new Error("No content found in manuscript")
  }

  return chapters
}

/**
 * Validate manuscript content
 */
export function validateManuscriptContent(
  text: string,
  maxChapters: number = 100
): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Manuscript is empty" }
  }

  if (text.length > 10000000) {
    // 10MB limit
    return { valid: false, error: "Manuscript exceeds maximum size (10MB)" }
  }

  const chapters = extractChaptersFromText(text)

  if (chapters.length > maxChapters) {
    return { valid: false, error: `Manuscript has too many chapters (max ${maxChapters})` }
  }

  return { valid: true }
}
