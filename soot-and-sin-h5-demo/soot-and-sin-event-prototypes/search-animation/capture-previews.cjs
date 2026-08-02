const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });

  await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
  await page.waitForLoadState("networkidle");
  await page.selectOption("#resultMode", "artifact");

  await page.waitForTimeout(280);
  await page.screenshot({
    path: path.join(__dirname, "previews", "lantern-accelerating.png"),
    fullPage: true,
  });

  await page.waitForTimeout(1250);
  await page.locator("#stage").screenshot({
    path: path.join(__dirname, "previews", "lantern-decelerating.png"),
  });

  await page.waitForSelector("#resultReveal.visible");
  await page.waitForTimeout(350);
  await page.screenshot({
    path: path.join(__dirname, "previews", "interface.png"),
    fullPage: true,
  });
  await page.locator("#stage").screenshot({
    path: path.join(__dirname, "previews", "lantern-result.png"),
  });

  for (const resultId of ["apostle", "supplies", "premium", "artifact"]) {
    await page.selectOption("#resultMode", resultId);
    await page.waitForSelector("#resultReveal.visible");
    await page.waitForTimeout(250);
    await page.locator("#stage").screenshot({
      path: path.join(__dirname, "previews", `lantern-${resultId}-result.png`),
    });
  }

  await browser.close();
})();
