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
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      return animate.call(this, frames, { ...options, duration: Math.min(options.duration, 80) });
    };
  });

  const homeUrl = pathToFileURL(path.resolve(__dirname, "../index.html")).href;
  await page.goto(homeUrl);
  await page.evaluate(() => {
    const state = AdventureState.load();
    state.playerHealth = 40;
    state.currentEvent = "safezone";
    state.safeZoneChoice = "rest";
    state.safeZoneEndsAt = Date.now() + 30000;
    AdventureState.save(state);
  });
  await page.goto(homeUrl);
  await page.waitForSelector("#restControls:not([hidden])");
  assert((await page.textContent("#healthText")).startsWith("47 /"), "安全區休息應恢復 10% 最大生命");
  assert(await page.locator("#restButton:disabled").count() === 1, "每次安全區只能恢復一次");
  await page.waitForSelector('[data-use="canned_food"]:not([disabled])');
  await page.click('[data-use="canned_food"]');
  assert((await page.textContent("#healthText")).startsWith("65 /"), "食物應在藏匿處回復生命");
  assert(await page.locator('[data-use="canned_food"]').count() === 0, "使用完的食物應消失");

  await page.evaluate(() => {
    const session = AdventureState.load();
    session.currentEvent = "search";
    session.safeZoneChoice = "search";
    AdventureState.save(session);
    location.href = "search/index.html";
  });
  await page.waitForSelector("#roomBoard");
  const chanceCheck = await page.evaluate(() => {
    const chances = getChances(1);
    return {
      total: chances.success + chances.combat,
      hasFailure: "failure" in chances,
      failureLabels: document.querySelectorAll("#failureChance, #voteFailureChance").length,
      categories: [...new Set(lootCatalog.map((item) => item.category))].sort(),
    };
  });
  assert(chanceCheck.total === 100 && !chanceCheck.hasFailure && chanceCheck.failureLabels === 0,
    "搜索只能有物資與戰鬥兩種結果");
  assert(chanceCheck.categories.join(",") === "food,medical,weapon", "搜索物資應只有武器、食物與醫療用品");
  await page.evaluate(() => {
    clearScheduled();
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    state.depth = 1;
    state.successes = 1;
    state.results = [
      {
        id: "bandage", name: "乾淨繃帶", category: "medical", heal: 12,
        usableIn: ["combat", "rest"], quantity: 2, rarity: "common",
        stat: "醫療 · 恢復 12 生命", depth: 1, instanceId: "bandage-stack", winner: "player",
      },
      {
        id: "rusted_knife", name: "鏽蝕短刀", category: "weapon", damage: 16,
        accuracy: 88, duration: 3, combatImage: "action-axe.webp", usableIn: ["combat"],
        quantity: 2, rarity: "common", stat: "武器 · 傷害 16 · 命中 88%",
        depth: 1, instanceId: "knife-stack", winner: "player",
      },
    ];
    continueEvent();
  });
  await page.waitForSelector("#eventComplete:not([hidden])");
  assert((await page.evaluate(() => AdventureState.load().currentEvent)) === "combat",
    "搜索後下一個輪巡事件應為戰鬥");
  await page.click("#replayButton");

  await page.waitForSelector("#modal.open");
  await page.click("#startButton");
  assert(await page.getByRole("option", { name: /怪物肉|密封罐頭/ }).count() === 0,
    "食物不應出現在戰鬥行動列");
  assert(await page.getByRole("option", { name: /乾淨繃帶/ }).count() === 1,
    "醫療道具應出現在戰鬥行動列");
  assert(await page.getByRole("option", { name: /鏽蝕短刀/ }).count() === 1,
    "搜索取得的武器應出現在戰鬥行動列");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-adventure-battle.png"), fullPage: true });
  await page.evaluate(() => {
    state.monsterHealth = 0;
    finishGame(true);
  });
  await page.waitForSelector("#lootModal.open");
  await page.locator('.claim-public-tray [data-ui-id^="public_meat"]').click();
  const immediateLoot = await page.evaluate(() => ({
    winner: state.lootResults.meat,
    locked: lootDistributionUi.claimByAlly("meat") === false,
  }));
  assert(immediateLoot.winner === "player" && immediateLoot.locked,
    "怪物肉應在放入背包時立即歸屬玩家，且不能再被搶走");
  await page.evaluate(() => resolveLoot());
  await page.click("#lootContinue");
  await page.waitForSelector("#inventoryGrid");
  let finalState = await page.evaluate(() => AdventureState.load());
  const bandageQuantity = finalState.inventory.filter((item) => item.id === "bandage").reduce((sum, item) => sum + item.quantity, 0);
  const knife = finalState.inventory.find((item) => item.id === "rusted_knife");
  const meat = finalState.inventory.find((item) => item.id === "monster_meat");
  assert(bandageQuantity === 4, "同名繃帶的總數量應保留為 4 次");
  assert(knife?.quantity === 2, "相同武器應堆疊成 2 次使用次數");
  assert(meat?.quantity === 1 && meat.usableIn.includes("rest"), "怪物肉應成為休息用食物");
  assert(finalState.pendingLoot.length === 0, "戰鬥勝利後應領取並清空待領物資");
  assert(finalState.currentEvent === "safezone" && finalState.eventCycle === 2,
    "戰鬥後應輪巡回安全區");
  await page.evaluate(() => {
    const session = AdventureState.load();
    session.safeZoneChoice = "rest";
    session.safeZoneEndsAt = Date.now() + 30000;
    AdventureState.save(session);
    location.reload();
  });
  await page.waitForSelector("#restControls:not([hidden])");
  finalState = await page.evaluate(() => AdventureState.load());
  assert(finalState.playerHealth === 72 && finalState.hideoutRestClaimed,
    "新一輪安全區應再次恢復 10% 生命");
  assert(errors.length === 0, `頁面錯誤：${errors.join("；")}`);
  await page.screenshot({ path: path.resolve(__dirname, "../preview-adventure-hub.png"), fullPage: true });

  const ringPage = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await ringPage.goto(pathToFileURL(path.resolve(__dirname, "../search/index.html")).href);
  const startProgress = await ringPage.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    state.depth = 1;
    state.phase = "result";
    state.lastSearchSlide = "supplies";
    showResultModal("success", []);
    return parseFloat(getComputedStyle(document.querySelector("#resultCountdown"))
      .getPropertyValue("--result-progress"));
  });
  await ringPage.waitForTimeout(650);
  const middleProgress = await ringPage.evaluate(() => parseFloat(
    getComputedStyle(document.querySelector("#resultCountdown")).getPropertyValue("--result-progress"),
  ));
  await ringPage.waitForTimeout(650);
  const laterProgress = await ringPage.evaluate(() => parseFloat(
    getComputedStyle(document.querySelector("#resultCountdown")).getPropertyValue("--result-progress"),
  ));
  assert(startProgress <= middleProgress && middleProgress < laterProgress,
    "圓形進度應由 0 向上平滑增加");
  assert(await ringPage.locator("#resultCountdown").textContent() === "", "圓形倒數不應顯示數字");
  await ringPage.close();

  console.log(JSON.stringify({
    chanceCheck,
    ringProgress: [startProgress, middleProgress, laterProgress],
    health: finalState.playerHealth,
    inventory: finalState.inventory,
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
