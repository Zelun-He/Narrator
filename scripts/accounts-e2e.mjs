import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";

const folder = await mkdtemp(path.join(tmpdir(), "narrator-accounts-"));
const base = `http://127.0.0.1:${process.env.NARRATOR_ACCOUNT_TEST_PORT || 3261}`;
const env = { ...process.env, PORT: new URL(base).port, BETTER_AUTH_URL: base, NARRATOR_DATA_DIR: folder, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" };
delete env.VERCEL;
const password = "a-strong-test-password";
let stack, logs = "", browser;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function launch(args) {
  const child = spawn(process.execPath, args, { env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [child.stdout, child.stderr]) stream.on("data", d => { logs = (logs + d).slice(-16000); if (process.env.NARRATOR_TEST_VERBOSE) process.stdout.write(d); });
  return child;
}
async function stop(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, "exit"); child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 12000);
  await closed; clearTimeout(timer);
}
async function ready(check, label) {
  for (let i = 0; i < 300; i++) { if (await check()) return; await delay(200); }
  throw new Error(`Timed out: ${label}\n${logs}`);
}
async function request(url, cookie = "", options = {}) {
  return fetch(base + url, { ...options, headers: { ...(cookie ? { cookie } : {}), ...options.headers } });
}
async function post(url, cookie, body, origin = base) {
  return request(url, cookie, { method: "POST", headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body) });
}
function cookies(response) { return response.headers.getSetCookie().map(v => v.split(";")[0]).join("; "); }
async function login(email, pass = password) {
  const response = await post("/api/auth/sign-in/email", "", { email, password: pass });
  assert.equal(response.status, 200, await response.text()); return cookies(response);
}
async function start() {
  stack = launch(["scripts/start-stack.mjs"]);
  await ready(async () => { try { return (await fetch(base + "/api/health", { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; } }, "web ready");
  await ready(async () => logs.includes("Narration worker ready"), "worker ready");
}
async function accountCommand(...args) {
  const child = launch(["scripts/run-accounts.mjs", ...args]);
  const [code] = await once(child, "exit"); return code;
}
async function browserChecks(adminCookie, authorCookie) {
  const { chromium } = await import(process.env.NARRATOR_PLAYWRIGHT_IMPORT || "playwright");
  const { default: AxeBuilder } = await import(process.env.NARRATOR_AXE_IMPORT || "@axe-core/playwright");
  browser = await chromium.launch({ headless: true, executablePath: process.env.NARRATOR_CHROMIUM_PATH || undefined, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const page = await context.newPage(), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base);
  for (const width of [320, 375, 390, 430, 767, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const geometry = await page.locator(".story-hero-copy h1").evaluate(el => { const r = el.getBoundingClientRect(); return { center: (r.left + r.right) / 2, align: getComputedStyle(el).textAlign, overflow: document.documentElement.scrollWidth > innerWidth }; });
    assert.equal(geometry.overflow, false, `overflow ${width}`);
    if (width <= 767) { assert.equal(geometry.align, "center"); assert.ok(Math.abs(geometry.center - width / 2) < 1, `center ${width}`); }
    else assert.equal(geometry.align, "start");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  if (process.env.NARRATOR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.NARRATOR_SCREENSHOT_DIR, "landing-centered-mobile.png"), fullPage: true });
  function cookieEntries(cookie) { return cookie.split("; ").map(part => { const at = part.indexOf("="); return { name: part.slice(0, at), value: part.slice(at + 1), url: base }; }); }
  await context.addCookies(cookieEntries(authorCookie));
  await page.goto(base + "/account");
  await page.getByLabel("Display name").fill("Browser Author"); await page.getByRole("button", { name: "Save profile" }).click(); await page.getByText("Your name is saved.").waitFor();
  await page.reload(); assert.equal(await page.getByLabel("Display name").inputValue(), "Browser Author");
  await page.getByRole("button", { name: "Log out other devices" }).click(); await page.getByText("Your other devices have been logged out.").waitFor();
  const axe = async () => { const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze(); assert.deepEqual(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.html) })), []); };
  await axe();
  await page.goto(base + "/requests"); await page.getByText("Audiobook completed", { exact: false }).waitFor(); await axe();
  await page.getByRole("link", { name: "Persistent manuscript" }).first().click(); await page.waitForURL(/bookId=/); await page.getByRole("heading", { name: "Your narration results.", exact: true }).waitFor();
  await context.clearCookies(); await context.addCookies(cookieEntries(adminCookie));
  await page.goto(base + "/admin"); await page.getByText("Migration Author", { exact: true }).waitFor();
  await page.getByLabel("Search by email or name").fill("migration@example.test"); await page.getByRole("button", { name: "Suspend account" }).waitFor();
  await page.getByRole("button", { name: "Suspend account" }).click(); await page.getByRole("button", { name: "Confirm suspend" }).click(); await page.getByRole("button", { name: "Restore access" }).waitFor();
  await page.getByRole("button", { name: "Restore access" }).click(); await page.getByRole("button", { name: "Confirm restore" }).click(); await page.getByRole("button", { name: "Suspend account" }).waitFor(); await axe();
  if (process.env.NARRATOR_SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.NARRATOR_SCREENSHOT_DIR, "account-manager-mobile.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
}
try {
  // Upgrade an existing password account created before the admin plugin was installed.
  const legacyDb = new Database(path.join(folder, "narrator.sqlite"));
  const legacyOptions = { database: legacyDb, secret: "old-test-auth-secret-at-least-32-chars", baseURL: base, emailAndPassword: { enabled: true } };
  await (await getMigrations(legacyOptions)).runMigrations();
  const legacy = betterAuth(legacyOptions);
  await legacy.api.signUpEmail({ body: { name: "Migration Author", email: "migration@example.test", password } });
  legacyDb.close();
  await start();
  const migrated = await login("migration@example.test");
  assert.equal((await request("/api/requests")).status, 401);
  const forgedSignup = await post("/api/auth/sign-up/email", "", { name: "Forged Operator", email: "forged@example.test", password, role: "admin" });
  assert.equal(forgedSignup.status, 400, "signup must reject a supplied role");
  const operatorResponse = await post("/api/auth/sign-up/email", "", { name: "Server Operator", email: "operator@example.test", password });
  assert.equal(operatorResponse.status, 200, await operatorResponse.clone().text()); let operator = cookies(operatorResponse); const operatorId = (await operatorResponse.json()).user.id;
  assert.equal((await request("/api/admin/accounts", operator)).status, 403, "signup role forgery");
  assert.equal(await accountCommand("promote", "operator@example.test"), 0);
  assert.equal((await request("/api/books", operator)).status, 401, "role change revokes sessions");
  operator = await login("operator@example.test");
  const authorResponse = await post("/api/auth/sign-up/email", "", { name: "Private Author", email: "author@example.test", password });
  assert.equal(authorResponse.status, 200); let author = cookies(authorResponse); const authorId = (await authorResponse.json()).user.id;
  assert.equal((await request("/api/admin/accounts", author)).status, 403);
  assert.equal((await request("/admin", author)).status, 404);
  for (const endpoint of ["set-role", "remove-user", "impersonate-user", "ban-user"]) assert.equal((await post(`/api/auth/admin/${endpoint}`, operator, { userId: authorId, role: "admin" })).status, 404);
  assert.equal((await post("/api/admin/accounts", author, { userId: operatorId, action: "suspend" })).status, 403);
  assert.equal((await post("/api/admin/accounts", operator, { userId: operatorId, action: "suspend" })).status, 409);
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: "suspend" }, "https://evil.example")).status, 403);
  assert.equal((await request("/api/requests?page=0", author)).status, 400);
  const injectionSearch = await request("/api/admin/accounts?search=" + encodeURIComponent("' OR 1=1 --"), operator);
  assert.equal(injectionSearch.status, 200); assert.equal((await injectionSearch.json()).total, 0);
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: ["suspend"] })).status, 400);
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: "suspend", extra: "x".repeat(3000) })).status, 413);
  for (const endpoint of ["/api/auth//admin/ban-user", "/api/auth/%61dmin/ban-user", "/api/auth/admin%2Fban-user"])
    assert.equal((await post(endpoint, operator, { userId: authorId })).status, 404);
  const form = new FormData(); form.set("title", "Persistent manuscript"); form.set("author", "Private Author"); form.set("language", "english"); form.set("voiceId", "1");
  form.set("file", new Blob(["Chapter 1\n\nThe library was quiet beneath the moon. Our words would still be waiting in the morning."], { type: "text/plain" }), "persistent.txt");
  const uploaded = await request("/api/books", author, { method: "POST", headers: { origin: base }, body: form });
  assert.equal(uploaded.status, 201, await uploaded.clone().text()); const book = await uploaded.json();
  const bookId = book.book?.id ?? book.id;
  assert.ok(bookId, JSON.stringify(book));
  await ready(async () => (await (await request(`/api/books/${bookId}`, author)).json()).book?.status === "completed", "real narration");
  const history = await (await request("/api/requests", author)).json();
  assert.deepEqual(history.events.map(e => e.state), ["completed", "processing", "queued"]);
  const listedAuthor = (await (await request("/api/admin/accounts?search=author@example.test", operator)).json()).users[0];
  assert.equal(listedAuthor.books, 1); assert.ok(listedAuthor.sessions >= 1);
  assert.equal("password" in listedAuthor || "token" in listedAuthor, false);
  assert.equal((await (await request("/api/requests", migrated)).json()).total, 0);
  const audio = await request(`/api/books/${bookId}/download?format=mp3`, author); assert.equal(audio.status, 200); assert.ok((await audio.arrayBuffer()).byteLength > 100);
  assert.equal((await post("/api/auth/update-user", author, { name: "Saved Author" })).status, 200);
  const otherDevice = await login("author@example.test");
  assert.equal((await post("/api/auth/change-password", author, { currentPassword: "incorrect", newPassword: "a-new-strong-password", revokeOtherSessions: true })).status, 400);
  const changed = await post("/api/auth/change-password", author, { currentPassword: password, newPassword: "a-new-strong-password", revokeOtherSessions: true }); assert.equal(changed.status, 200); author = cookies(changed) || author;
  assert.equal((await request("/api/books", otherDevice)).status, 401);
  assert.equal((await post("/api/auth/sign-in/email", "", { email: "author@example.test", password })).status, 401);
  author = await login("author@example.test", "a-new-strong-password");
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: "suspend" })).status, 200);
  assert.equal((await request("/api/books", author)).status, 401);
  assert.equal((await post("/api/auth/sign-in/email", "", { email: "author@example.test", password: "a-new-strong-password" })).status, 403);
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: "restore" })).status, 200);
  author = await login("author@example.test", "a-new-strong-password");
  assert.equal((await request(`/api/books/${bookId}`, author)).status, 200);
  assert.equal((await post("/api/admin/accounts", operator, { userId: authorId, action: "revoke" })).status, 200);
  assert.equal((await request("/api/books", author)).status, 401);
  author = await login("author@example.test", "a-new-strong-password");
  assert.equal(await accountCommand("demote", "operator@example.test"), 1, "last admin guard");
  const secret = await readFile(path.join(folder, "auth-secret"), "utf8");
  await stop(stack); logs = ""; await start();
  assert.equal(await readFile(path.join(folder, "auth-secret"), "utf8"), secret);
  assert.equal((await request("/api/admin/accounts", operator)).status, 200, "operator session persists");
  assert.deepEqual((await (await request("/api/requests", author)).json()).events, history.events);
  assert.equal((await (await request("/api/auth/get-session", author)).json()).user.name, "Saved Author");
  assert.equal((await request(`/api/books/${bookId}/download?format=mp3`, author)).status, 200);
  if (process.env.NARRATOR_BROWSER_TESTS === "1") await browserChecks(operator, author);
  assert.equal(await accountCommand("status"), 0);
  console.log("PASS: existing-account migration, role forgery/access controls, local operator bootstrap, suspend/restore/revoke, password changes, real MP3, private request history, stack startup/shutdown and restart persistence" + (browser ? ", mobile centering, profile/admin/history browser flows and Axe" : ""));
} catch (error) { console.error(logs); throw error; }
finally { await browser?.close(); await stop(stack); await rm(folder, { recursive: true, force: true }); }
