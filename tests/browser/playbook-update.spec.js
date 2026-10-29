import { test, expect } from "@playwright/test";
import fs from "node:fs";
const KEY = "chalk-dynasty-v2";
const read = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
async function team(page) {
  const g = await read(page);
  return page.evaluate(async (keys) => {
    const data = await fetch("/players.json").then((r) => r.json());
    return keys.map((k) => data.find((p) => p.key === k));
  }, g.roster);
}
async function draftReverse(page) {
  await page.goto("/");
  for (const position of ["C", "PF", "SF", "SG", "PG"]) {
    await page
      .getByRole("article", { name: `${position} candidates`, exact: true })
      .getByRole("button", { name: /^Draft / })
      .click();
  }
  await page.getByRole("button", { name: "Skip · I’m ready to play" }).click();
}

test("automatic give-and-go visibly moves the ball out and back without entering a pass sequence", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await draftReverse(page);
  await page.getByRole("button", { name: "How to play" }).click();
  await page
    .getByRole("group", { name: "Basketball lessons" })
    .getByRole("button", { name: "Passing", exact: true })
    .click();
  await page.getByRole("button", { name: "Try this play" }).click();
  const g = await read(page);
  expect(g.play.mode).toBe("routes");
  expect(g.play.starter).toBe(g.play.shooter);
  let completedReturn = false;
  // Ordinary random interceptions can end an attempt early. Observe up to three
  // real possessions; do not replace randomness or inject a successful result.
  for (let attempt = 0; attempt < 3 && !completedReturn; attempt++) {
    await page.evaluate(() => {
      window.ballOwners = [];
      window.ballObserver?.disconnect();
      window.ballObserver = new MutationObserver(() => {
        const owners = [
          ...document.querySelectorAll('.court [data-ball="true"]'),
        ];
        if (owners.length > 1) throw Error("More than one player has the ball");
        const owner = owners[0]?.getAttribute("data-player");
        if (owner && window.ballOwners.at(-1) !== owner)
          window.ballOwners.push(owner);
      });
      window.ballObserver.observe(document.querySelector(".court"), {
        subtree: true,
        attributes: true,
        attributeFilter: ["data-ball"],
      });
    });
    const used = (await read(page)).totalAttempts;
    await page.getByRole("button", { name: "PLAY", exact: true }).click();
    await expect
      .poll(async () => (await read(page)).totalAttempts)
      .toBe(used + 1);
    const owners = await page.evaluate(() => {
      window.ballObserver.disconnect();
      return window.ballOwners;
    });
    completedReturn =
      owners.some((owner) => Number(owner) !== g.play.starter) &&
      owners.at(-1) === String(g.play.shooter);
    if (!completedReturn && attempt < 2)
      await page
        .getByRole("button", { name: "Next possession", exact: true })
        .click();
  }
  expect(completedReturn).toBeTruthy();
});

test("two team reshuffles retain picks, persist across reload and reset only with a new draft", async ({
  page,
}) => {
  await page.goto("/");
  const before = await read(page);
  await page.getByRole("button", { name: "Reshuffle team · 2 left" }).click();
  let g = await read(page);
  expect(g.eras).toEqual(before.eras);
  expect(g.draftTeams[0]).not.toBe(before.draftTeams[0]);
  expect(g.reshufflesLeft).toBe(1);
  await page
    .getByRole("button", { name: /^Draft / })
    .first()
    .click();
  g = await read(page);
  await page.reload();
  await page.getByRole("button", { name: "Reshuffle team · 1 left" }).click();
  const after = await read(page);
  expect(after.roster).toEqual(g.roster);
  expect(after.eras).toEqual(g.eras);
  expect(after.draftTeams[1]).not.toBe(g.draftTeams[1]);
  await expect(
    page.getByRole("button", { name: "Reshuffle team · 0 left" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: /^Draft / })
    .first()
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Reshuffle team · 0 left" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Restart draft" }).click();
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(
    page.getByRole("button", { name: "Reshuffle team · 2 left" }),
  ).toBeEnabled();
});

test("drafting the point guard last still starts in the correct formation and reset restores it", async ({
  page,
}, info) => {
  await draftReverse(page);
  const g = await read(page),
    roster = await team(page);
  expect(roster.map((p) => p.position)).toEqual(["C", "PF", "SF", "SG", "PG"]);
  expect(g.play.starter).toBe(4);
  expect(g.play.positions[4]).toEqual({ x: 250, y: 365 });
  for (const i of [0, 1]) {
    expect(g.play.positions[i].x).toBeGreaterThan(176);
    expect(g.play.positions[i].x).toBeLessThan(324);
    expect(g.play.positions[i].y).toBeLessThan(210);
  }
  expect(g.play.positions[2].x).toBe(420);
  expect(g.play.positions[3].x).toBe(80);
  await expect(page.locator('[data-player="4"]')).toHaveAttribute(
    "data-ball",
    "true",
  );
  await page.getByRole("button", { name: "Load Pick & roll" }).click();
  await page.locator('[data-player="0"]').press("Enter");
  await page
    .getByRole("button", { name: "Start with ball", exact: true })
    .click();
  await page.getByRole("button", { name: "Full reset" }).click();
  const reset = await read(page);
  expect(reset.play.positions).toEqual(g.play.positions);
  expect(reset.play.starter).toBe(4);
  expect(reset.play.routes.every((r) => r.length === 0)).toBeTruthy();
  await page.reload();
  expect((await read(page)).play).toEqual(reset.play);
  fs.mkdirSync("docs/qa/playbook-update", { recursive: true });
  await page.screenshot({
    path: `docs/qa/playbook-update/${info.project.name}-formation.png`,
  });
});

test("quick playbook animates, pauses, replays and loads a real automatic pick-and-roll without spending a possession", async ({
  page,
}, info) => {
  await draftReverse(page);
  const before = await read(page);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toContainText("THE QUICK PLAYBOOK");
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".guide-basics summary")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await expect(page.locator(".lesson-court")).toHaveAttribute(
    "data-progress",
    "0.00",
  );
  await page.getByRole("button", { name: "Watch example" }).click();
  await expect
    .poll(async () =>
      Number(await page.locator(".lesson-court").getAttribute("data-progress")),
    )
    .toBeGreaterThan(0.05);
  await page.getByRole("button", { name: "Pause example" }).click();
  const paused = await page
    .locator(".lesson-court")
    .getAttribute("data-progress");
  await page.waitForTimeout(200);
  expect(
    await page.locator(".lesson-court").getAttribute("data-progress"),
  ).toBe(paused);
  await page.getByRole("button", { name: "Watch example" }).click();
  await expect(
    page.getByRole("button", { name: "Replay example" }),
  ).toBeVisible({ timeout: 9000 });
  await page.getByRole("button", { name: "Replay example" }).click();
  await expect(
    page.getByRole("button", { name: "Pause example" }),
  ).toBeVisible();
  for (const name of ["Passing", "Screens", "Pick & roll"]) {
    await page
      .getByRole("group", { name: "Basketball lessons" })
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator(".lesson-court")).toHaveAttribute(
      "data-progress",
      "0.00",
    );
  }
  expect(await read(page)).toEqual(before);
  fs.mkdirSync("docs/qa/playbook-update", { recursive: true });
  await page.screenshot({
    path: `docs/qa/playbook-update/${info.project.name}-guide.png`,
  });
  if (info.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(320);
  }
  await page.getByRole("button", { name: "Try this play" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const loaded = await read(page),
    roster = await team(page);
  expect(loaded.play.mode).toBe("routes");
  expect(roster[loaded.play.starter].position).toBe("PG");
  expect(roster[loaded.play.shooter].position).toBe("C");
  expect(loaded.totalAttempts).toBe(0);
  await expect(page.locator(".screen-marker")).toContainText(["PICK + ROLL"]);
  await page.getByRole("button", { name: "PLAY", exact: true }).click();
  await expect.poll(async () => (await read(page)).totalAttempts).toBe(1);
  await expect(page.locator(".court-result")).toBeVisible();
});
