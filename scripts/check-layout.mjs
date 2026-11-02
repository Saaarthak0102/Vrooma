#!/usr/bin/env node
import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "1920x980", width: 1920, height: 980 },
  { name: "1536x730", width: 1536, height: 730 },
  { name: "1440x800", width: 1440, height: 800 },
  { name: "1366x660", width: 1366, height: 660 },
  { name: "1280x620", width: 1280, height: 620 },
];

const SCENES = [
  { id: "hero-scene", name: "HeroScene", rests: [0.0, 0.26, 0.445, 0.63, 0.815, 1.0], lengthVh: 450 },
  { id: "why-vrooma", name: "WhyVrooma", rests: [0.0, 0.5, 0.8, 1.0], lengthVh: 160 },
  { id: "showrooms-orbit", name: "ShowroomsOrbit", rests: [0.0, 0.45, 0.75, 1.0], lengthVh: 260 },
  { id: "transparent-pricing", name: "TransparentPricing", rests: [0.0, 0.35, 0.7, 1.0], lengthVh: 280 },
  { id: "inspected-used", name: "InspectedUsed", rests: [0.0, 1.0], lengthVh: 260 },
  { id: "booking-steps", name: "BookingSteps", rests: [0.0, 0.7, 1.0], lengthVh: 220 },
  { id: "final-cta", name: "FinalCta", rests: [0.0, 0.7, 1.0], lengthVh: 140 },
  { id: "footer", name: "SiteFooter", rests: [0.0, 1.0], lengthVh: 0, selector: "footer" },
];

// CLI args
const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="))?.split("=")[1] || "before";
const urlArg = args.find((a) => a.startsWith("--url="))?.split("=")[1] || "http://localhost:3000";
const targetSceneArg = args.find((a) => a.startsWith("--scene="))?.split("=")[1];

async function isServerRunning(url) {
  try {
    const res = await fetch(`${url}/en`, { method: "GET" });
    if (res.status >= 200 && res.status < 400) return true;
  } catch {}
  if (url.includes("127.0.0.1")) {
    try {
      const res = await fetch(`http://localhost:3000/en`, { method: "GET" });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {}
  } else if (url.includes("localhost")) {
    try {
      const res = await fetch(`http://127.0.0.1:3000/en`, { method: "GET" });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {}
  }
  return false;
}

async function waitForServer(url, maxWaitMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (await isServerRunning(url)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function startDevServer() {
  console.log("Starting Next.js dev server on http://127.0.0.1:3000...");
  const child = spawn("pnpm", ["exec", "next", "dev", "-p", "3000", "-H", "127.0.0.1"], {
    stdio: "pipe",
    shell: true,
  });

  child.stdout?.on("data", (d) => {
    const s = d.toString();
    if (s.includes("Ready") || s.includes("compiled")) {
      process.stdout.write(`[dev-server] ${s}`);
    }
  });
  child.stderr?.on("data", (d) => {
    process.stderr.write(`[dev-server-err] ${d.toString()}`);
  });

  const ready = await waitForServer(urlArg);
  if (!ready) {
    if (child.pid) spawn("taskkill", ["/pid", child.pid.toString(), "/f", "/t"]);
    throw new Error("Next.js server failed to start within timeout.");
  }
  console.log(`Next.js dev server is ready! Warming up ${urlArg}/en...`);
  await fetch(`${urlArg}/en`);
  console.log("Warmup complete.");
  return child;
}

function computeOverlap(rectA, rectB) {
  const xOverlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
  const yOverlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));
  if (xOverlap > 0 && yOverlap > 0) {
    return Math.min(xOverlap, yOverlap);
  }
  return 0;
}

function computeGap(rectA, rectB) {
  const gapX = Math.max(0, Math.max(rectA.left - rectB.right, rectB.left - rectA.right));
  const gapY = Math.max(0, Math.max(rectA.top - rectB.bottom, rectB.top - rectA.bottom));
  const horizontalOverlap = rectA.top < rectB.bottom && rectA.bottom > rectB.top;
  const verticalOverlap = rectA.left < rectB.right && rectA.right > rectB.left;
  return { gapX, gapY, horizontalOverlap, verticalOverlap };
}

async function runAudit() {
  let serverProcess = null;
  const running = await isServerRunning(urlArg);
  if (!running) {
    serverProcess = await startDevServer();
  }

  const browser = await chromium.launch({ headless: true });
  const allViolations = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n======================================================`);
      console.log(`AUDITING VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
      console.log(`======================================================`);

      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(`${urlArg}/en`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000); // Allow GSAP + fonts initialization

      // Read safe zone tokens from page
      const layoutBounds = await page.evaluate(() => {
        const header = document.querySelector("header");
        const headerBottom = header ? header.getBoundingClientRect().bottom : 78;
        const computed = getComputedStyle(document.documentElement);
        const safeTopRaw = computed.getPropertyValue("--safe-top").trim();
        const safeTop = safeTopRaw ? parseFloat(safeTopRaw) : headerBottom + 24;

        // Container bounds
        const container = header?.querySelector('[class*="Container"], [class*="max-w"]') || header;
        const cRect = container ? container.getBoundingClientRect() : { left: 246, right: 1656 };

        return {
          headerBottom,
          safeTop: safeTop || 104,
          containerLeft: cRect.left,
          containerRight: cRect.right,
          containerWidth: cRect.width,
        };
      });

      console.log(
        `[${vp.name}] SafeTop: ${layoutBounds.safeTop}px | Container: [${Math.round(layoutBounds.containerLeft)}px, ${Math.round(layoutBounds.containerRight)}px]`
      );

      const scenesToRun = targetSceneArg
        ? SCENES.filter((s) => s.id === targetSceneArg || s.name.toLowerCase() === targetSceneArg.toLowerCase())
        : SCENES;

      for (const scene of scenesToRun) {
        console.log(`  Checking ${scene.name}...`);

        for (const progress of scene.rests) {
          // Scroll to scene rest state
          await page.evaluate(
            ({ sceneId, sceneSelector, progress, lengthVh }) => {
              const el = document.getElementById(sceneId) || document.querySelector(sceneSelector || `#${sceneId}`);
              if (!el) return;

              let scrollY = 0;
              // Check if ScrollTrigger instance exists
              const st = window.ScrollTrigger?.getAll().find((s) => s.trigger === el);
              if (st) {
                scrollY = st.start + progress * (st.end - st.start);
              } else {
                const elTop = el.getBoundingClientRect().top + window.scrollY;
                scrollY = elTop + progress * ((lengthVh / 100) * window.innerHeight);
              }

              window.scrollTo({ top: scrollY, behavior: "instant" });
              if (window.ScrollTrigger) {
                window.ScrollTrigger.update();
              }
            },
            { sceneId: scene.id, sceneSelector: scene.selector, progress, lengthVh: scene.lengthVh }
          );

          // Wait 1000ms for scrub smoothing and transitions
          await page.waitForTimeout(1000);

          // Save screenshot
          const screenshotDir = path.join(process.cwd(), "docs", "layout-audit", modeArg, vp.name);
          fs.mkdirSync(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, `${scene.name}-${progress}.png`);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          // Inspect visible elements with data-layout
          const elements = await page.evaluate(
            ({ scenePrefix, safeTop, containerLeft, containerRight, vpWidth, vpHeight }) => {
              const nodes = Array.from(document.querySelectorAll("[data-layout]"));
              const visible = [];

              for (const node of nodes) {
                const layoutId = node.getAttribute("data-layout");
                const kind = node.getAttribute("data-layout-kind") || "text";
                const allow = node.getAttribute("data-layout-allow") || "";
                const style = window.getComputedStyle(node);
                const opacity = parseFloat(style.opacity);
                const display = style.display;
                const visibility = style.visibility;

                // Rule R6: elements with computed opacity below 0.1 are ignored
                if (opacity < 0.1 || display === "none" || visibility === "hidden") {
                  continue;
                }

                const rect = node.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) continue;

                // Check if element belongs to active scene
                const [sceneName, elemName] = layoutId.split(":");
                visible.push({
                  id: layoutId,
                  scene: sceneName,
                  name: elemName,
                  kind,
                  allow,
                  rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height,
                  },
                });
              }

              return visible;
            },
            {
              scenePrefix: scene.name.toLowerCase(),
              safeTop: layoutBounds.safeTop,
              containerLeft: layoutBounds.containerLeft,
              containerRight: layoutBounds.containerRight,
              vpWidth: vp.width,
              vpHeight: vp.height,
            }
          );

          // Filter elements for the current scene (plus any relevant active elements)
          const scenePrefix = scene.id.split("-")[0];
          const activeElements = elements.filter(
            (e) => e.scene === scenePrefix || e.scene === scene.name.toLowerCase()
          );

          // Rule R1: Header intersection check (y < safeTop)
          for (const el of activeElements) {
            // Must be within viewport vertically (top < safeTop and bottom > 0)
            if (el.rect.top < layoutBounds.safeTop && el.rect.bottom > 0) {
              const overlap = Math.round(layoutBounds.safeTop - el.rect.top);
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R1",
                elementA: el.id,
                elementB: "HeaderSafeZone",
                overlapPx: overlap,
                detail: `Intersects header safe zone (top ${Math.round(el.rect.top)}px < safeTop ${Math.round(layoutBounds.safeTop)}px)`,
              });
            }
          }

          // Rule R2: Overlap check & Minimum Gap check (48px)
          for (let i = 0; i < activeElements.length; i++) {
            for (let j = i + 1; j < activeElements.length; j++) {
              const a = activeElements[i];
              const b = activeElements[j];

              // Whitelist checks
              // 1. Hero car over phone edge (max 80px horizontal overlap)
              if (
                (a.kind === "car" && b.kind === "phone") ||
                (a.kind === "phone" && b.kind === "car")
              ) {
                const car = a.kind === "car" ? a : b;
                const phone = a.kind === "phone" ? a : b;
                const overlap = computeOverlap(car.rect, phone.rect);
                if (overlap > 80) {
                  allViolations.push({
                    viewport: vp.name,
                    scene: scene.name,
                    progress,
                    rule: "R2",
                    elementA: car.id,
                    elementB: phone.id,
                    overlapPx: Math.round(overlap - 80),
                    detail: `Car over phone overlap ${Math.round(overlap)}px exceeds 80px limit`,
                  });
                }
                continue;
              }

              // 2. Chip over phone with data-layout-allow="phone"
              if (
                (a.kind === "chip" && b.kind === "phone" && a.allow === "phone") ||
                (b.kind === "chip" && a.kind === "phone" && b.allow === "phone")
              ) {
                continue;
              }

              // Overlap check
              const overlap = computeOverlap(a.rect, b.rect);
              if (overlap > 0) {
                // If both are text/chip/card
                const isContentA = ["text", "chip", "card"].includes(a.kind);
                const isContentB = ["text", "chip", "card"].includes(b.kind);
                if (isContentA && isContentB) {
                  allViolations.push({
                    viewport: vp.name,
                    scene: scene.name,
                    progress,
                    rule: "R2",
                    elementA: a.id,
                    elementB: b.id,
                    overlapPx: Math.round(overlap),
                    detail: `Content overlap between ${a.kind} and ${b.kind} (${Math.round(overlap)}px)`,
                  });
                } else if (
                  (a.kind === "text" && (b.kind === "phone" || b.kind === "card")) ||
                  (b.kind === "text" && (a.kind === "phone" || a.kind === "card"))
                ) {
                  allViolations.push({
                    viewport: vp.name,
                    scene: scene.name,
                    progress,
                    rule: "R2",
                    elementA: a.id,
                    elementB: b.id,
                    overlapPx: Math.round(overlap + 48),
                    detail: `Direct overlap between text and ${a.kind === "text" ? b.kind : a.kind}`,
                  });
                }
                continue;
              }

              // Minimum gap between text and phone or card (48px)
              if (
                (a.kind === "text" && (b.kind === "phone" || b.kind === "card")) ||
                (b.kind === "text" && (a.kind === "phone" || a.kind === "card"))
              ) {
                const { gapX, gapY, horizontalOverlap, verticalOverlap } = computeGap(a.rect, b.rect);
                if (horizontalOverlap && gapX < 48) {
                  allViolations.push({
                    viewport: vp.name,
                    scene: scene.name,
                    progress,
                    rule: "R2",
                    elementA: a.id,
                    elementB: b.id,
                    overlapPx: Math.round(48 - gapX),
                    detail: `Horizontal gap ${Math.round(gapX)}px < 48px`,
                  });
                } else if (verticalOverlap && gapY < 48) {
                  allViolations.push({
                    viewport: vp.name,
                    scene: scene.name,
                    progress,
                    rule: "R2",
                    elementA: a.id,
                    elementB: b.id,
                    overlapPx: Math.round(48 - gapY),
                    detail: `Vertical gap ${Math.round(gapY)}px < 48px`,
                  });
                }
              }
            }
          }

          // Rule R3: Inside header container (+-40px bleed for phone/car)
          for (const el of activeElements) {
            const isBleedAllowed = el.kind === "phone" || el.kind === "car";
            const maxBleed = isBleedAllowed ? 40 : 1;

            if (el.rect.left < layoutBounds.containerLeft - maxBleed) {
              const diff = Math.round(layoutBounds.containerLeft - maxBleed - el.rect.left);
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R3",
                elementA: el.id,
                elementB: "ContainerLeft",
                overlapPx: diff,
                detail: `Left edge (${Math.round(el.rect.left)}px) exceeds container left (${Math.round(layoutBounds.containerLeft)}px by ${diff}px)`,
              });
            }

            if (el.rect.right > layoutBounds.containerRight + maxBleed) {
              const diff = Math.round(el.rect.right - (layoutBounds.containerRight + maxBleed));
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R3",
                elementA: el.id,
                elementB: "ContainerRight",
                overlapPx: diff,
                detail: `Right edge (${Math.round(el.rect.right)}px) exceeds container right (${Math.round(layoutBounds.containerRight)}px by ${diff}px)`,
              });
            }
          }

          // Rule R4: Clipping top, left, right
          for (const el of activeElements) {
            if (el.rect.top < 0 && el.rect.bottom > 0) {
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R4",
                elementA: el.id,
                elementB: "ViewportTop",
                overlapPx: Math.round(-el.rect.top),
                detail: `Clipped by viewport top (${Math.round(el.rect.top)}px)`,
              });
            }
            if (el.rect.left < 0) {
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R4",
                elementA: el.id,
                elementB: "ViewportLeft",
                overlapPx: Math.round(-el.rect.left),
                detail: `Clipped by viewport left (${Math.round(el.rect.left)}px)`,
              });
            }
            if (el.rect.right > vp.width) {
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R4",
                elementA: el.id,
                elementB: "ViewportRight",
                overlapPx: Math.round(el.rect.right - vp.width),
                detail: `Clipped by viewport right (${Math.round(el.rect.right)}px > ${vp.width}px)`,
              });
            }
          }

          // Rule R5: Bottom-right chat widget corner (220x80px)
          const chatCorner = {
            left: vp.width - 220,
            top: vp.height - 80,
            right: vp.width,
            bottom: vp.height,
          };
          for (const el of activeElements) {
            const overlap = computeOverlap(el.rect, chatCorner);
            if (overlap > 0) {
              allViolations.push({
                viewport: vp.name,
                scene: scene.name,
                progress,
                rule: "R5",
                elementA: el.id,
                elementB: "ChatWidgetCorner",
                overlapPx: Math.round(overlap),
                detail: `Content enters reserved chat widget zone (${Math.round(overlap)}px)`,
              });
            }
          }
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      console.log("Shutting down dev server...");
      if (serverProcess.pid) {
        try {
          spawn("taskkill", ["/pid", serverProcess.pid.toString(), "/f", "/t"]);
        } catch {}
      }
      serverProcess.kill();
    }
  }

  // Print Violations Table
  console.log(`\n======================================================`);
  console.log(`LAYOUT AUDIT REPORT (${modeArg.toUpperCase()})`);
  console.log(`======================================================\n`);

  if (allViolations.length === 0) {
    console.log("🎉 ZERO VIOLATIONS! All layout rules R1-R5 passed across all viewports!");
  } else {
    console.log(`Found ${allViolations.length} total violations:\n`);
    console.log(`| Viewport | Scene | Progress | Rule | Element A | Element B | Overlap (px) | Detail |`);
    console.log(`|---|---|---|---|---|---|---|---|`);
    for (const v of allViolations) {
      console.log(
        `| ${v.viewport} | ${v.scene} | ${v.progress} | ${v.rule} | ${v.elementA} | ${v.elementB} | ${v.overlapPx} | ${v.detail} |`
      );
    }
  }

  return allViolations;
}

runAudit().catch((err) => {
  console.error("Layout audit failed with error:", err);
  process.exit(1);
});
