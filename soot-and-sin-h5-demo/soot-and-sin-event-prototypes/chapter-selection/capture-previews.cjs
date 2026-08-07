const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const fs = require("fs");
const path = require("path");

const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pageUrl = pathToFileURL(path.join(__dirname, "index.html")).href;
const previewDir = path.join(__dirname, "previews");

async function capturePair(browser, name, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(pageUrl, { waitUntil: "load", timeout: 10000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(previewDir, `${name}-intro.png`), fullPage: true });
  await page.click('[data-section="section_01"]');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: path.join(previewDir, `${name}-section-01.png`), fullPage: true });
  await page.close();
}

(async () => {
  fs.mkdirSync(previewDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  await capturePair(browser, "desktop", { width: 1600, height: 1000 });
  await capturePair(browser, "compact", { width: 1024, height: 900 });
  await capturePair(browser, "mobile", { width: 390, height: 844 });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
