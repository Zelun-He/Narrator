import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";

const development = process.argv.includes("--dev");
process.env.NODE_ENV = development ? "development" : "production";
nextEnv.loadEnvConfig(process.cwd(), development);
const port = Number(process.env.PORT || 3000);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
process.env.BETTER_AUTH_URL ||= `http://localhost:${port}`;
const children = new Set();
let stopping = false;
let readyTimer;
function stop(code) {
  if (stopping) return;
  stopping = true;
  clearTimeout(readyTimer);
  process.exitCode = code;
  for (const child of children) child.kill("SIGTERM");
  const timer = setTimeout(() => { for (const child of children) child.kill("SIGKILL"); }, 8000);
  timer.unref();
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(0));
function launch(args, label) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: process.env });
  children.add(child);
  child.on("error", error => { console.error(`${label}: ${error.message}`); children.delete(child); stop(1); });
  child.on("exit", code => { children.delete(child); if (!stopping) { console.error(`${label} stopped (${code}). Stopping Narrator.`); stop(code || 1); } });
  return child;
}
async function main() {
  if (!development && !existsSync(".next/BUILD_ID")) throw new Error("Run npm run build before npm start.");
  const models = path.resolve(process.env.NARRATOR_MODEL_DIR || "models");
  const python = process.env.NARRATOR_PYTHON || (existsSync(".venv") ? path.resolve(".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python") : "python3");
  for (const file of ["en_US-ljspeech-medium.onnx", "en_US-ljspeech-medium.onnx.json"]) {
    if (!existsSync(path.join(models, file))) throw new Error("Voice model missing. Run npm run setup:narration after installing the Python requirements (see README). Account-only web server: npm run start:web.");
  }
  for (const [command, args] of [[python, ["-c", "import piper, pypdf, docx"]], [process.env.NARRATOR_FFMPEG || "ffmpeg", ["-version"]]]) {
    await new Promise((resolve, reject) => {
      const probe = spawn(command, args, { stdio: "ignore", env: process.env });
      const timer = setTimeout(() => probe.kill("SIGKILL"), 15000);
      probe.on("error", reject);
      probe.on("close", code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error(`${command} is not ready. Install the narration dependencies documented in README.`)); });
    });
  }
  if (stopping) return;
  console.log(`Starting Narrator with persistent accounts and narration worker on port ${port}.`);
  launch(["node_modules/next/dist/bin/next", development ? "dev" : "start", "-H", process.env.NARRATOR_HOST || "127.0.0.1", "-p", String(port)], "Web server");
  const deadline = Date.now() + 120000;
  async function ready() {
    if (stopping) return;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (response.ok) { if (!stopping) launch(["scripts/run-worker.mjs"], "Narration worker"); return; }
    } catch {}
    if (Date.now() >= deadline) { console.error("Web server did not become ready. Check the database path and auth origin."); stop(1); }
    else readyTimer = setTimeout(ready, 500);
  }
  await ready();
}
main().catch(error => { console.error(error.message); stop(1); });
