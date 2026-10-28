import { test, expect } from "@playwright/test";
const KEY = "chalk-dynasty-v2";
async function state(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
}
async function draftFive(page) {
  const eras = [],
    teams = [],
    ids = [];
  for (let i = 0; i < 5; i++) {
    const g = await state(page);
    eras.push(g.eras[i]);
    teams.push(g.draftTeams[i]);
    const choices = page.getByRole("button", { name: /^Draft / });
    await expect(choices).toHaveCount(5);
    await choices.nth(i % 5).click();
    const next = await state(page);
    ids.push(next.roster.at(-1));
  }
  expect(new Set(eras).size).toBe(5);
  expect(new Set(ids).size).toBe(5);
  expect(teams.every(Boolean)).toBeTruthy();
  await expect(
    page.getByRole("button", { name: "Run the play", exact: false }),
  ).toBeVisible();
  return ids;
}
async function courtPoint(page, x, y) {
  await page.locator(".court").scrollIntoViewIfNeeded();
  const r = await page.locator(".court").boundingBox();
  return { x: r.x + (x / 500) * r.width, y: r.y + (y / 470) * r.height };
}
async function tapCourt(page, x, y, mobile) {
  const p = await courtPoint(page, x, y);
  mobile
    ? await page.touchscreen.tap(p.x, p.y)
    : await page.mouse.click(p.x, p.y);
}
async function dragPoint(page, from, to, mobile) {
  const a = await courtPoint(page, ...from),
    b = await courtPoint(page, ...to);
  if (mobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: a.x, y: a.y }],
    });
    for (let i = 1; i <= 8; i++)
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: a.x + ((b.x - a.x) * i) / 8, y: a.y + ((b.y - a.y) * i) / 8 },
        ],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await cdp.detach();
  } else {
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 8 });
    await page.mouse.up();
  }
}
async function runWithRandom(page, value) {
  await page.evaluate((value) => {
    Math.random = () => value;
  }, value);
  const before = (await state(page)).totalAttempts;
  await page
    .getByRole("button", { name: "Run the play", exact: false })
    .click();
  await expect
    .poll(async () => (await state(page)).totalAttempts)
    .toBe(before + 1);
}
test("full draft, team-era variety, resume, court editing, undo, both modes and pass validation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await draftFive(page);
  const ids = (await state(page)).roster;
  await page.reload();
  await expect(page.locator(".roster-strip button")).toHaveCount(5);
  expect((await state(page)).roster).toEqual(ids);
  const mobile = info.project.name === "mobile";
  await page.getByRole("button", { name: "Position", exact: true }).click();
  await dragPoint(page, [250, 365], [220, 340], mobile);
  expect((await state(page)).play.positions[0].x).toBeCloseTo(220, 0);
  await page
    .getByRole("button", { name: "Undo last edit", exact: true })
    .click();
  expect((await state(page)).play.positions[0].x).toBe(250);
  await page.getByRole("button", { name: "Draw route", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear selected player route", exact: true })
    .click();
  await tapCourt(page, 225, 260, mobile);
  await tapCourt(page, 220, 190, mobile);
  expect((await state(page)).play.routes[0]).toHaveLength(2);
  await page
    .getByRole("button", { name: "Undo last edit", exact: true })
    .click();
  expect((await state(page)).play.routes[0]).toHaveLength(1);
  await page
    .getByRole("button", { name: "Load example play", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Routes + passes", exact: true })
    .click();
  await expect(page.locator(".pass-sequence>span")).toHaveCount(3);
  await page.getByLabel("TAKES THE SHOT", { exact: true }).selectOption("3");
  await expect(page.getByRole("alert")).toContainText("End the pass sequence");
  await expect(
    page.getByRole("button", { name: "Run the play", exact: false }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: /^Pass to / })
    .nth(3)
    .click();
  await expect(
    page.getByRole("button", { name: "Run the play", exact: false }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: /^Pass to / })
    .nth(3)
    .click();
  await expect(page.getByRole("alert")).toContainText("themselves");
  await page.getByRole("button", { name: "Undo pass", exact: true }).click();
  await page.getByRole("button", { name: "Draw route", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear selected player route", exact: true })
    .click();
  await dragPoint(page, [235, 265], [195, 200], mobile);
  expect((await state(page)).play.routes[0].length).toBeGreaterThan(1);
  await runWithRandom(page, 0.99);
  await expect(page.locator(".result-panel")).toContainText("Off the mark.");
  await expect(page.locator(".result-panel")).toContainText(
    "game-model chance",
  );
  await page.getByRole("button", { name: "Routes", exact: true }).click();
  await runWithRandom(page, 0.001);
  await expect(page.locator(".result-panel")).toContainText("picked off");
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${info.project.name}-game.png`,
    fullPage: true,
  });
});
test("all five challenge levels, animated makes, final victory and complete reset", async ({
  page,
}) => {
  await page.goto("/");
  await draftFive(page);
  // Move shooter 1 to a high-percentage rim look; keep a no-pass possession.
  await page.getByRole("button", { name: "Position", exact: true }).click();
  await page.getByLabel("TAKES THE SHOT", { exact: true }).selectOption("0");
  await page
    .getByRole("button", { name: "Clear selected player route", exact: true })
    .click();
  await page.evaluate(() => {
    Math.random = () => 0.13;
  });
  for (let level = 0; level < 5; level++) {
    for (let i = 0; i < 3; i++) await runWithRandom(page, 0.13);
    await expect(page.locator(".round-outcome")).toContainText(
      "Defense beaten.",
    );
    await page
      .getByRole("button", {
        name: level === 4 ? "Claim the dynasty" : "Next defense",
        exact: false,
      })
      .click();
    if (level < 4) expect((await state(page)).level).toBe(level + 1);
  }
  await expect(
    page.getByRole("heading", { name: /The chalkboard/ }),
  ).toBeVisible();
  expect((await state(page)).victory).toBeTruthy();
  expect((await state(page)).totalAttempts).toBe(15);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /The chalkboard/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Build another dynasty", exact: false })
    .click();
  await expect(page.getByRole("button", { name: /^Draft / })).toHaveCount(5);
  expect((await state(page)).roster).toHaveLength(0);
});
test("failed round allows unlimited retry, revision and reset confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await draftFive(page);
  for (let i = 0; i < 3; i++) await runWithRandom(page, 0.99);
  await expect(
    page.getByRole("button", { name: "Retry this defense", exact: false }),
  ).toBeVisible();
  const ids = (await state(page)).roster;
  await page
    .getByRole("button", { name: "Retry this defense", exact: false })
    .click();
  expect((await state(page)).results).toHaveLength(0);
  expect((await state(page)).round).toBe(2);
  expect((await state(page)).roster).toEqual(ids);
  await page.getByRole("button", { name: "New draft", exact: false }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep playing", exact: true }).click();
  expect((await state(page)).roster).toEqual(ids);
  await page.getByRole("button", { name: "New draft", exact: false }).click();
  await page.getByRole("button", { name: "Start fresh", exact: false }).click();
  expect((await state(page)).roster).toHaveLength(0);
});
test("responsive layout, help dialog, data search and historical unavailable stats", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator(".player-card")).toHaveCount(5);
  for (const width of info.project.name === "mobile"
    ? [320, 390, 430]
    : [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "How to play", exact: false }).click();
  await expect(page.getByRole("dialog")).toContainText("Routes + passes");
  await page
    .getByRole("button", { name: "Let’s draw it up", exact: false })
    .click();
  await page
    .getByRole("button", { name: "Data & credits", exact: false })
    .click();
  await expect(page.getByRole("dialog")).toContainText("1,231 unique players");
  await page.getByLabel("Search source records").fill("Bill Russell");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("—");
  await page.getByLabel("Search source records").fill("Utah Jazz");
  await expect(page.locator("tbody tr")).not.toHaveCount(0);
  await page
    .getByRole("button", { name: "Close information", exact: true })
    .click();
  await draftFive(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("keyboard editing, modal Escape, corrupt saved-state recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    (key) => localStorage.setItem(key, '{"version":2,"play":{}}'),
    KEY,
  );
  await page.reload();
  await expect(page.getByRole("button", { name: /^Draft / })).toHaveCount(5);
  await draftFive(page);
  await page.getByRole("button", { name: "Position", exact: true }).click();
  const marker = page.locator(".offensive-player").first();
  await marker.focus();
  await page.keyboard.press("ArrowLeft");
  expect((await state(page)).play.positions[0].x).toBe(240);
  await page.getByRole("button", { name: "Draw route", exact: true }).click();
  await marker.focus();
  const count = (await state(page)).play.routes[0].length;
  await page.keyboard.press("ArrowUp");
  expect((await state(page)).play.routes[0]).toHaveLength(count + 1);
  await page.getByRole("button", { name: "How to play", exact: false }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("unmodified random gameplay completes a possession without runtime network dependencies", async ({
  page,
  baseURL,
}) => {
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL).origin)
      requests.push(request.url());
  });
  await page.goto("/");
  await draftFive(page);
  await page
    .getByRole("button", { name: "Run the play", exact: false })
    .click();
  await expect.poll(async () => (await state(page)).totalAttempts).toBe(1);
  const g = await state(page);
  expect(g.results).toHaveLength(1);
  expect(typeof g.results[0]).toBe("boolean");
  await expect(page.locator(".result-panel")).toHaveClass(/has-result/);
  expect(requests).toEqual([]);
});

test("clear-all and full reset have separate semantics, support undo, and preserve the challenge", async ({
  page,
}, info) => {
  await page.goto("/");
  await draftFive(page);
  await page
    .getByRole("button", { name: "Routes + passes", exact: true })
    .click();
  await page.getByRole("button", { name: "Position", exact: true }).click();
  await dragPoint(page, [250, 365], [220, 340], info.project.name === "mobile");
  const before = await state(page);
  await page
    .getByRole("button", { name: "Clear all routes", exact: true })
    .click();
  let g = await state(page);
  expect(g.play.routes.every((r) => r.length === 0)).toBeTruthy();
  expect(g.play.positions).toEqual(before.play.positions);
  expect(g.play.passes).toEqual(before.play.passes);
  await page
    .getByRole("button", { name: "Undo last edit", exact: true })
    .click();
  expect((await state(page)).play).toEqual(before.play);
  await page
    .getByRole("button", { name: "Try a screen & cut", exact: false })
    .click();
  const screened = await state(page);
  expect(screened.play.screen).toEqual({ screener: 3, cutter: 1 });
  await page.getByRole("button", { name: "Full reset", exact: true }).click();
  g = await state(page);
  expect(g.play.routes.every((r) => r.length === 0)).toBeTruthy();
  expect(g.play.positions[0]).toEqual({ x: 250, y: 365 });
  expect(g.play.screen).toBeNull();
  expect(g.play.passes).toEqual([0, 1]);
  expect(g.play.passBeats).toEqual([2]);
  expect(g.roster).toEqual(before.roster);
  expect(g.level).toEqual(before.level);
  expect(g.results).toEqual(before.results);
  await page
    .getByRole("button", { name: "Undo last edit", exact: true })
    .click();
  expect((await state(page)).play).toEqual(screened.play);
  await page.reload();
  expect((await state(page)).play).toEqual(screened.play);
});
test("screen, cut, pass timing and replay work in both modes with understandable validation", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await draftFive(page);
  await page
    .getByRole("button", { name: "Try a screen & cut", exact: false })
    .click();
  await expect(page.locator(".screen-marker")).toHaveCount(1);
  await expect(page.getByLabel("Screen setter", { exact: true })).toHaveValue(
    "3",
  );
  await expect(page.getByLabel("Screen for", { exact: true })).toHaveValue("1");
  await expect(
    page.getByLabel("Selected player’s route runs during", { exact: true }),
  ).toHaveValue("1");
  await page
    .getByLabel("Selected player’s route runs during", { exact: true })
    .selectOption("2");
  expect((await state(page)).play.routeBeats[1]).toBe(2);
  await page
    .getByLabel("Selected player’s route runs during", { exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "Routes + passes", exact: true })
    .click();
  await page.getByLabel("Timing for pass 1", { exact: true }).selectOption("0");
  expect((await state(page)).play.passBeats).toEqual([0]);
  await page.getByLabel("Timing for pass 1", { exact: true }).selectOption("1");
  await runWithRandom(page, 0.99);
  await expect(page.locator(".result-panel")).toContainText("screen slowed");
  await page
    .getByRole("button", { name: "Pass to ", exact: false })
    .first()
    .click();
  await page.getByLabel("TAKES THE SHOT", { exact: true }).selectOption("0");
  await page.getByLabel("Timing for pass 2", { exact: true }).selectOption("0");
  await expect(page.getByRole("alert")).toContainText(
    "Pass timings must follow",
  );
  await expect(
    page.getByRole("button", { name: "Run the play", exact: false }),
  ).toBeDisabled();
  await page.getByLabel("Timing for pass 2", { exact: true }).selectOption("2");
  await expect(
    page.getByRole("button", { name: "Run the play", exact: false }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Routes", exact: true }).click();
  await runWithRandom(page, 0.99);
  expect((await state(page)).totalAttempts).toBe(2);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/${info.project.name}-sequencing.png`,
    fullPage: true,
  });
});
