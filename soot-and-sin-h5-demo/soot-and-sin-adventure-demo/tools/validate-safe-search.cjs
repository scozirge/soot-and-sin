const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0;
    const nativeTimeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => nativeTimeout(callback, Math.min(delay, 120), ...args);
    const nativeAnimate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      return nativeAnimate.call(this, frames, { ...options, duration: Math.min(options.duration, 80) });
    };
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);
  await page.evaluate(() => {
    const session = AdventureState.reset();
    session.currentEvent = "search";
    session.safeZoneChoice = "search";
    AdventureState.save(session);
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, "../search/index.html")).href);
  await page.waitForSelector("#voteModal.open", { timeout: 5000 });
  const result = await page.evaluate(() => ({
    depth: state.depth,
    successes: state.successes,
    phase: state.phase,
    firstCombat: getChances(1).combat,
    nextCombat: getChances(2).combat,
  }));
  assert(result.depth === 1 && result.successes === 1 && result.phase === "voting", "搜索成功後沒有進入繼續深入投票");
  assert(result.nextCombat > result.firstCombat, "深入後的怪物遭遇機率沒有提高");
  await page.evaluate(() => { Math.random = () => .999; });
  await page.click('[data-vote="stop"]');
  await page.waitForSelector("#lootModal.open", { timeout: 5000 });
  assert(await page.locator("#resultModal.open").count() === 0, "發現物資視窗沒有在進入分配階段前關閉");
  assert(errors.length === 0, `安全區搜索錯誤：${errors.join("、")}`);
  console.log(JSON.stringify({ ok: true, searches: 1, continuedVote: true, combatChance: [result.firstCombat, result.nextCombat], next: "distribution" }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
