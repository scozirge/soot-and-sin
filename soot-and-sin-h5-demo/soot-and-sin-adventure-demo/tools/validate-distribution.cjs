const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const root = path.resolve(__dirname, "..");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function openPage(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(root, file)).href);
  return { page, errors };
}

async function dragTo(page, sourceSelector, targetSelector) {
  const source = await page.locator(sourceSelector).boundingBox();
  const target = await page.locator(targetSelector).boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
  await page.mouse.up();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });

  const search = await openPage(browser, "search/index.html");
  await search.page.evaluate(() => {
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    state.loot = [
      { id: "iron_key", instanceId: "search-key", name: "鐵製鑰匙", category: "tool", quantity: 1, stat: "工具 · 可開啟老舊門鎖" },
      { id: "oil_lamp", instanceId: "search-lamp", name: "舊式提燈", category: "tool", quantity: 1, stat: "工具 · 照亮黑霧" },
      { id: "old_revolver", instanceId: "search-revolver", name: "老舊左輪", category: "weapon", quantity: 1, stat: "武器 · 傷害 26 · 命中 82%" },
      { id: "bandage", instanceId: "search-bandage-a", name: "乾淨繃帶", category: "medical", quantity: 1, stat: "醫療 · 恢復 12 生命" },
      { id: "bandage", instanceId: "search-bandage-b", name: "乾淨繃帶", category: "medical", quantity: 1, stat: "醫療 · 恢復 12 生命" },
    ];
    openDistribution();
  });
  await search.page.waitForSelector("#lootModal.open .inventory-distribution");
  const searchDelayRange = await search.page.evaluate(() => {
    const original = Math.random;
    Math.random = () => 0;
    const minimum = randomClaimDelay();
    Math.random = () => .999;
    const maximum = randomClaimDelay();
    Math.random = original;
    return [minimum, maximum];
  });
  assert(searchDelayRange[0] === 1000 && searchDelayRange[1] >= 4990 && searchDelayRange[1] < 5000, "搜索分配的電腦拿取延遲不是 1–5 秒");
  assert(await search.page.locator(".claim-public-tray .claim-item").count() === 5, "同種搜索物資被自動堆疊");
  assert(await search.page.locator('[data-ui-id^="public_search-key"] .claim-shape i').count() === 2, "完整 Demo 的鑰匙不是 2 格");
  assert(await search.page.locator('[data-ui-id^="public_search-lamp"] .claim-shape i').count() === 8, "完整 Demo 的提燈不是 8 格");
  assert(await search.page.locator('[data-ui-id^="public_search-revolver"] .claim-shape i').count() === 4, "完整 Demo 的老舊左輪不是 4 格");
  await search.page.locator('.claim-public-tray [data-ui-id^="public_search-key"]').click();
  const searchPlayerClaim = await search.page.evaluate(() => ({
    winner: state.results.find((item) => item.instanceId === "search-key")?.winner,
    allyCannotSteal: distributionUi.claimByAlly("search-key") === false,
  }));
  assert(searchPlayerClaim.winner === "player", "搜索物資沒有在放入背包時立即歸屬玩家");
  assert(searchPlayerClaim.allyCannotSteal, "隊友仍能搶走已由玩家取得的物資");
  const searchAllyClaim = await search.page.evaluate(() => distributionUi.claimByAlly("search-lamp"));
  assert(searchAllyClaim, "隊友無法即時取得尚未被拿走的物資");
  assert(await search.page.evaluate(() => state.results.find((item) => item.instanceId === "search-lamp")?.winner) === "ally", "搜索物資的隊友歸屬錯誤");
  await search.page.locator('.claim-public-tray [data-ui-id^="public_search-bandage-a"]').click();
  assert(await search.page.locator('.claim-board [data-ui-id*="bandage"]').count() === 2, "取得同種物資時仍被自動堆疊");
  await dragTo(search.page, '.claim-public-tray [data-ui-id^="public_search-bandage-b"]', '.claim-board [data-ui-id="bag_bandage_0"]');
  assert(await search.page.locator('.claim-board [data-ui-id="bag_bandage_0"] > b').textContent() === "×3", "拖到同種物資上沒有手動堆疊");
  assert(await search.page.locator('.claim-board [data-ui-id*="bandage"]').count() === 2, "手動堆疊影響了其他獨立道具");
  await dragTo(search.page, '.claim-board [data-ui-id="bag_canned_food_1"]', ".claim-public-tray");
  assert(await search.page.locator('.claim-public-tray [data-ui-id="bag_canned_food_1"]').count() === 1, "搜索分配時無法把自有物資放入公共區");
  assert(await search.page.evaluate(() => distributionUi.claimByAlly("inventory_canned_food_1")), "隊友無法拿取玩家投入的搜索分配物資");
  assert(await search.page.evaluate(() => state.results.find((item) => item.claimId === "inventory_canned_food_1")?.winner) === "ally", "搜索分配中的自有物資歸屬錯誤");
  await search.page.screenshot({ path: path.join(root, "preview-adventure-inventory-search.png"), fullPage: true });
  const searchInventorySaved = await search.page.evaluate(() => {
    resolveDistribution();
    continueEvent();
    return AdventureState.load().inventory;
  });
  assert(!searchInventorySaved.some((item) => item.id === "canned_food"), "搜索分配中交給隊友的自有物資沒有從存檔移除");
  assert(searchInventorySaved.filter((item) => item.id === "bandage").map((item) => item.quantity).sort().join(",") === "1,3", "手動堆疊結果沒有保留到背包");
  assert(search.errors.length === 0, `搜索頁錯誤：${search.errors.join("、")}`);

  const battle = await openPage(browser, "battle/index.html");
  await battle.page.evaluate(() => {
    const adventure = AdventureState.reset();
    adventure.pendingLoot = [
      { id: "medical_alcohol", instanceId: "pending-spirit", name: "醫療酒精", category: "medical", quantity: 1, stat: "醫療 · 戰鬥中可用" },
    ];
    adventure.inventory.push({
      id: "monster_meat", name: "怪物肉", category: "food", quantity: 1,
      heal: 24, usableIn: ["rest"], rarity: "uncommon", stat: "食物 · 休息時恢復 24 生命",
    });
    AdventureState.save(adventure);
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    openLoot();
  });
  await battle.page.waitForSelector("#lootModal.open .inventory-distribution");
  const battleDelayRange = await battle.page.evaluate(() => {
    const original = Math.random;
    Math.random = () => 0;
    const minimum = randomLootClaimDelay();
    Math.random = () => .999;
    const maximum = randomLootClaimDelay();
    Math.random = original;
    return [minimum, maximum];
  });
  assert(battleDelayRange[0] === 1000 && battleDelayRange[1] >= 4990 && battleDelayRange[1] < 5000, "戰鬥分配的電腦拿取延遲不是 1–5 秒");
  assert(await battle.page.locator(".claim-public-tray .claim-item").count() === 4, "戰鬥物資未包含待領搜索物資與怪物戰利品");
  await battle.page.locator('.claim-public-tray [data-ui-id^="public_pending-spirit"]').click();
  const battlePlayerClaim = await battle.page.evaluate(() => ({
    winner: state.lootResults["pending-spirit"],
    allyCannotSteal: lootDistributionUi.claimByAlly("pending-spirit") === false,
  }));
  assert(battlePlayerClaim.winner === "player", "戰鬥物資沒有在放入背包時立即歸屬玩家");
  assert(battlePlayerClaim.allyCannotSteal, "隊友仍能搶走玩家已取得的戰鬥物資");
  await dragTo(battle.page, '.claim-public-tray [data-ui-id^="public_meat"]', '.claim-board [data-ui-id="bag_monster_meat_2"]');
  assert(await battle.page.locator('.claim-board [data-ui-id="bag_monster_meat_2"] > b').textContent() === "×2", "新怪物肉無法堆疊到既有怪物肉");
  assert(await battle.page.evaluate(() => lootDistributionUi.claimByAlly("claw")), "隊友無法取得怪物戰利品");
  assert(await battle.page.evaluate(() => state.lootResults.claw) === "ally", "怪物戰利品的隊友歸屬錯誤");
  await dragTo(battle.page, '.claim-board [data-ui-id="bag_canned_food_1"]', ".claim-public-tray");
  assert(await battle.page.locator('.claim-public-tray [data-ui-id="bag_canned_food_1"]').count() === 1, "戰鬥分配時無法把自有物資放入公共區");
  assert(await battle.page.evaluate(() => lootDistributionUi.claimByAlly("inventory_canned_food_1")), "隊友無法拿取玩家投入的戰鬥分配物資");
  assert(await battle.page.evaluate(() => state.lootResults.inventory_canned_food_1) === "ally", "戰鬥分配中的自有物資歸屬錯誤");
  await battle.page.screenshot({ path: path.join(root, "preview-adventure-inventory-battle.png"), fullPage: true });
  await battle.page.evaluate(() => resolveLoot());
  await battle.page.click("#lootContinue");
  await battle.page.waitForURL(/index\.html$/);
  const battleInventorySaved = await battle.page.evaluate(() => AdventureState.load().inventory);
  assert(!battleInventorySaved.some((item) => item.id === "canned_food"), "戰鬥分配中交給隊友的自有物資沒有從存檔移除");
  assert(battleInventorySaved.find((item) => item.id === "monster_meat")?.quantity === 2, "怪物肉堆疊結果沒有保留到背包");
  assert(battle.errors.length === 0, `戰鬥頁錯誤：${battle.errors.join("、")}`);

  console.log(JSON.stringify({ ok: true, searchPlayerClaim, battlePlayerClaim }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
