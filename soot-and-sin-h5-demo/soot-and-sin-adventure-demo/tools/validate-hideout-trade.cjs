const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function dragTo(page, sourceSelector, targetSelector, ratio = { x: .5, y: .5 }) {
  await page.locator(targetSelector).scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const source = await page.locator(sourceSelector).boundingBox();
  const target = await page.locator(targetSelector).boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width * ratio.x, target.y + target.height * ratio.y, { steps: 10 });
  await page.mouse.up();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const home = pathToFileURL(path.resolve(__dirname, "../index.html")).href;
  await page.goto(home);
  await page.evaluate(() => {
    const session = AdventureState.reset();
    session.inventory.push({
      id: "old_revolver", name: "老舊左輪", category: "weapon", damage: 26,
      accuracy: 82, duration: 4, combatImage: "action-pistol.webp", usableIn: ["combat"],
      quantity: 1, rarity: "uncommon", stat: "武器 · 傷害 26 · 命中 82%",
    });
    session.currentEvent = "safezone";
    session.safeZoneChoice = "rest";
    session.safeZoneEndsAt = Date.now() + 30000;
    AdventureState.save(session);
  });
  await page.goto(home);
  await page.waitForSelector("#restControls:not([hidden])");
  assert(await page.locator("#tradeEvent").isHidden(), "接受邀請前不應直接顯示一對一交易");
  await page.click("#tradeInviteButton");
  await page.waitForSelector("#tradeRequestModal:not([hidden])");
  assert(await page.locator("#tradeEvent").isHidden(), "Morrow 尚未接受時交易視窗就已開啟");
  await page.waitForSelector("#tradeEvent:not([hidden])");

  assert(await page.locator("#tradeAllyReceiver .trade-board").count() === 0, "休息事件不應顯示隊友背包格子");
  assert(await page.locator(".trade-shared #tradePlayerConfirm").count() === 1, "我方確認鍵不在共用交換窗");
  assert(await page.locator(".trade-shared #tradeAllyConfirm").count() === 1, "隊友確認鍵不在共用交換窗");
  assert(await page.locator("#tradeAllyConfirm").isDisabled(), "玩家不應能替 Morrow 按確認");
  assert(await page.locator('#tradePlayerBoard [data-trade-id^="player_old_revolver"] .trade-shape i').count() === 4, "休息事件中的老舊左輪不是 4 格");
  assert(await page.locator('#tradeSharedList [data-trade-id="morrow_offer_hardtack"]').count() === 1, "Morrow 沒有預設放入測試物資");
  assert(await page.locator("#tradePlayerConfirm").isDisabled(), "共用窗有物資時仍能確認");

  await dragTo(page, '#tradeSharedList [data-trade-id="morrow_offer_hardtack"]', "#tradePlayerBoard", { x: .94, y: .92 });
  assert(await page.locator('#tradePlayerBoard [data-trade-id="morrow_offer_hardtack"]').count() === 1, "無法從共用窗取得 Morrow 的物資");
  await page.waitForFunction(() => document.querySelector("#tradeAllyConfirm").getAttribute("aria-pressed") === "true");
  await page.click("#tradeCancel");
  assert(await page.locator("#tradeEvent").isHidden(), "取消交易後視窗沒有關閉");
  let cancelledState = await page.evaluate(() => AdventureState.load());
  assert(!cancelledState.inventory.some((item) => item.id === "hardtack"), "取消交易後仍保留從 Morrow 取得的物資");
  assert(cancelledState.inventory.some((item) => item.id === "bandage"), "取消交易後原有物資沒有退回");

  await page.click("#tradeInviteButton");
  await page.waitForSelector("#tradeEvent:not([hidden])");
  await dragTo(page, '#tradeSharedList [data-trade-id="morrow_offer_hardtack"]', "#tradePlayerBoard", { x: .94, y: .92 });

  await dragTo(page, '#tradePlayerBoard [data-trade-id^="player_bandage"]', "#tradeSharedList");
  await dragTo(page, '#tradeSharedList [data-trade-id^="player_bandage"]', "#tradeAllyReceiver");
  assert(await page.locator("#tradeSharedList .trade-list-item").count() === 0, "Morrow 接收後共用窗沒有清空");
  await page.waitForFunction(() => document.querySelector("#tradeAllyConfirm").getAttribute("aria-pressed") === "true");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-hideout-trade.png"), fullPage: true });

  await page.click("#tradePlayerConfirm");
  await page.waitForSelector("#tradeComplete:not([hidden])");
  const finalState = await page.evaluate(() => AdventureState.load());
  assert(finalState.hideoutTradeCompleted, "交易完成狀態沒有保存");
  assert(finalState.inventory.some((item) => item.id === "hardtack"), "取得的隊友物資沒有存入背包");
  assert(!finalState.inventory.some((item) => item.id === "bandage"), "交給隊友的物資仍留在自己的背包");
  assert(await page.locator("#tradeCancel").isDisabled(), "已完成交易仍能取消回復");
  assert(errors.length === 0, `頁面錯誤：${errors.join("、")}`);

  console.log(JSON.stringify({
    ok: true,
    allyInventoryHidden: true,
    confirmationsInSharedPanel: true,
    received: "hardtack",
    given: "bandage",
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
