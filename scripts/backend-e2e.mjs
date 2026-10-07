/** Tests real HTTP, persistent SQLite, real Piper output and worker recovery. */
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import Database from "better-sqlite3";
const folder = await mkdtemp(path.join(tmpdir(), "narrator-e2e-"));
const port = Number(process.env.NARRATOR_TEST_PORT || 3217),
  base = `http://127.0.0.1:${port}`;
const environment = {
  ...process.env,
  NARRATOR_DATA_DIR: folder,
  BETTER_AUTH_URL: base,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
};
delete environment.VERCEL;
let web, worker, db;
const children = new Set();
let logs = "";
function launch(command, args) {
  const child = spawn(command, args, {
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.add(child);
  for (const stream of [child.stdout, child.stderr])
    stream.on("data", (data) => {
      logs = (logs + data).slice(-16000);
      if (process.env.NARRATOR_TEST_VERBOSE) process.stdout.write(data);
    });
  child.on("exit", () => children.delete(child));
  return child;
}
async function stop(child, signal = "SIGTERM") {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, "exit");
  child.kill(signal);
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await closed;
  clearTimeout(timer);
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check, label, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(250);
  }
  throw new Error(`Timed out: ${label}\n${logs}`);
}
async function startWeb() {
  web = launch(process.execPath, [
    "node_modules/next/dist/bin/next",
    "start",
    "-H",
    "127.0.0.1",
    "-p",
    String(port),
  ]);
  await waitFor(async () => {
    try {
      return (
        await fetch(base + "/api/health", { signal: AbortSignal.timeout(3000) })
      ).ok;
    } catch {
      return false;
    }
  }, "server ready");
}
const startWorker = () =>
  (worker = launch(process.execPath, ["scripts/run-worker.mjs"]));
async function request(url, cookie = "", options = {}) {
  return fetch(base + url, {
    ...options,
    headers: { ...(cookie ? { cookie } : {}), ...options.headers },
  });
}
async function account(email, name) {
  const response = await request("/api/auth/sign-up/email", "", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
      "x-forwarded-for": email.startsWith("alice") ? "127.0.0.2" : "127.0.0.3",
    },
    body: JSON.stringify({ name, email, password: "a-strong-test-password" }),
  });
  assert.equal(response.status, 200, await response.text());
  const cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  assert.ok(cookies.includes("session_token"));
  assert.ok(
    response.headers
      .getSetCookie()
      .some((c) => /httponly/i.test(c) && /samesite=lax/i.test(c)),
  );
  return cookies;
}
async function upload(
  cookie,
  file,
  name,
  key = crypto.randomUUID(),
  title = "A test story",
) {
  const form = new FormData();
  form.set("title", title);
  form.set("author", "An Author");
  form.set("language", "english");
  form.set("voiceId", "1");
  form.set("file", new Blob([file]), name);
  return request("/api/books", cookie, {
    method: "POST",
    headers: { origin: base, "idempotency-key": key },
    body: form,
  });
}
async function completed(id, cookie) {
  let book;
  await waitFor(
    async () => {
      const response = await request(`/api/books/${id}`, cookie);
      assert.equal(response.status, 200);
      book = (await response.json()).book;
      if (book.status === "failed")
        throw new Error(book.generationError + "\n" + logs);
      return book.status === "completed";
    },
    "real narration",
    180_000,
  );
  return book;
}
function pdf(text) {
  const stream = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(value));
    value += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(value);
  value += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(value);
}
try {
  await startWeb();
  assert.equal((await request("/api/books")).status, 401);
  assert.equal(
    (await request("/upload", "", { redirect: "manual" })).status,
    307,
  );
  assert.equal(
    (await request("/audio/piper-1774499771465-uyjola.wav")).status,
    404,
  );
  const alice = await account("alice@example.test", "Alice"),
    bob = await account("bob@example.test", "Bob");
  db = new Database(path.join(folder, "narrator.sqlite"));
  db.pragma("busy_timeout = 5000");
  const key = crypto.randomUUID(),
    text =
      "Chapter One\nThe morning was bright. A new story had begun.\n\nChapter Two\nShe opened the door, and found her way home.";
  const first = await upload(alice, text, "story.txt", key);
  assert.equal(first.status, 201, await first.clone().text());
  let book = (await first.json()).book;
  assert.equal(book.jobState, "queued");
  assert.equal(book.progress, 0);
  assert.equal(book.workerAvailable, false);
  assert.equal(book.chaptersList.length, 2);
  const duplicate = await upload(alice, text, "story.txt", key);
  assert.equal((await duplicate.json()).book.id, book.id);
  assert.equal(
    (await upload(alice, "Different content", "story.txt", key)).status,
    409,
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM books").get().n, 1);
  const endpoints = [
    `/api/books/${book.id}`,
    `/api/books/${book.id}/status`,
    `/api/books/${book.id}/chapters`,
    `/api/books/${book.id}/download`,
  ];
  for (const endpoint of endpoints)
    assert.equal((await request(endpoint, bob)).status, 404, endpoint);
  for (const method of ["DELETE", "POST"])
    assert.equal(
      (
        await request(
          `/api/books/${book.id}${method === "POST" ? "/generate" : ""}`,
          bob,
          { method, headers: { origin: base } },
        )
      ).status,
      404,
    );
  assert.equal(
    (
      await request(`/api/books/${book.id}`, alice, {
        method: "DELETE",
        headers: { origin: "https://attacker.test" },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request(`/api/books/${book.id}/download`, alice)).status,
    409,
  );
  assert.equal(
    (
      await request(`/api/books/${book.id}/generate`, alice, {
        method: "POST",
        headers: { origin: base },
      })
    ).status,
    200,
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM jobs").get().n, 1);
  assert.equal((await upload(bob, "\0binary", "bad.txt")).status, 400);
  assert.equal((await upload(bob, pdf(""), "scan.pdf")).status, 400);
  assert.equal((await upload(bob, "not a document", "bad.docx")).status, 400);
  assert.equal((await upload(bob, "unsupported", "bad.exe")).status, 400);
  assert.equal(
    (await upload(bob, Buffer.alloc(10 * 1024 * 1024 + 1), "big.txt")).status,
    413,
  );
  console.log(
    "PASS: accounts, ownership, CSRF, bounded uploads, extraction errors and idempotency",
  );
  startWorker();
  book = await completed(book.id, alice);
  assert.equal(book.progress, 100);
  assert.equal(book.chaptersList.filter((c) => c.audioUrl).length, 2);
  const chapter = book.chaptersList[0];
  assert.equal((await request(chapter.audioUrl, bob)).status, 404);
  assert.equal((await request(chapter.audioUrl)).status, 401);
  const wav = await request(chapter.audioUrl, alice),
    bytes = Buffer.from(await wav.arrayBuffer());
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  assert.ok(bytes.length > 44);
  assert.equal(wav.headers.get("cache-control"), "private, no-store");
  const range = await request(chapter.audioUrl, alice, {
    headers: { range: "bytes=0-43" },
  });
  assert.equal(range.status, 206);
  assert.equal((await range.arrayBuffer()).byteLength, 44);
  const suffix = await request(chapter.audioUrl, alice, {
    headers: { range: "bytes=-10" },
  });
  assert.equal(suffix.status, 206);
  assert.equal((await suffix.arrayBuffer()).byteLength, 10);
  assert.equal(
    (
      await request(chapter.audioUrl, alice, {
        headers: { range: "bytes=999999999-" },
      })
    ).status,
    416,
  );
  assert.equal(
    (await request(chapter.audioUrl, alice, { method: "HEAD" })).headers.get(
      "content-length",
    ),
    String(bytes.length),
  );
  const mp3 = await request(book.downloadUrl, alice);
  assert.equal(mp3.headers.get("content-type"), "audio/mpeg");
  const mp3Path = path.join(folder, "export.mp3");
  await writeFile(mp3Path, Buffer.from(await mp3.arrayBuffer()));
  const duration = Number(
    execFileSync(
      process.env.NARRATOR_FFPROBE || "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        mp3Path,
      ],
      { encoding: "utf8" },
    ),
  );
  assert.ok(duration > 1);
  const zip = await request(`/api/books/${book.id}/download?format=zip`, alice);
  assert.equal(zip.status, 200);
  const zipPath = path.join(folder, "export.zip");
  await writeFile(zipPath, Buffer.from(await zip.arrayBuffer()));
  const python = process.env.NARRATOR_PYTHON || "python3";
  execFileSync(python, [
    "-c",
    "import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert len(z.namelist())==2; assert z.testzip() is None; assert all(z.read(n)[:4]==b'RIFF' for n in z.namelist())",
    zipPath,
  ]);
  console.log(
    "PASS: actual Piper chapter WAVs, ranged playback, valid MP3 and ZIP exports",
  );
  // Real DOCX and PDF files, not extension-only mocks.
  const docxPath = path.join(folder, "fixture.docx");
  execFileSync(python, [
    "-c",
    "from docx import Document; import sys; d=Document();d.add_heading('Chapter One',0);d.add_paragraph('The little book finally found its voice.');d.save(sys.argv[1])",
    docxPath,
  ]);
  const document = await upload(bob, await readFile(docxPath), "fixture.docx");
  assert.equal(document.status, 201, await document.clone().text());
  const docBook = (await document.json()).book;
  const pdfUpload = await upload(
    bob,
    pdf("The little book finally found its voice."),
    "fixture.pdf",
  );
  assert.equal(pdfUpload.status, 201, await pdfUpload.clone().text());
  const pdfBook = (await pdfUpload.json()).book;
  await completed(docBook.id, bob);
  await completed(pdfBook.id, bob);
  console.log("PASS: DOCX and text-PDF extraction through completed narration");
  await stop(worker);
  // Restart the web process and keep the same cookie and disk, proving persistence.
  await stop(web);
  await startWeb();
  assert.equal((await request(`/api/books/${book.id}`, alice)).status, 200);
  assert.equal((await request(chapter.audioUrl, alice)).status, 200);
  const signin = await request("/api/auth/sign-in/email", "", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: JSON.stringify({
      email: "alice@example.test",
      password: "a-strong-test-password",
    }),
  });
  assert.equal(signin.status, 200);
  const recoveryResponse = await upload(
    alice,
    "Chapter One\n" +
      "Once upon a time, a writer dreamed of sharing her stories. ".repeat(35),
    "recovery.txt",
  );
  assert.equal(recoveryResponse.status, 201);
  const recovery = (await recoveryResponse.json()).book;
  startWorker();
  await waitFor(
    () =>
      db.prepare("SELECT status FROM chapters WHERE book_id=?").get(recovery.id)
        .status === "processing",
    "worker starts",
  );
  await stop(worker, "SIGKILL");
  db.prepare("UPDATE jobs SET lease_until=0 WHERE book_id=?").run(recovery.id); // Avoid a 30-second lease wait in the test.
  startWorker();
  await completed(recovery.id, alice);
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS n FROM chapters WHERE book_id=?")
      .get(recovery.id).n,
    1,
  );
  await stop(worker);
  // A real synthesis failure surfaces in UI and retry preserves the saved manuscript.
  const failedResponse = await upload(
    alice,
    "The story was waiting for a voice.",
    "retry.txt",
  );
  const failedBook = (await failedResponse.json()).book;
  worker = launch(process.execPath, ["scripts/run-worker.mjs"]); // Inject a temporarily missing model in the worker's private env.
  await stop(worker);
  const validModel = environment.NARRATOR_MODEL_DIR;
  environment.NARRATOR_MODEL_DIR = path.join(folder, "missing-model");
  startWorker();
  await waitFor(
    () =>
      db.prepare("SELECT status FROM books WHERE id=?").get(failedBook.id)
        .status === "failed",
    "failure persists",
  );
  await stop(worker);
  if (validModel) environment.NARRATOR_MODEL_DIR = validModel;
  else delete environment.NARRATOR_MODEL_DIR;
  const retry = await request(`/api/books/${failedBook.id}/generate`, alice, {
    method: "POST",
    headers: { origin: base },
  });
  assert.equal(retry.status, 200);
  startWorker();
  await completed(failedBook.id, alice);
  await stop(worker);
  const exportFailure = await upload(
    alice,
    "Chapter One\nA tale worth keeping.\n\nChapter Two\nIts ending was happy.",
    "export-retry.txt",
  );
  assert.equal(exportFailure.status, 201);
  const exportBook = (await exportFailure.json()).book;
  environment.NARRATOR_FFMPEG = path.join(folder, "missing-ffmpeg");
  startWorker();
  await waitFor(
    () =>
      db.prepare("SELECT status FROM books WHERE id=?").get(exportBook.id)
        .status === "failed",
    "export failure persists",
  );
  await stop(worker);
  const savedChapters = db
    .prepare(
      "SELECT audio_path FROM chapters WHERE book_id=? ORDER BY chapter_index",
    )
    .all(exportBook.id);
  assert.ok(savedChapters.every((c) => c.audio_path));
  delete environment.NARRATOR_FFMPEG;
  assert.equal(
    (
      await request(`/api/books/${exportBook.id}/generate`, alice, {
        method: "POST",
        headers: { origin: base },
      })
    ).status,
    200,
  );
  startWorker();
  await completed(exportBook.id, alice);
  assert.deepEqual(
    db
      .prepare(
        "SELECT audio_path FROM chapters WHERE book_id=? ORDER BY chapter_index",
      )
      .all(exportBook.id),
    savedChapters,
  );
  console.log(
    "PASS: durable sessions/files after server restart, crashed worker recovery and failed-job retry",
  );
  if (process.env.NARRATOR_BROWSER_TESTS === "1") {
    const { verifyBrowser } = await import("./browser-e2e.mjs");
    await verifyBrowser({ base, folder });
  }
  assert.equal(
    (
      await request(`/api/books/${book.id}/generate`, alice, {
        method: "POST",
        headers: { origin: base },
      })
    ).status,
    200,
  );
  assert.equal(
    db
      .prepare("SELECT COUNT(*) AS n FROM chapters WHERE book_id=?")
      .get(book.id).n,
    2,
  );
  assert.equal(
    (
      await request(`/api/books/${book.id}`, alice, {
        method: "DELETE",
        headers: { origin: base },
      })
    ).status,
    200,
  );
  assert.equal((await request(chapter.audioUrl, alice)).status, 404);
  assert.equal(
    (
      await request("/api/auth/sign-out", alice, {
        method: "POST",
        headers: { origin: base, "content-type": "application/json" },
        body: "{}",
      })
    ).status,
    200,
  );
  assert.equal((await request("/api/books", alice)).status, 401);
  console.log(
    "PASS: completed generation remains idempotent, deletion and session revocation",
  );
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  for (const child of children) await stop(child);
  db?.close();
  await rm(folder, { recursive: true, force: true });
}
