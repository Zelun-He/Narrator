import path from "node:path";
import { mkdirSync, existsSync } from "node:fs";

export const DATA_DIR = path.resolve(
  /* turbopackIgnore: true */ process.env.NARRATOR_DATA_DIR || "data/private",
);
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const AUDIO_DIR = path.join(DATA_DIR, "audio");
export const DATABASE_FILE = path.join(DATA_DIR, "narrator.sqlite");
export const MODEL_DIR = path.resolve(
  /* turbopackIgnore: true */ process.env.NARRATOR_MODEL_DIR || "models",
);
export const PYTHON =
  process.env.NARRATOR_PYTHON ||
  (existsSync(".venv")
    ? path.resolve(
        ".venv",
        process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
      )
    : "python3");
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TEXT_CHARACTERS = 1_000_000;
export const MAX_WORDS = 100_000;
export const MAX_CHAPTERS = 200;
export const MAX_ACTIVE_BOOKS = 2;

export function ensurePrivateDirectories() {
  if (process.env.VERCEL)
    throw new Error(
      "Narrator's backend needs persistent storage and a narration worker. Run the supplied Docker deployment.",
    );
  const relative = path.relative(path.resolve("public"), DATA_DIR);
  if (!relative.startsWith("..") && !path.isAbsolute(relative))
    throw new Error("Private data must be outside public/.");
  for (const dir of [DATA_DIR, UPLOADS_DIR, AUDIO_DIR])
    mkdirSync(dir, { recursive: true, mode: 0o700 });
}
