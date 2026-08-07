/**
 * Records the demo video from the real, live application.
 *
 * Nothing here is a mockup. Puppeteer drives the deployed site, the model calls
 * are real, and the masking block that appears on screen is the actual guard
 * firing. A demo of a neurodiversity tool that faked its own footage would be a
 * poor joke.
 *
 * Captions and title cards are injected into the page as DOM overlays rather
 * than burned in afterwards, so they cannot drift out of sync with what they
 * describe. Frames are captured on a fixed interval and handed to ffmpeg.
 *
 * Motion is deliberately gentle. Building a strobing, whip-panning showreel for
 * a tool designed around sensory load would contradict the product.
 *
 *   node scripts/record-demo.mjs [url]
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import puppeteer from "puppeteer";

const URL = process.argv[2] ?? "https://subtext-tarangjammalamadaka9-4586s-projects.vercel.app";
const FRAMES = "demo-frames";
const FPS = 10;

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--window-size=1280,720", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

let frame = 0;
let capturing = false;
/**
 * Real capture time per frame. A screenshot costs more than the sleep between
 * them, so the achieved rate is well under the nominal one. Rendering at the
 * nominal rate would play the whole demo back at roughly double speed, so we
 * record when each frame actually happened and let ffmpeg honour it.
 */
const stamps = [];
let t0 = 0;

async function shoot() {
  const path = `${FRAMES}/f${String(frame).padStart(5, "0")}.jpg`;
  await page.screenshot({ path, type: "jpeg", quality: 90 });
  stamps.push(Date.now() - t0);
  frame += 1;
}

/** Hold the current screen for `seconds`, capturing frames the whole time. */
async function hold(seconds) {
  const end = Date.now() + seconds * 1000;
  while (Date.now() < end) {
    if (capturing) await shoot();
    await new Promise((r) => setTimeout(r, 1000 / FPS));
  }
}

/** Chrome the page with a caption bar and, optionally, a full-screen card. */
async function installOverlay() {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      #demo-caption {
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 99999;
        background: #23261f; color: #f2f1ea;
        font-family: Verdana, Arial, sans-serif; font-size: 21px; line-height: 1.5;
        padding: 20px 34px; text-align: left;
        border-top: 4px solid #9dbba2;
        opacity: 0; transition: opacity 320ms ease;
        max-width: none;
        /* Overlays are scenery, never targets. Without this the caption bar
           swallows real mouse clicks aimed at controls beneath it. */
        pointer-events: none;
      }
      #demo-caption.on { opacity: 1; }
      #demo-caption b { color: #b9d6be; }
      #demo-card {
        position: fixed; inset: 0; z-index: 100000;
        background: #1c1e1d; color: #f2f1ea;
        display: flex; flex-direction: column; justify-content: center;
        padding: 0 92px;
        font-family: Verdana, Arial, sans-serif;
        opacity: 0; transition: opacity 420ms ease; pointer-events: none;
      }
      #demo-card.on { opacity: 1; }
      #demo-card h1 { font-size: 62px; margin: 0 0 22px; font-weight: 700; line-height: 1.1; max-width: none; }
      #demo-card p { font-size: 27px; line-height: 1.5; margin: 0; color: #c9c6bd; max-width: 30ch; }
      #demo-card .accent { color: #9dbba2; }
    `;
    document.head.appendChild(style);
    const cap = document.createElement("div");
    cap.id = "demo-caption";
    document.body.appendChild(cap);
    const card = document.createElement("div");
    card.id = "demo-card";
    card.innerHTML = "<h1></h1><p></p>";
    document.body.appendChild(card);
  });
}

async function caption(html) {
  await page.evaluate((h) => {
    const el = document.getElementById("demo-caption");
    if (!h) { el.classList.remove("on"); return; }
    el.innerHTML = h;
    el.classList.add("on");
  }, html);
}

async function card(title, body) {
  await page.evaluate(
    ({ t, b }) => {
      const el = document.getElementById("demo-card");
      el.querySelector("h1").innerHTML = t;
      el.querySelector("p").innerHTML = b ?? "";
      el.classList.add("on");
    },
    { t: title, b: body },
  );
}

async function hideCard() {
  await page.evaluate(() => document.getElementById("demo-card").classList.remove("on"));
}

/**
 * Scroll a heading into view by its text.
 *
 * The first cut of this script used blind scrollBy offsets, which sailed past
 * the results and filmed the page footer for half the demo. Anchoring to real
 * content is the only version that cannot silently point the camera at nothing.
 */
async function glideToHeading(text, block = "start") {
  const found = await page.evaluate(
    ({ t, b }) => {
      const el = [...document.querySelectorAll("h2, h3")].find((e) =>
        e.textContent.trim().toLowerCase().includes(t.toLowerCase()),
      );
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: b });
      return true;
    },
    { t: text, b: block },
  );
  if (!found) throw new Error(`heading not found on screen: "${text}"`);
  return found;
}

/**
 * Hold on the pending state until the result actually exists, capturing the
 * whole time. A fixed sleep is a bet on how fast a live model replies, and the
 * first recording lost that bet.
 */
async function waitForHeading(text, maxSeconds = 45) {
  const end = Date.now() + maxSeconds * 1000;
  while (Date.now() < end) {
    const there = await page.evaluate(
      (t) =>
        [...document.querySelectorAll("h2, h3")].some((e) =>
          e.textContent.trim().toLowerCase().includes(t.toLowerCase()),
        ),
      text,
    );
    if (there) return true;
    if (capturing) await shoot();
    await new Promise((r) => setTimeout(r, 1000 / FPS));
  }
  throw new Error(`timed out waiting for "${text}" — did the model call fail?`);
}

/**
 * Click by dispatching on the element itself.
 *
 * Puppeteer's ElementHandle.click() fires a real mouse event at the element's
 * screen position, which means anything overlapping it wins. The caption bar
 * did exactly that and silently ate the Decode click, producing a recording of
 * a page that never ran. A DOM click cannot be intercepted by scenery.
 */
async function clickText(text) {
  const result = await page.evaluate((t) => {
    const el = [...document.querySelectorAll("button")].find(
      (e) => e.textContent.trim() === t,
    );
    if (!el) return "missing";
    if (el.disabled) return "disabled";
    el.click();
    return "ok";
  }, text);
  if (result !== "ok") throw new Error(`button "${text}" was ${result}`);
}

// ---------------------------------------------------------------- the demo

await page.goto(URL, { waitUntil: "networkidle2", timeout: 60_000 });
await installOverlay();

// Show the reading controls doing something, since they are a real feature.
await page.evaluate(() => {
  localStorage.setItem(
    "subtext.reading",
    JSON.stringify({ size: "19px", leading: "1.65", theme: "light" }),
  );
});
await page.reload({ waitUntil: "networkidle2" });
await installOverlay();

t0 = Date.now();
capturing = true;

await card("Subtext", "Text strips context.<br>This puts some of it back, <span class='accent'>both ways</span>.");
await hold(3.5);

await card(
  "&ldquo;can we talk later&rdquo;",
  "If you are autistic, this message can cost you the rest of your afternoon.",
);
await hold(4);

await card(
  "But not for the reason<br>most tools assume.",
  "Given context, autistic adults read indirect requests as accurately as anyone else.<br><br><span class='accent'>Frost, Nagano &amp; Zane, 2024</span>",
);
await hold(5.5);

await card(
  "The problem is that<br><span class='accent'>text deletes the context.</span>",
  "Tone, timing, what happened this morning. The sender leaned on all of it and supplied none of it.",
);
await hold(5);

await hideCard();
await caption("So Subtext does not guess.");
await hold(2.5);

// --- Decode -------------------------------------------------------------
await clickText("Can we talk later?");
await hold(1.5);
await caption("A real message, pasted in. <b>The model call is live.</b>");
await hold(2);
await clickText("Decode this message");
await caption("Working&hellip; <b>this is a live model call.</b>");
await waitForHeading("How much the text actually settles");
await hold(0.8);

await glideToHeading("How much the text actually settles");
await caption("It reports what the text actually <b>settles</b> &mdash; which here is almost nothing.");
await hold(5.5);

await glideToHeading("What it could mean");
await caption("Not one confident answer. <b>The readings that are genuinely live</b>, with honest numbers.");
await hold(7);

await glideToHeading("What the sender left out");
await caption("And what the sender left out. <b>Missing from the message, not from you.</b>");
await hold(6);

await glideToHeading("You could just ask");
await caption("Then something you could actually send. <b>No apology. No hedging.</b>");
await hold(6.5);

// --- Forecast -----------------------------------------------------------
await card(
  "The other direction",
  "This is where tools in this category quietly do harm.",
);
await hold(4);
await hideCard();

await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await hold(1.5);
await clickText("A message you are sending");
await hold(1.5);
await clickText("Asking for the dates");
await caption("A message an autistic teenager might send. It is clear. <b>It is not rude.</b>");
await hold(4.5);

await clickText("Forecast how this lands");
await caption("Working&hellip;");
await waitForHeading("How a reader might get it wrong");
await hold(0.8);

await glideToHeading("How a reader might get it wrong");
await caption("How a reader may get it wrong &mdash; reported as <b>the reader&rsquo;s error</b>, because that is what the evidence says it is.");
await hold(7.5);

await glideToHeading("Send it as it is");
await caption("And then it tells you to <b>send it as written</b>.");
await hold(6);

// --- The refusal --------------------------------------------------------
await caption("The obvious feature here is a button that makes it softer. <b>We did not build it.</b>");
await hold(5);

await card(
  "We built the thing<br>that <span class='accent'>stops</span> it.",
  "Camouflaging is associated with anxiety, depression, and thwarted belonging.<br><br><span class='accent'>Cage &amp; Troxell-Whitman 2019 &middot; Cassidy et al. 2020</span>",
);
await hold(6);
await hideCard();

await caption("A model can be <i>asked</i> not to hedge and will hedge anyway. So the rule lives in <b>code</b>, not the prompt.");
await hold(6);

// --- Receipts -----------------------------------------------------------
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((e) =>
    e.textContent.includes("Where this comes from"),
  );
  if (b) { b.click(); return true; }
  return false;
});
if (opened) {
  await hold(1.2);
  await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find((e) =>
      e.textContent.includes("Read the source"),
    );
    if (a) a.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  await caption("Every screen shows the research behind it, and <b>what each paper changed in the build</b>.");
  await hold(8);
}

await card(
  "One more thing,<br>and it matters.",
  "This was built from published research in one week. <span class='accent'>It has not been tested with an autistic teenager yet.</span>",
);
await hold(6);

await card(
  "So the tool says so.",
  "Every result carries a control that says this came from research, not lived experience &mdash; and if they disagree, <span class='accent'>the research is what needs updating</span>.",
);
await hold(6.5);

await card(
  "The research changed<br>this project twice.",
  "It killed the original concept. Then it deleted the one feature everybody expects.",
);
await hold(5.5);

await card("Subtext", "Text strips context.<br>This puts some of it back, <span class='accent'>both ways</span>.");
await hold(4.5);

capturing = false;
await browser.close();

// Build an ffmpeg concat list with the true duration of every frame, so the
// finished video runs at the pace the demo was actually performed at.
const lines = [];
for (let i = 0; i < frame; i += 1) {
  const next = i + 1 < frame ? stamps[i + 1] : stamps[i] + 200;
  const dur = Math.max(0.02, (next - stamps[i]) / 1000);
  lines.push(`file 'f${String(i).padStart(5, "0")}.jpg'`);
  lines.push(`duration ${dur.toFixed(4)}`);
}
lines.push(`file 'f${String(frame - 1).padStart(5, "0")}.jpg'`);
writeFileSync(`${FRAMES}/frames.txt`, lines.join("\n"));

const total = stamps[stamps.length - 1] / 1000;
writeFileSync(
  `${FRAMES}/META.json`,
  JSON.stringify({ frames: frame, seconds: total, achievedFps: frame / total }, null, 2),
);
console.log(
  `captured ${frame} frames over ${total.toFixed(1)}s (${(frame / total).toFixed(1)} fps achieved)`,
);
