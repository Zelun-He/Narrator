import type { BookListItem } from "./audiobook-types";
// Public fictional fixtures. These never enter the author database.
export const DEMO_BOOKS: BookListItem[] = [
  { id: "demo-garden", title: "The Midnight Garden", author: "Clara Bennett", status: "completed", chapters: 12, progress: 100, coverColor: "#4ECDC4" },
  { id: "demo-tides", title: "Where the Tides Take Us", author: "James Ellis", status: "processing", chapters: 8, progress: 62, coverColor: "#0EA5E9" },
  { id: "demo-letters", title: "Letters to Tomorrow", author: "Evelyn Rose", status: "failed", chapters: 6, progress: 33, coverColor: "#FF6B6B" },
].map(book => ({ ...book, language: "English", createdAt: "2026-10-01T12:00:00Z", voiceId: "1", voiceName: "LJ" })) as BookListItem[];
