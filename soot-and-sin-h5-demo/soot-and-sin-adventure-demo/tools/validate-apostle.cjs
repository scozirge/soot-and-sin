const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, "../search/index.html")).href);
  await page.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    selectSearchResult = () => ({ outcome: "combat", slideId: "apostle" });
    state.phase = "ready";
    beginSearch();
  });
  await page.waitForSelector("#resultModal.open", { timeout: 8000 });
  assert(await page.locator("#resultTitle").textContent() === "遭遇使徒", "使徒搜索結果沒有完成");
  await page.click("#resultContinueButton");
  await page.waitForSelector("#battleModal.open");
  assert(await page.locator("#pendingLoot").isVisible(), "使徒事件沒有產生戰鬥銜接資料");
  await page.click("#battleReplayButton");
  await page.waitForURL(/battle\/index\.html$/);
  await page.waitForSelector("#modal.open");
  assert(errors.length === 0, `使徒流程錯誤：${errors.join("、")}`);

  const stalledPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  const stalledErrors = [];
  stalledPage.on("pageerror", (error) => stalledErrors.push(error.message));
  await stalledPage.addInitScript(() => {
    Element.prototype.animate = () => ({
      finished: new Promise(() => {}),
      cancel() {},
      finish() {},
    });
  });
  await stalledPage.goto(pathToFileURL(path.resolve(__dirname, "../search/index.html")).href);
  await stalledPage.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    selectSearchResult = () => ({ outcome: "combat", slideId: "apostle" });
    state.phase = "ready";
    beginSearch();
  });
  await stalledPage.waitForSelector("#resultModal.open", { timeout: 9000 });
  assert(await stalledPage.locator("#resultTitle").textContent() === "遭遇使徒", "動畫未回報完成時，使徒搜索仍然卡死");
  assert(stalledErrors.length === 0, `使徒保險流程錯誤：${stalledErrors.join("、")}`);
  console.log(JSON.stringify({ ok: true, result: "遭遇使徒", destination: "battle", stalledAnimationRecovered: true }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
