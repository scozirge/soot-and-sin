const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.addInitScript(() => {
    const nativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function acceleratedAnimate(keyframes, options) {
      const accelerated = typeof options === "object"
        ? { ...options, duration: Math.min(Number(options.duration) || 0, 120) }
        : options;
      return nativeAnimate.call(this, keyframes, accelerated);
    };
  });

  await page.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
  await page.waitForLoadState("networkidle");

  const profiles = {};
  for (const profileId of ["low", "mid", "high"]) {
    await page.click(`[data-profile="${profileId}"]`);
    await page.waitForSelector("#resultReveal.visible");
    profiles[profileId] = {
      cards: await page.locator("#focusTrack .film-card").count(),
      segments: await page.locator("#oddsStrip .odds-segment").count(),
    };
  }

  const forced = {};
  for (const resultId of ["monster", "powerful", "apostle", "supplies", "premium", "artifact"]) {
    await page.selectOption("#resultMode", resultId);
    await page.waitForSelector("#resultReveal.visible");
    forced[resultId] = {
      center: await page.locator(`#focusTrack [data-index="32"]`).getAttribute("data-slide"),
      label: await page.locator("#resultName").textContent(),
    };
  }

  await browser.close();
  const result = { errors, profiles, forced };
  console.log(JSON.stringify(result, null, 2));

  const profileInvalid = Object.values(profiles)
    .some(({ cards, segments }) => cards !== 38 || segments !== 6);
  const forcedInvalid = Object.entries(forced)
    .some(([id, resultData]) => resultData.center !== id || !resultData.label);
  if (errors.length || profileInvalid || forcedInvalid) process.exitCode = 1;
})();
