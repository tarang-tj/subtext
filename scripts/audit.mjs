/**
 * Accessibility and responsive audit.
 *
 * Subtext claims to be usable by neurodivergent people. That claim is worth
 * nothing if nobody ever measured it, so this runs axe-core against the real
 * page at three real viewport widths, checks for horizontal overflow, and
 * verifies the contrast and touch-target numbers the README asserts.
 *
 *   node scripts/audit.mjs [url]
 *
 * Exits non-zero if any serious or critical violation is found, so it can gate
 * a release rather than decorate one.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer";
import { AxePuppeteer } from "@axe-core/puppeteer";

const URL = process.argv[2] ?? "http://localhost:3210";
const OUT = "audit-output";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, mobile: true },
  { name: "tablet", width: 768, height: 1024, mobile: false },
  { name: "desktop", width: 1280, height: 900, mobile: false },
];

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: "new" });
let seriousCount = 0;
const report = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    isMobile: vp.mobile,
    deviceScaleFactor: 1,
  });
  await page.goto(URL, { waitUntil: "networkidle2", timeout: 60_000 });

  // Horizontal overflow: the single most common responsive failure, and one
  // that makes a page genuinely unusable rather than merely ugly.
  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 40),
          right: Math.round(r.right),
        });
      }
    }
    return {
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      overflows: doc.scrollWidth > window.innerWidth + 1,
      offenders: offenders.slice(0, 5),
    };
  });

  // Touch targets and body typography, checked against the values the README claims.
  const metrics = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const small = [];
    for (const el of document.querySelectorAll("button, a, input, textarea")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      if (r.height < 44) {
        small.push({
          text: (el.textContent || el.tagName).trim().slice(0, 30),
          h: Math.round(r.height),
        });
      }
    }
    return {
      fontSize: body.fontSize,
      lineHeight: body.lineHeight,
      fontFamily: body.fontFamily.split(",")[0],
      background: body.backgroundColor,
      color: body.color,
      undersizedTargets: small,
    };
  });

  const axe = await new AxePuppeteer(page)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();

  const serious = axe.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  seriousCount += serious.length;

  await page.screenshot({ path: `${OUT}/${vp.name}.png`, fullPage: false });

  report.push({ viewport: vp.name, width: vp.width, layout, metrics, axe: {
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      sample: v.nodes[0]?.html?.slice(0, 120),
    })),
    passes: axe.passes.length,
  } });

  console.log(`\n=== ${vp.name} (${vp.width}px) ===`);
  console.log(`  overflow      : ${layout.overflows ? `YES (${layout.scrollWidth} > ${layout.innerWidth})` : "none"}`);
  if (layout.offenders.length) console.log(`  offenders     :`, layout.offenders);
  console.log(`  body type     : ${metrics.fontSize} / ${metrics.lineHeight} ${metrics.fontFamily}`);
  console.log(`  ground        : ${metrics.background} on ${metrics.color}`);
  console.log(`  targets <44px : ${metrics.undersizedTargets.length}`, metrics.undersizedTargets.slice(0, 4));
  console.log(`  axe passes    : ${axe.passes.length}`);
  console.log(`  axe violations: ${axe.violations.length} (serious/critical: ${serious.length})`);
  for (const v of axe.violations) {
    console.log(`    - [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
    if (v.nodes[0]?.html) console.log(`        ${v.nodes[0].html.slice(0, 110)}`);
  }

  await page.close();
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
await browser.close();

console.log(`\nScreenshots and report written to ${OUT}/`);
if (seriousCount > 0) {
  console.log(`FAIL: ${seriousCount} serious or critical violation(s).`);
  process.exit(1);
}
console.log("PASS: no serious or critical violations.");
