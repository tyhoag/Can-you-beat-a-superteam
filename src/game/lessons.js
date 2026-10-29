import { firstPlay, template } from "./playbook.js";

export const LESSONS = [
  {
    id: "cut",
    label: "Cuts",
    title: "Cut into space.",
    tip: "Start wide, then cut behind your defender toward the rim. Keep other teammates spread out so they don’t block the lane.",
    draw: "Choose a shooter. In Draw, drag from their jersey toward the basket. Use Move to change a starting spot.",
    cues: [
      "Start wide. Give the cutter room.",
      "Cut behind the defender.",
      "Catch near the rim and take the shot.",
    ],
  },
  {
    id: "give",
    label: "Passing",
    title: "Give it up. Get it back.",
    tip: "Short, clear passes beat crowded cross-court passes. Automatic passing can use a teammate as a relay, or return the ball after a cut.",
    draw: "Choose who starts with the ball and who shoots. Draw the cut; Auto chooses the connections and timing. To insist on receivers, use Pass and tap their jerseys. The last receiver shoots.",
    cues: [
      "Find a nearby passing outlet.",
      "Pass, then cut into space.",
      "The return pass meets the cutter.",
    ],
  },
  {
    id: "screen",
    label: "Screens",
    title: "Free a teammate.",
    tip: "A screen gets a defender out of the cutter’s way. It works off the ball too: one teammate plants while another cuts close around them.",
    draw: "Draw the screener toward a teammate or their defender. Draw the cutter around that spot. The plant and the wait happen automatically.",
    cues: [
      "Bring a teammate to the defender.",
      "Plant the screen; cut close around it.",
      "Pass to the freed-up cutter.",
    ],
  },
  {
    id: "roll",
    label: "Pick & roll",
    title: "Pick. Turn. Roll.",
    tip: "Your big screens for the ball handler, then rolls to the hoop. Let the handler turn the corner before the rolling player looks for the pass.",
    draw: "Continue the screener’s route toward the rim. Draw the handler around the pick and choose the roller to shoot. Auto waits for the opening—no timer to set.",
    cues: [
      "Bring the big up to set the pick.",
      "The handler turns the corner.",
      "The big rolls and catches near the rim.",
    ],
  },
];

export function lessonPlay(id, roster) {
  const p = firstPlay(roster);
  const wing = roster.findIndex((p) => p.position === "SG");
  const big = roster.findIndex((p) => p.position === "C");
  p.shooter =
    id === "give"
      ? p.starter
      : id === "roll"
        ? Math.max(0, big)
        : Math.max(0, wing);
  return template(id, p);
}
