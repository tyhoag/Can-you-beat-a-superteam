// A visible-UI walkthrough. No state injection, no altered randomness and no forced outcomes.
import { chromium } from "playwright";
import fs from "node:fs";
import { spawn } from "node:child_process";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL))
  throw Error("Broad UX walks run only on the disposable local game.");
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
fs.mkdirSync("test-results/experience-video", { recursive: true });
const summary = [];
for (const [name, viewport, mobile, offset] of [
  ["desktop", { width: 1280, height: 900 }, false, 0],
  ["touch", { width: 390, height: 844 }, true, 2],
]) {
  const context = await browser.newContext({
    viewport,
    hasTouch: mobile,
    isMobile: mobile,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage(),
    errors = [],
    steps = [],
    started = Date.now();
  page.on("pageerror", (e) => errors.push(e.message));
  const stopRecording = await record(
    page,
    `test-results/experience-video/${name}.webm`,
  );
  const click = async (locator) => (mobile ? locator.tap() : locator.click());
  const state = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem("chalk-dynasty-v2")));
  async function capture(title, expected, observed) {
    const filename = `walk-${name}-${steps.length}.png`;
    await page.screenshot({ path: `docs/qa/rebuild/${filename}` });
    steps.push({ title, expected, observed, screenshot: filename });
  }
  await page.goto(baseURL);
  await capture(
    "Draft",
    "Choose a player for each open position.",
    "Five readable cards with position, season, three factual headline stats and detail buttons.",
  );
  for (let i = 0; i < 5; i++) {
    const choices = page.getByRole("button", { name: /^Draft / });
    await click(choices.nth((offset + i) % (5 - i)));
  }
  const roster = (await state()).roster;
  await click(page.getByRole("button", { name: "30-second warm-up" }));
  // Complete the introduction with actual court touch / mouse input.
  await click(page.locator('[data-player="3"]'));
  await click(
    page.getByRole("button", { name: "Start with ball", exact: true }),
  );
  await click(page.getByRole("button", { name: "Load Backdoor cut" }));
  await click(page.getByRole("button", { name: "PLAY", exact: true }));
  await page.getByRole("button", { name: "Start challenge" }).waitFor();
  if ((await state()).totalAttempts !== 0)
    throw Error("Practice consumed a challenge attempt");
  await capture(
    "Practice result",
    "Practice teaches the controls without costing a possession.",
    "Ball choice preserved; real shot feedback; Start challenge is visible.",
  );
  await click(page.getByRole("button", { name: "Start challenge" }));
  const levels = [];
  for (let level = 0; level < 5; level++) {
    const preset = [
      "Load Backdoor cut",
      "Load Backdoor cut",
      "Load Screen & cut",
      "Load Pick & roll",
      "Load Screen & cut",
    ][level];
    await click(page.getByRole("button", { name: preset, exact: true }));
    await capture(
      `Match ${level + 1}`,
      `Same court controls; opponent ${level + 1} and an editable play.`,
      await page.locator(".match-hud").innerText(),
    );
    let attempts = 0,
      retries = 0;
    const results = [];
    const next = page.getByRole("button", {
      name: level === 4 ? "Claim the trophy" : "Next opponent",
      exact: true,
    });
    while (!(await next.isVisible()) && attempts < 100) {
      if (
        await page
          .getByRole("button", { name: "Rematch", exact: true })
          .isVisible()
      ) {
        retries++;
        await click(page.getByRole("button", { name: "Rematch", exact: true }));
      } else if (
        await page
          .getByRole("button", { name: "Next possession", exact: true })
          .isVisible()
      )
        await click(
          page.getByRole("button", { name: "Next possession", exact: true }),
        );
      await click(page.getByRole("button", { name: "PLAY", exact: true }));
      await page.waitForFunction(
        () =>
          !!document.querySelector(".court-result") &&
          !!document.querySelector(".action-dock button:not(:disabled)"),
      );
      // Result text appears shortly before the animation has finished; wait for its action.
      await page
        .getByRole("button", {
          name: /^(Next possession|Rematch|Next opponent|Claim the trophy)$/,
        })
        .waitFor();
      const g = await state();
      results.push(g.results.at(-1));
      attempts++;
    }
    if (!(await next.isVisible()))
      throw Error(
        `Failed to complete ${name} level ${level + 1} in 100 attempts`,
      );
    levels.push({ level: level + 1, attempts, retries, results });
    console.log(
      name,
      "level",
      level + 1,
      attempts,
      "possessions,",
      retries,
      "rematches",
    );
    await click(next);
  }
  await capture(
    "Victory",
    "All five opponents lead to a trophy and retained roster.",
    "Victory screen with drafted jerseys, possession count and a new-run action.",
  );
  const ending = await state();
  if (
    !ending.victory ||
    JSON.stringify(ending.roster) !== JSON.stringify(roster)
  )
    throw Error("Progression lost the roster");
  const path = `test-results/experience-video/${name}.webm`;
  await stopRecording();
  await context.close();
  summary.push({
    name,
    viewport,
    randomness: "Unmodified Math.random. No injected game state.",
    durationSeconds: Math.round((Date.now() - started) / 1000),
    roster,
    levels,
    errors,
    video: path,
    steps,
  });
  fs.writeFileSync(
    "docs/qa/rebuild/walkthroughs.json",
    JSON.stringify(summary, null, 2) + "\n",
  );
}
await browser.close();
console.log("Recorded walks complete.");

async function record(page, path) {
  const session = await page.context().newCDPSession(page);
  const encoder = spawn(
    "/usr/bin/ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "image2pipe",
      "-framerate",
      "15",
      "-vcodec",
      "mjpeg",
      "-i",
      "pipe:0",
      "-vf",
      "pad=ceil(iw/2)*2:ceil(ih/2)*2",
      "-c:v",
      "libvpx-vp9",
      "-deadline",
      "realtime",
      "-cpu-used",
      "8",
      "-crf",
      "38",
      "-b:v",
      "0",
      "-an",
      path,
    ],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let first,
    lastBuffer,
    count = 0,
    tail = "";
  encoder.stderr.on("data", (x) => (tail = (tail + x).slice(-2000)));
  const completed = new Promise((resolve, reject) => {
    encoder.on("error", reject);
    encoder.on("exit", (code) =>
      code === 0 ? resolve() : reject(Error(`Video encoder ${code}: ${tail}`)),
    );
  });
  session.on("Page.screencastFrame", (event) => {
    session
      .send("Page.screencastFrameAck", { sessionId: event.sessionId })
      .catch(() => {});
    const stamp = event.metadata.timestamp;
    first ??= stamp;
    const target = Math.floor((stamp - first) * 15);
    const buffer = Buffer.from(event.data, "base64");
    while (count <= target) {
      encoder.stdin.write(lastBuffer ?? buffer);
      count++;
    }
    lastBuffer = buffer;
  });
  await session.send("Page.startScreencast", {
    format: "jpeg",
    quality: 70,
    everyNthFrame: 2,
  });
  return async () => {
    await session.send("Page.stopScreencast");
    if (lastBuffer) encoder.stdin.write(lastBuffer);
    encoder.stdin.end();
    await completed;
    await session.detach();
  };
}
