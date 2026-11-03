import { chromium } from "playwright";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x740", width: 360, height: 740 },
];

const URLS = [
  "/en/cars",
  "/hi/cars",
  "/en/used-cars",
  "/hi/used-cars",
];

async function isServerReady(url) {
  try {
    const res = await fetch(url);
    if (res.status === 200) return true;
  } catch {}
  return false;
}

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isServerReady(url)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function run() {
  const port = 3002;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Starting server on ${baseUrl}...`);

  const server = spawn("npx", ["next", "start", "-p", port.toString(), "-H", "127.0.0.1"], {
    stdio: "inherit",
    shell: true,
  });

  try {
    const ready = await waitForServer(`${baseUrl}/en/cars`, 30000);
    if (!ready) {
      throw new Error("Server failed to start in time");
    }
    console.log("Server is ready! Launching Chromium...");

    const browser = await chromium.launch({ headless: true });
    const screenshotDir = path.resolve("docs/screenshots");
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    const results = [];

    for (const vp of VIEWPORTS) {
      for (const route of URLS) {
        const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
        await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });

        // 1. Check no horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        // 2. Query all notch cards
        const cardData = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll(".notch-card"));
          return cards.map((c) => {
            const cardRect = c.getBoundingClientRect();
            const media = c.querySelector(".notch-media");
            const mediaRect = media ? media.getBoundingClientRect() : null;
            const tag = c.querySelector(".notch-tag");
            const tagLabel = c.querySelector(".notch-tag-label");
            const title = c.querySelector(".notch-card-title-link") || c.querySelector("h3") || c.querySelector("h4");
            const titleRect = title ? title.getBoundingClientRect() : null;
            const tagLabelRect = tagLabel ? tagLabel.getBoundingClientRect() : null;
            const arrow = c.querySelector(".notch-arrow");
            const primaryBtn = c.querySelector(".notch-btn-primary");
            const secondaryBtn = c.querySelector(".notch-btn-secondary");

            // Compute border width
            const style = window.getComputedStyle(c);
            const borderLeft = parseFloat(style.borderLeftWidth) || 1;
            const borderRight = parseFloat(style.borderRightWidth) || 1;
            const innerLeft = cardRect.left + borderLeft;
            const innerRight = cardRect.right - borderRight;

            // Media edge check
            const mediaLeft = mediaRect ? mediaRect.left : null;
            const mediaRight = mediaRect ? mediaRect.right : null;
            const mediaTouchesLeft = mediaRect ? Math.abs(mediaLeft - innerLeft) < 1.5 : false;
            const mediaTouchesRight = mediaRect ? Math.abs(mediaRight - innerRight) < 1.5 : false;

            // Tag alignment check: tag text left vs title left
            const tagTextOffsetDiff = (tagLabelRect && titleRect) ? Math.abs(tagLabelRect.left - titleRect.left) : null;

            return {
              hasArrow: !!arrow,
              mediaTouchesLeft,
              mediaTouchesRight,
              tagTextOffsetDiff,
              tagText: tagLabel ? tagLabel.textContent.trim() : null,
              hasPrimaryBtn: !!primaryBtn,
              hasSecondaryBtn: !!secondaryBtn,
              primaryBtnTop: primaryBtn ? primaryBtn.getBoundingClientRect().top : null,
            };
          });
        });

        // Test hover on first card and primary button
        const firstCard = page.locator(".notch-card").first();
        if (await firstCard.count() > 0) {
          await firstCard.hover();
          await page.waitForTimeout(100);

          // Verify pseudo-element ::after on card has no height/background or is none
          const cardAfter = await firstCard.evaluate((el) => {
            const afterStyle = window.getComputedStyle(el, "::after");
            return {
              content: afterStyle.content,
              height: afterStyle.height,
              display: afterStyle.display,
            };
          });

          const primaryBtn = firstCard.locator(".notch-btn-primary");
          let btnHoverBg = null;
          if (await primaryBtn.count() > 0) {
            await primaryBtn.hover();
            await page.waitForTimeout(100);
            btnHoverBg = await primaryBtn.evaluate((el) => window.getComputedStyle(el).backgroundColor);
          }

          results.push({
            viewport: vp.name,
            route,
            overflow,
            cardCount: cardData.length,
            allTouchLeft: cardData.every((c) => !c.tagText || c.mediaTouchesLeft),
            allTouchRight: cardData.every((c) => !c.tagText || c.mediaTouchesRight),
            noArrow: cardData.every((c) => !c.hasArrow),
            tags: cardData.map((c) => c.tagText).filter(Boolean).slice(0, 5),
            cardAfterContent: cardAfter.content,
            btnHoverBg,
          });
        }

        // Capture a sample screenshot at 390x844 and 1920x1080 for /en/cars and /hi/cars
        if ((vp.name === "1920x1080" || vp.name === "390x844" || vp.name === "360x740") && (route === "/en/cars" || route === "/hi/cars")) {
          const fname = `${vp.name}_${route.replace(/\//g, "_")}.png`;
          await page.screenshot({ path: path.join(screenshotDir, fname), fullPage: false });
        }

        await page.close();
      }
    }

    console.log("=== VERIFICATION RESULTS ===");
    console.log(JSON.stringify(results, null, 2));

    await browser.close();
  } finally {
    if (server.pid) {
      spawn("taskkill", ["/pid", server.pid.toString(), "/f", "/t"]);
    }
  }
}

run().catch((e) => {
  console.error("Verification error:", e);
  process.exit(1);
});

