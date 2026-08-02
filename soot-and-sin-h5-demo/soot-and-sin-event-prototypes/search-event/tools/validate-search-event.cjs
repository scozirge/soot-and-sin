const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const pageUrl = pathToFileURL(path.resolve(__dirname, "../index.html")).href;

async function createPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const timeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) =>
      timeout(callback, delay >= 2500 ? 1200 : Math.min(delay, 100), ...args);
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      return animate.call(this, frames, { ...options, duration: 60 });
    };
  });
  await page.goto(pageUrl);
  return { page, errors };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });

  const success = await createPage(browser);
  await success.page.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    const bandage = {
      id: "bandage", name: "乾淨繃帶", icon: "bandage", rarity: "common",
      category: "medical", heal: 12, usableIn: ["combat", "rest"],
      stat: "醫療 · 恢復 12 生命", quantity: 1, depth: 1,
    };
    generateRewards = () => [
      { ...bandage, instanceId: "bandage-a" },
      { ...bandage, instanceId: "bandage-b" },
    ];
    selectSearchResult = () => ({ outcome: "success", slideId: "supplies" });
    state.phase = "ready";
    beginSearch();
  });
  await success.page.waitForSelector("#resultModal.open .result-card.success");
  const successResult = await success.page.evaluate(() => ({
    chances: getChances(1),
    stackCount: state.loot.length,
    quantity: state.loot[0].quantity,
    foundCards: document.querySelectorAll(".found-item").length,
    countdownText: document.querySelector("#resultCountdown").textContent,
    categories: [...new Set(lootCatalog.map((item) => item.category))].sort(),
  }));
  assert(successResult.chances.success + successResult.chances.combat === 100, "機率總和應為 100");
  assert(!("failure" in successResult.chances), "不應保留落空結果");
  assert(successResult.stackCount === 1 && successResult.quantity === 2 && successResult.foundCards === 1,
    "相同物資應堆疊成一格兩次");
  assert(successResult.countdownText === "", "圓形倒數不應顯示數字");
  assert(successResult.categories.join(",") === "food,medical,weapon", "物資池分類不正確");
  assert(success.errors.length === 0, success.errors.join("；"));
  await success.page.close();

  const combat = await createPage(browser);
  await combat.page.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    selectSearchResult = () => ({ outcome: "combat", slideId: "powerful" });
    state.phase = "ready";
    beginSearch();
  });
  await combat.page.waitForSelector("#resultModal.open .result-card.combat");
  await combat.page.click("#resultContinueButton");
  await combat.page.waitForSelector("#battleModal.open");
  const combatResult = await combat.page.evaluate(() => window.pendingScavengeCombat);
  assert(combatResult.eventType === "combat" && combatResult.encounterTier === "powerful",
    "戰鬥結果應帶出遭遇等級");
  assert(combat.errors.length === 0, combat.errors.join("；"));
  await combat.page.close();

  await browser.close();
  console.log(JSON.stringify({ successResult, encounterTier: combatResult.encounterTier }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
