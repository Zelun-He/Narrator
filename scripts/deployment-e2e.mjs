import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { verifyBrowser } from "./browser-e2e.mjs";
const folder = await mkdtemp(path.join(tmpdir(), "narrator-deployment-"));
const backend = "http://127.0.0.1:3220", base = "http://127.0.0.1:3221";
const env = { ...process.env, NARRATOR_DATA_DIR: folder, BETTER_AUTH_URL: base, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
delete env.VERCEL; delete env.NARRATOR_BACKEND_URL;
const children = new Set(); let logs = "";
function launch(args, environment = env) {
  const child = spawn(process.execPath, args, { env: environment, stdio: ["ignore", "pipe", "pipe"] });
  children.add(child);
  for (const stream of [child.stdout, child.stderr]) stream.on("data", x => { logs = (logs + x).slice(-18000); });
  child.on("exit", () => children.delete(child));
  return child;
}
async function stop(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exit = once(child, "exit"); child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
  await exit; clearTimeout(timer);
}
async function ready(url) {
  const deadline = Date.now() + 60000;
  while(Date.now() < deadline) {
    try { if((await fetch(url + "/api/health")).ok) return; } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error("Server not ready: " + url + "\n" + logs);
}
function server(port, environment) { return launch(["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(port)], environment); }
async function login(email, password) {
  const r = await fetch(base + "/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ email, password }) });
  assert.equal(r.status, 200, await r.text());
  return r.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
}
try {
  let web = server(3220, env); await ready(backend);
  const frontend = server(3221, { ...env, VERCEL: "1", NARRATOR_BACKEND_URL: backend }); await ready(base);
  const worker = launch(["scripts/run-worker.mjs"]);
  await verifyBrowser({ base, folder });
  const cookie = await login("browser@example.test", "browser-test-password");
  const list = await fetch(base + "/api/books", { headers: { cookie } }).then(r => r.json());
  assert.equal(list.books.length, 1); const id = list.books[0].id;
  const range = await fetch(base + `/api/books/${id}/download?format=mp3`, { headers: { cookie, Range: "bytes=0-127" } });
  assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,128);
  const stranger = await fetch(base + "/api/auth/sign-up/email", { method:"POST",headers:{"Content-Type":"application/json",Origin:base},body:JSON.stringify({name:"Other Author",email:"other@example.test",password:"other-test-password"}) });
  assert.equal(stranger.status,200); const otherCookie = stranger.headers.getSetCookie().map(c=>c.split(";")[0]).join("; ");
  assert.equal((await fetch(base+`/api/books/${id}`,{headers:{cookie:otherCookie}})).status,404);
  const test = launch(["scripts/run-accounts.mjs", "test-account"]); await once(test,"exit");assert.equal(test.exitCode,0,logs);
  const testCookie = await login("testuser@narrator.invalid","123456");
  assert.equal((await fetch(base+"/api/admin/accounts",{headers:{cookie:testCookie}})).status,403);
  const { chromium } = await import(process.env.NARRATOR_PLAYWRIGHT_IMPORT || "playwright");
  const browser = await chromium.launch({ headless:true, executablePath:process.env.NARRATOR_CHROMIUM_PATH || undefined, args:["--no-sandbox"] });
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(base+"/login?next=/upload");
    await page.getByLabel("Email or test username").fill("testuser"); await page.getByLabel("Password",{exact:true}).fill("123456");
    await page.getByRole("button",{name:"Log in",exact:true}).click(); await page.waitForURL(base+"/upload");
    await page.locator("input[type=file]").setInputFiles({name:"test-account-story.txt",mimeType:"text/plain",buffer:Buffer.from("Chapter One\nThis test account can create a real audiobook.")});
    await page.getByLabel("Author name").fill("Test Author"); await page.getByRole("button",{name:"Continue to narrator"}).click();
    await page.getByRole("button",{name:"Create my audiobook"}).click(); await page.waitForURL(/\/processing\?bookId=/);
    await page.getByRole("link",{name:"Open listening room"}).waitFor({timeout:120000});
    await page.getByRole("link",{name:"Open listening room"}).click(); await page.getByRole("link",{name:"Download MP3",exact:true}).waitFor();
  } finally { await browser.close(); }
  // A frontend-only process never writes a private database; backend restart preserves books/sessions.
  await stop(worker); await stop(web); web = server(3220,env); await ready(backend);
  const restored = await fetch(base+"/api/books",{headers:{cookie}}).then(r=>r.json());assert.equal(restored.books[0].id,id);
  assert.equal((await fetch(base+"/account",{headers:{cookie}})).status,200);
  assert.equal((await fetch(base+"/api/requests",{headers:{cookie}})).status,200);
  console.log("PASS: Vercel frontend → persistent backend signup/upload → real Piper MP3 → playback/download/range → ownership → test account → backend restart and saved sessions/books.");
} catch(error) { console.error(logs); throw error; }
finally { await Promise.all([...children].map(stop)); await rm(folder,{recursive:true,force:true}); }
