import { test, expect } from "@playwright/test";
const KEY = "chalk-dynasty-v2";
const read = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
async function draft(page, { tutorial = false, offset = 0 } = {}) {
  await page.goto("/");
  for (let i = 0; i < 5; i++) {
    const choices = page.getByRole("button", { name: /^Draft / });
    await expect(choices).toHaveCount(5 - i);
    await choices.nth((offset + i) % (5 - i)).click();
  }
  if (!tutorial)
    await page
      .getByRole("button", { name: "Skip · I’m ready to play" })
      .click();
  await expect(page.locator(".court")).toBeVisible();
}
async function select(page, i) {
  await page.locator(`[data-player="${i}"]`).press("Enter");
}
async function point(page, x, y) {
  const r = await page.locator(".court").boundingBox();
  return { x: r.x + (x / 500) * r.width, y: r.y + (y / 470) * r.height };
}
async function tap(page, x, y, mobile) {
  const p = await point(page, x, y);
  mobile
    ? await page.touchscreen.tap(p.x, p.y)
    : await page.mouse.click(p.x, p.y);
}
async function drag(page, a, b, mobile) {
  a = await point(page, ...a);
  b = await point(page, ...b);
  if (mobile) {
    const c = await page.context().newCDPSession(page);
    await c.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [a],
    });
    for (let i = 1; i <= 10; i++)
      await c.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: a.x + ((b.x - a.x) * i) / 10, y: a.y + ((b.y - a.y) * i) / 10 },
        ],
      });
    await c.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await c.detach();
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 });
    await page.mouse.up();
  }
}
async function run(page) {
  const n = (await read(page)).totalAttempts;
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect.poll(async () => (await read(page)).totalAttempts).toBe(n + 1);
  await expect(page.locator(".court-result")).toBeVisible();
}

test("draft completes each position once, details and source search work, save resumes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: /^Details for / })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Regular-season per-game",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByRole("button", { name: /^Draft / })).toHaveCount(
      5 - i,
    );
    await page
      .getByRole("button", { name: /^Draft / })
      .first()
      .click();
    if (i === 1) await page.reload();
  }
  await page.getByRole("button", { name: "Skip · I’m ready to play" }).click();
  const g = await read(page);
  const positions = await page.evaluate(async (keys) => {
    const data = await fetch("/players.json").then((r) => r.json());
    return keys.map((k) => data.find((p) => p.key === k).position);
  }, g.roster);
  expect([...positions].sort()).toEqual(["C", "PF", "PG", "SF", "SG"]);
  expect(new Set(g.eras).size).toBe(5);
  await page.reload();
  expect((await read(page)).roster).toEqual(g.roster);
  await expect(page.locator(".warmup-card")).toHaveCount(0);
  await page.getByRole("button", { name: "Stats and credits" }).click();
  await page
    .getByRole("textbox", { name: "Search source records" })
    .fill("Wilt Chamberlain");
  await expect(page.locator(".source-records")).toContainText("— STL");
  await page.getByRole("button", { name: "Close dialog" }).click();
});

test("every handler is available in auto mode and survives plays, clear, reset, run and reload", async ({
  page,
}) => {
  await draft(page);
  const roster = (await read(page)).roster;
  for (let i = 0; i < 5; i++) {
    await select(page, i);
    await page
      .getByRole("button", { name: "Start with ball", exact: true })
      .click();
    await page.getByRole("button", { name: "Use automatic passing" }).click();
    expect((await read(page)).play.starter).toBe(i);
  }
  for (const name of [
    "Load Backdoor cut",
    "Load Screen & cut",
    "Load Pick & roll",
    "Load Give & go",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect((await read(page)).play.starter).toBe(4);
  }
  await page.getByRole("button", { name: "Use automatic passing" }).click();
  await page.getByRole("button", { name: "Clear all routes" }).click();
  await page.getByRole("button", { name: "Full reset" }).click();
  await select(page, 2);
  await page
    .getByRole("button", { name: "Take the shot", exact: true })
    .click();
  expect((await read(page)).play.starter).toBe(4);
  await page.getByRole("button", { name: "Load Backdoor cut" }).click();
  await page.reload();
  expect((await read(page)).play.starter).toBe(4);
  expect((await read(page)).play.shooter).toBe(2);
  await expect(page.locator('.court [data-player="4"]')).toHaveAttribute(
    "data-ball",
    "true",
  );
  await expect(page.locator("select")).toHaveCount(0);
  await run(page);
  expect((await read(page)).play.starter).toBe(4);
  expect((await read(page)).roster).toEqual(roster);
});

test("mouse and touch draw implied off-ball screens; undo and real possession work", async ({
  page,
}, info) => {
  const mobile = info.project.name === "mobile";
  await draft(page);
  await page.getByRole("button", { name: "Full reset" }).click();
  await drag(page, [145, 145], [100, 253], mobile);
  let g = await read(page);
  expect(g.play.routes[3].at(-1).x).toBeCloseTo(100, 0);
  await expect(
    page.locator('[data-screener="3"][data-cutter="1"]'),
  ).toBeVisible();
  await select(page, 1);
  await tap(page, 130, 260, mobile);
  await tap(page, 165, 185, mobile);
  await tap(page, 265, 105, mobile);
  await page
    .getByRole("button", { name: "Take the shot", exact: true })
    .click();
  await select(page, 0);
  await page
    .getByRole("button", { name: "Start with ball", exact: true })
    .click();
  await run(page);
  await expect(page.locator(".live-cue")).toContainText(
    /screen|pick|pass|look|defender|shot/i,
  );
  await page.getByRole("button", { name: "Next possession" }).click();
  await page.getByRole("button", { name: "Load Pick & roll" }).click();
  await expect(page.locator(".screen-marker")).toContainText(["PICK + ROLL"]);
});

test("clear keeps spots, full reset restores formation, undo and reload preserve team and roles", async ({
  page,
}, info) => {
  await draft(page);
  await page.getByRole("button", { name: "Full reset" }).click();
  const original = (await read(page)).play.positions;
  await page.getByRole("button", { name: "Move players" }).click();
  await drag(page, [250, 365], [215, 335], info.project.name === "mobile");
  await expect
    .poll(async () => (await read(page)).play.positions[0].x)
    .toBeCloseTo(215, 0);
  let g = await read(page);
  const moved = g.play.positions;
  await page.getByRole("button", { name: "Draw route" }).click();
  await tap(page, 220, 240, info.project.name === "mobile");
  const route = (await read(page)).play.routes;
  await page.getByRole("button", { name: "Clear all routes" }).click();
  g = await read(page);
  expect(g.play.positions).toEqual(moved);
  expect(g.play.routes.every((r) => !r.length)).toBeTruthy();
  await page.getByRole("button", { name: "Undo last edit" }).click();
  expect((await read(page)).play.routes).toEqual(route);
  await page.getByRole("button", { name: "Full reset" }).click();
  expect((await read(page)).play.positions).toEqual(original);
  await page.getByRole("button", { name: "Undo last edit" }).click();
  expect((await read(page)).play.positions).toEqual(moved);
  await page.reload();
  expect((await read(page)).play.positions).toEqual(moved);
  expect((await read(page)).roster).toEqual(g.roster);
});

test("court pass arrows are editable and automatic delivery retains explicit roles", async ({
  page,
}) => {
  await draft(page);
  await select(page, 3);
  await page
    .getByRole("button", { name: "Start with ball", exact: true })
    .click();
  await page.getByRole("button", { name: "Draw pass", exact: true }).click();
  await select(page, 1);
  await select(page, 4);
  let p = (await read(page)).play;
  expect(p.passes).toEqual([3, 1, 4]);
  expect(p.shooter).toBe(4);
  expect(p.starter).toBe(3);
  await expect(page.locator(".pass-arrow")).toHaveCount(2);
  await page.getByRole("button", { name: "Use automatic passing" }).click();
  p = (await read(page)).play;
  expect(p.starter).toBe(3);
  expect(p.shooter).toBe(4);
  expect(p.mode).toBe("routes");
  await page.getByRole("button", { name: "Load Screen & cut" }).click();
  await run(page);
  await expect(page.locator(".basketball")).toHaveCount(1);
});

test("optional playable coaching teaches ball, cut and shot without consuming a real attempt", async ({
  page,
}) => {
  await draft(page, { tutorial: true });
  await page.getByRole("button", { name: "30-second warm-up" }).click();
  await expect(page.locator(".live-cue")).toContainText("COACH · 1");
  await select(page, 3);
  await page
    .getByRole("button", { name: "Start with ball", exact: true })
    .click();
  await expect(page.locator(".live-cue")).toContainText("COACH · 2");
  await page.getByRole("button", { name: "Load Backdoor cut" }).click();
  await expect(page.locator(".live-cue")).toContainText("COACH · 3");
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start challenge" }),
  ).toBeVisible();
  expect((await read(page)).totalAttempts).toBe(0);
  expect((await read(page)).play.starter).toBe(3);
  await page.getByRole("button", { name: "Start challenge" }).click();
  await run(page);
  expect((await read(page)).totalAttempts).toBe(1);
});

test("keyboard, sound preference, reset confirmation and malformed-save recovery", async ({
  page,
}) => {
  await draft(page);
  await page.getByRole("button", { name: "Full reset" }).click();
  await page.locator('[data-player="0"]').press("ArrowUp");
  expect((await read(page)).play.routes[0]).toHaveLength(1);
  await page.getByRole("button", { name: "Turn sound on" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mute sound" })).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const roster = (await read(page)).roster;
  await page.getByRole("button", { name: "New draft", exact: true }).click();
  await page.getByRole("button", { name: "Keep playing" }).click();
  expect((await read(page)).roster).toEqual(roster);
  await page.getByRole("button", { name: "New draft", exact: true }).click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("button", { name: /^Draft / })).toHaveCount(5);
  await page.evaluate((k) => localStorage.setItem(k, "{broken"), KEY);
  await page.reload();
  await expect(page.getByRole("button", { name: /^Draft / })).toHaveCount(5);
});

test("court and core actions fit phone, tablet and desktop viewports without scrolling", async ({
  page,
}) => {
  await draft(page);
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    const bounds = await page.evaluate(() => ({
      w: document.documentElement.scrollWidth,
      h: document.documentElement.scrollHeight,
      innerH: innerHeight,
    }));
    expect(bounds.w).toBeLessThanOrEqual(width);
    expect(bounds.h).toBeLessThanOrEqual(height + 1);
    for (const selector of [
      ".court",
      ".run-button",
      ".player-actions",
      ".court-toolbar",
    ]) {
      const r = await page.locator(selector).boundingBox();
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(width + 1);
      expect(r.y + r.height).toBeLessThanOrEqual(height + 1);
    }
  }
});

test("ordinary randomness: drafted team completes all five opponents with honest retries", async ({
  page,
}, info) => {
  test.setTimeout(240000);
  const errors = [],
    foreign = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      !r
        .url()
        .startsWith(
          new URL(
            info.project.use.baseURL ||
              process.env.PLAYWRIGHT_BASE_URL ||
              "http://localhost:5173",
          ).origin,
        ) &&
      !r.url().startsWith("data:")
    )
      foreign.push(r.url());
  });
  await draft(page, { offset: info.project.name === "mobile" ? 2 : 1 });
  const beginning = await read(page),
    log = [];
  for (let level = 0; level < 5; level++) {
    if (level === 4) {
      await page.getByRole("button", { name: "Meet their five" }).click();
      await expect(page.locator(".boss-lineup button")).toHaveCount(5);
      await page.locator(".boss-lineup button").first().click();
      await expect(page.getByRole("dialog")).toContainText(
        "Regular-season per-game",
      );
      await page.getByRole("button", { name: "Close dialog" }).click();
    }
    await page
      .getByRole("button", {
        name: [
          "Load Backdoor cut",
          "Load Backdoor cut",
          "Load Screen & cut",
          "Load Pick & roll",
          "Load Screen & cut",
        ][level],
        exact: true,
      })
      .click();
    let attempts = 0,
      retries = 0;
    while (
      !(await page
        .getByRole("button", {
          name: level === 4 ? "Claim the trophy" : "Next opponent",
          exact: true,
        })
        .isVisible()) &&
      attempts < 100
    ) {
      if (
        await page
          .getByRole("button", { name: "Rematch", exact: true })
          .isVisible()
      ) {
        retries++;
        await page
          .getByRole("button", { name: "Rematch", exact: true })
          .click();
      } else if (
        await page
          .getByRole("button", { name: "Next possession", exact: true })
          .isVisible()
      )
        await page
          .getByRole("button", { name: "Next possession", exact: true })
          .click();
      await run(page);
      attempts++;
    }
    log.push({ level: level + 1, attempts, retries });
    await page
      .getByRole("button", {
        name: level === 4 ? "Claim the trophy" : "Next opponent",
        exact: true,
      })
      .click();
  }
  await expect(page.locator(".victory-screen")).toContainText("THE SUPERTEAM");
  expect((await read(page)).roster).toEqual(beginning.roster);
  expect(errors).toEqual([]);
  expect(foreign).toEqual([]);
  await info.attach("ordinary-ladder.json", {
    body: JSON.stringify(
      { project: info.project.name, roster: beginning.roster, log },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await page.reload();
  await expect(page.locator(".victory-screen")).toBeVisible();
});

test("browse position alternatives, compare details, draft the chosen player and keep the slot locked", async ({
  page,
}, info) => {
  await page.goto("/");
  const card = page
    .locator(".draft-card")
    .filter({ has: page.locator(".candidate-picker button:not(:disabled)") })
    .first();
  const position = await card.locator(".card-top>b").innerText();
  const original = await card.locator("h3").innerText();
  const next = card.getByRole("button", {
    name: `Next ${position} player`,
    exact: true,
  });
  const previous = card.getByRole("button", {
    name: `Previous ${position} player`,
    exact: true,
  });
  const click = (locator) =>
    info.project.name === "mobile" ? locator.tap() : locator.click();
  await click(next);
  const alternative = await card.locator("h3").innerText();
  expect(alternative).not.toBe(original);
  await click(previous);
  await expect(card.locator("h3")).toHaveText(original);
  await click(next);
  await expect(card.locator("h3")).toHaveText(alternative);
  await card
    .getByRole("button", { name: `Details for ${alternative}`, exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(alternative);
  await expect(page.getByRole("dialog")).toContainText(
    "Regular-season per-game",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.screenshot({
    path: `docs/qa/draft-options/${info.project.name}-options.png`,
    fullPage: true,
  });
  await card
    .getByRole("button", { name: `Draft ${alternative}`, exact: true })
    .click();
  const g = await read(page);
  const picked = await page.evaluate(
    async (key) =>
      (await (await fetch("/players.json")).json()).find((p) => p.key === key),
    g.roster[0],
  );
  expect(picked.name).toBe(alternative);
  expect(picked.position).toBe(position);
  expect(picked.era).toBe(g.eras[0]);
  expect(picked.team).toBe(g.draftTeams[0]);
  await page.reload();
  expect((await read(page)).roster).toEqual(g.roster);
  const locked = page.locator(
    `.draft-card[aria-label="${position} candidates"]`,
  );
  await expect(locked.locator(".draft-button")).toBeDisabled();
  await expect(locked.locator(".candidate-picker button")).toHaveCount(2);
  for (const b of await locked.locator(".candidate-picker button").all())
    await expect(b).toBeDisabled();
});

test("a full team of alternative choices can finish the draft and play a real possession", async ({
  page,
}, info) => {
  await page.goto("/");
  let alternatives = 0;
  for (let i = 0; i < 5; i++) {
    const card = page.locator(".draft-card:not(.locked)").first();
    const next = card.locator(".candidate-picker button").last();
    if (await next.isEnabled()) {
      info.project.name === "mobile" ? await next.tap() : await next.click();
      alternatives++;
    }
    const name = await card.locator("h3").innerText();
    await card
      .getByRole("button", { name: `Draft ${name}`, exact: true })
      .click();
    const g = await read(page);
    const p = await page.evaluate(
      async (key) =>
        (await (await fetch("/players.json")).json()).find(
          (p) => p.key === key,
        ),
      g.roster.at(-1),
    );
    expect(p.name).toBe(name);
    if (i === 2) await page.reload();
  }
  expect(alternatives).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Skip · I’m ready to play" }).click();
  await run(page);
  expect((await read(page)).roster).toHaveLength(5);
});
