import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { ApiError } from "./errors";
import { PYTHON } from "./runtime";
import { buildChapterSeeds } from "./chapter-parser";

export async function parseManuscript(filePath: string, originalName: string) {
  let text: string;
  if (path.extname(originalName).toLowerCase() === ".txt") {
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(
        await readFile(filePath),
      );
    } catch {
      throw new ApiError(
        400,
        "This TXT file couldn’t be read. Save it as UTF-8 and try again.",
      );
    }
  } else {
    text = await new Promise<string>((resolve, reject) => {
      execFile(
        PYTHON,
        [path.resolve("scripts/extract-manuscript.py"), filePath],
        { timeout: 30_000, maxBuffer: 8 * 1024 * 1024 },
        (error, stdout) => {
          try {
            const result = JSON.parse(stdout);
            if (result.error) return reject(new ApiError(400, result.error));
            if (error || typeof result.text !== "string")
              return reject(
                new ApiError(400, "This manuscript couldn’t be read."),
              );
            resolve(result.text);
          } catch {
            reject(
              new ApiError(
                400,
                "This manuscript couldn’t be read. Try a smaller file or a UTF-8 TXT manuscript.",
              ),
            );
          }
        },
      );
    });
  }
  return buildChapterSeeds(originalName, text);
}
