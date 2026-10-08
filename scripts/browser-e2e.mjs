import assert from "node:assert/strict";
export async function verifyBrowser({ base, folder }) {
  const { chromium } = await import(
    process.env.NARRATOR_PLAYWRIGHT_IMPORT || "playwright"
  );
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.NARRATOR_CHROMIUM_PATH || undefined,
    args: process.env.NARRATOR_CHROMIUM_PATH
      ? [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--autoplay-policy=no-user-gesture-required",
        ]
      : [],
  });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  async function audit() {
    if (!process.env.NARRATOR_AXE_IMPORT) return;
    const { default: AxeBuilder } = await import(
      process.env.NARRATOR_AXE_IMPORT
    );
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      report.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          summary: n.failureSummary,
        })),
      })),
      [],
    );
  }
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(base + "/upload");
    await page.waitForURL(/\/login\?next/);
    await audit();
    await page.getByRole("link", { name: "Create a free account" }).click();
    await audit();
    await page.getByLabel("Your name").fill("A Browser Author");
    await page.getByLabel("Email address").fill("browser@example.test");
    await page
      .getByLabel("Password", { exact: true })
      .fill("browser-test-password");
    await page.getByRole("button", { name: "Create free account" }).click();
    await page.waitForURL(base + "/upload");
    await page.locator('input[type="file"]').setInputFiles({
      name: "browser-story.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Chapter One\nThe quiet room filled with the sound of a new story.",
      ),
    });
    await page.getByLabel("Book title").fill("The browser story");
    await page.getByLabel("Author name").fill("A Browser Author");
    await page.getByRole("button", { name: "Continue to narrator" }).click();
    await page.getByRole("button", { name: "Create my audiobook" }).click();
    await page.waitForURL(/\/processing\?bookId=/);
    await page
      .getByRole("link", { name: "Open listening room" })
      .waitFor({ timeout: 120000 });
    await page.getByRole("link", { name: "Open listening room" }).click();
    await page.waitForURL(/\/player/);
    await page
      .getByRole("link", { name: "Download MP3", exact: true })
      .waitFor();
    const audio = page.locator("audio").first();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.waitForFunction(() => {
      const audio = document.querySelector("audio");
      return audio && !audio.paused && audio.currentTime > 0;
    });
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page
      .getByRole("slider", { name: "Playback position", exact: true })
      .press("ArrowRight");
    await page
      .getByRole("slider", { name: "Volume", exact: true })
      .press("ArrowLeft");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Download MP3", exact: true }).click();
    const download = await downloadPromise;
    assert.equal(await download.failure(), null);
    await page.screenshot({
      path:
        (process.env.NARRATOR_TEST_ARTIFACT_DIR || folder) +
        "/listening-room.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await audit();
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForURL(base + "/login");
    await page.goto(base + "/login?next=https%3A%2F%2Fattacker.test");
    await page.getByLabel("Email address").fill("browser@example.test");
    await page.getByLabel("Password", { exact: true }).fill("wrong-password");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.getByRole("alert").waitFor();
    await page
      .getByLabel("Password", { exact: true })
      .fill("browser-test-password");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await page.waitForURL(base + "/library");
    await page
      .getByText("The browser story", { exact: true })
      .first()
      .waitFor();
    await audit();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await audit();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile browser signup → upload → real narration → play → MP3 → logout/login",
    );
  } finally {
    await browser.close();
  }
}
