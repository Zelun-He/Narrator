import { randomUUID } from "node:crypto";
import { mkdir, writeFile, rm, stat, rename } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { getDatabase } from "../lib/server/database";
import { chapterRows } from "../lib/server/audiobook-store";
import { AUDIO_DIR, MODEL_DIR, PYTHON } from "../lib/server/runtime";

const db = getDatabase();
const workerId = randomUUID();
let stopping = false;
let child: ReturnType<typeof spawn> | undefined;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stopping = true;
    child?.kill("SIGTERM");
  });
function run(
  command: string,
  args: string[],
  timeout: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, OMP_NUM_THREADS: "2" },
    });
    let stdout = "",
      stderr = "";
    const timer = setTimeout(() => child?.kill("SIGKILL"), timeout);
    child.stdout!.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(-8000);
    });
    child.stderr!.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(-4000);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      child = undefined;
      code === 0
        ? resolve(stdout)
        : reject(new Error(`${command} exited ${code}: ${stderr}`));
    });
  });
}
interface Job {
  book_id: string;
  attempts: number;
  lease_token: string;
}
function claim(): Job | undefined {
  return db
    .transaction(() => {
      // Retry crashed workers, with a cap so corrupt jobs cannot loop forever.
      db.prepare(
        "UPDATE books SET status='failed',error='Narration was interrupted repeatedly. Please retry.' WHERE id IN (SELECT book_id FROM jobs WHERE status='processing' AND lease_until<? AND attempts>=3)",
      ).run(Date.now());
      db.prepare(
        "UPDATE jobs SET status='failed',lease_token=NULL WHERE status='processing' AND lease_until<? AND attempts>=3",
      ).run(Date.now());
      const row = db
        .prepare(
          "SELECT book_id,attempts FROM jobs WHERE status='queued' OR (status='processing' AND lease_until<?) ORDER BY requested_at LIMIT 1",
        )
        .get(Date.now()) as { book_id: string; attempts: number } | undefined;
      if (!row) return;
      const token = randomUUID();
      db.prepare(
        "UPDATE jobs SET status='processing',attempts=attempts+1,lease_token=?,lease_until=? WHERE book_id=?",
      ).run(token, Date.now() + 30_000, row.book_id);
      db.prepare(
        "UPDATE chapters SET status='pending' WHERE book_id=? AND status='processing'",
      ).run(row.book_id);
      return { ...row, lease_token: token };
    })
    .immediate();
}
function owns(job: Job) {
  return Boolean(
    db
      .prepare(
        "SELECT 1 FROM jobs WHERE book_id=? AND lease_token=? AND status='processing'",
      )
      .get(job.book_id, job.lease_token),
  );
}
async function processBook(job: Job) {
  const folder = path.join(AUDIO_DIR, job.book_id);
  await mkdir(folder, { recursive: true, mode: 0o700 });
  const temporary = path.join(folder, job.lease_token);
  await mkdir(temporary, { mode: 0o700 });
  const renew = setInterval(() => {
    const result = db
      .prepare(
        "UPDATE jobs SET lease_until=? WHERE book_id=? AND lease_token=? AND status='processing'",
      )
      .run(Date.now() + 30_000, job.book_id, job.lease_token);
    if (!result.changes) child?.kill("SIGTERM");
  }, 5000);
  try {
    for (const chapter of chapterRows(job.book_id)) {
      if (stopping || !owns(job)) throw new Error("Worker stopped");
      if (chapter.status === "completed" && chapter.audio_path) {
        try {
          if ((await stat(chapter.audio_path)).size > 44) continue;
        } catch {}
      }
      db.prepare(
        "UPDATE chapters SET status='processing',error=NULL,audio_path=NULL,audio_size=NULL WHERE id=?",
      ).run(chapter.id);
      const textFile = path.join(temporary, "text.txt"),
        wav = path.join(temporary, `${chapter.id}.wav`);
      await writeFile(textFile, chapter.text_content, { mode: 0o600 });
      const info = JSON.parse(
        await run(
          PYTHON,
          [
            path.resolve("scripts/synthesize.py"),
            path.join(MODEL_DIR, "en_US-ljspeech-medium.onnx"),
            textFile,
            wav,
          ],
          60 * 60 * 1000,
        ),
      ) as { duration: number };
      const size = (await stat(wav)).size;
      if (!Number.isFinite(info.duration) || info.duration <= 0 || size <= 44)
        throw new Error("Empty narration output");
      if (!owns(job)) throw new Error("Lease lost");
      const destination = path.join(
        folder,
        `${chapter.id}-${job.lease_token}.wav`,
      );
      await rename(wav, destination);
      db.transaction(() => {
        if (!owns(job)) throw new Error("Lease lost");
        db.prepare(
          "UPDATE chapters SET status='completed',audio_path=?,audio_size=?,duration_seconds=?,error=NULL WHERE id=?",
        ).run(destination, size, info.duration, chapter.id);
      }).immediate();
    }
    const chapters = chapterRows(job.book_id);
    const concat = path.join(temporary, "chapters.txt");
    await writeFile(
      concat,
      chapters
        .map((c) => `file '${c.audio_path!.replace(/'/g, "'\\''")}'`)
        .join("\n"),
      { mode: 0o600 },
    );
    const mp3 = path.join(temporary, "audiobook.mp3");
    await run(
      process.env.NARRATOR_FFMPEG || "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat,
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "96k",
        mp3,
      ],
      60 * 60 * 1000,
    );
    const size = (await stat(mp3)).size;
    if (size < 100) throw new Error("Empty MP3 output");
    if (!owns(job)) throw new Error("Lease lost");
    const destination = path.join(folder, `audiobook-${job.lease_token}.mp3`);
    await rename(mp3, destination);
    db.transaction(() => {
      if (!owns(job)) throw new Error("Lease lost");
      db.prepare(
        "UPDATE books SET status='completed',mp3_path=?,mp3_size=?,error=NULL,updated_at=? WHERE id=?",
      ).run(destination, size, new Date().toISOString(), job.book_id);
      db.prepare(
        "UPDATE jobs SET status='completed',lease_token=NULL,lease_until=0 WHERE book_id=?",
      ).run(job.book_id);
    }).immediate();
    console.log(`Completed ${job.book_id}`);
  } catch (error) {
    console.error(`Narration job ${job.book_id} failed:`, error);
    if (!stopping && owns(job))
      db.transaction(() => {
        const message =
          "Narration could not finish. Your manuscript and completed chapters are saved. Please retry; if this continues, ask the server administrator to check the voice and FFmpeg setup.";
        db.prepare("UPDATE books SET status='failed',error=? WHERE id=?").run(
          message,
          job.book_id,
        );
        db.prepare(
          "UPDATE chapters SET status='failed',error=? WHERE book_id=? AND status='processing'",
        ).run("This chapter could not be narrated.", job.book_id);
        db.prepare(
          "UPDATE jobs SET status='failed',lease_token=NULL,lease_until=0 WHERE book_id=?",
        ).run(job.book_id);
      }).immediate();
  } finally {
    clearInterval(renew);
    if (stopping && owns(job))
      db.prepare(
        "UPDATE jobs SET lease_until=0 WHERE book_id=? AND lease_token=?",
      ).run(job.book_id, job.lease_token);
    await rm(temporary, { recursive: true, force: true });
  }
}
async function main() {
  const heartbeat = setInterval(
    () =>
      db
        .prepare(
          "INSERT INTO worker_heartbeat(id,last_seen) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen",
        )
        .run(workerId, Date.now()),
    5000,
  );
  db.prepare("INSERT INTO worker_heartbeat(id,last_seen) VALUES (?,?)").run(
    workerId,
    Date.now(),
  );
  console.log("Narration worker ready");
  while (!stopping) {
    const job = claim();
    if (job) await processBook(job);
    else await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  clearInterval(heartbeat);
  db.prepare("DELETE FROM worker_heartbeat WHERE id=?").run(workerId);
  db.close();
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
