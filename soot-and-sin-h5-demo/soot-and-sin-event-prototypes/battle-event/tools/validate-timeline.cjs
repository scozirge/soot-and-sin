const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require("playwright");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const finishTask = async (page, taskName) => {
  await page.evaluate((name) => {
    state[name].endsAt = performance.now() + 60;
  }, taskName);
  await wait(140);
};
const clickPart = async (page, x, y) => {
  const grid = await page.locator("#partGrid").boundingBox();
  await page.mouse.click(grid.x + grid.width * x / 820, grid.y + grid.height * y / 900);
};
const hoverPart = async (page, x, y) => {
  const grid = await page.locator("#partGrid").boundingBox();
  await page.mouse.move(grid.x + grid.width * x / 820, grid.y + grid.height * y / 900);
};

let browser;
(async () => {
  browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await page.goto(pathToFileURL(path.join(process.cwd(), "index.html")).href, { waitUntil: "load", timeout: 10000 });
  page.setDefaultTimeout(3000);
  await page.click("#startButton");

  let snapshot = await page.evaluate(() => ({
    selectedAction: state.selectedAction,
    target: state.monsterTarget,
    allyAction: state.allyTask?.action.id,
    axeUses: state.actionUses.axe,
    pistolUses: state.actionUses.pistol,
  }));
  assert(snapshot.selectedAction === "axe", "開始時應預設選取第一個行動");
  assert(snapshot.target === "ally", "固定亂數下惡魔應選擇隊友");
  assert(snapshot.allyAction === "ally_axe", "隊友應自主選擇攻擊");
  assert(snapshot.axeUses === 3 && snapshot.pistolUses === 1, "斧頭與手槍次數不正確");
  assert((await page.textContent("#intentTarget")).includes("Morrow"), "怪物意圖應公開目標");
  assert((await page.textContent("#allyActionName")).includes("短柄斧"), "隊友資訊欄應顯示所選行動");
  assert(await page.locator(".action-card").count() === 6, "應有武器、醫療、閃避與防禦行動");
  assert(await page.locator(".action-index").count() === 0, "卡片不應顯示序列號");
  assert(await page.locator(".key-hint").count() === 0, "行動列下方不應保留操作說明");
  assert(!/\d+s/.test((await page.locator(".action-stats").allTextContents()).join("")), "耗時不應顯示 s");

  await page.getByRole("option", { name: /短柄斧/ }).click();
  assert(await page.evaluate(() => state.selectedAction === "axe"), "再次點選目前武器不應取消選取");

  const idleOpacity = await page.locator(".hit-overlay").evaluateAll(
    (items) => items.map((item) => getComputedStyle(item).opacity),
  );
  assert(idleOpacity.every((opacity) => opacity === "0.18"), "部位預設應維持低亮度");
  await hoverPart(page, 604, 570);
  await wait(180);
  const callout = await page.locator(".part-callout text").getAttribute("x");
  assert(Number(callout) >= 650, "右側部位標示應盡量移到怪物外側");
  await page.screenshot({ path: "demo-start.png", fullPage: true });

  await finishTask(page, "allyTask");
  assert(await page.evaluate(() => state.allyActionCount === 1), "隊友攻擊應完成");
  assert(await page.locator("#allyCard").evaluate((card) => card.classList.contains("ally-attack")), "隊友攻擊應有演出");
  assert(await page.evaluate(() => state.allyTask?.action.id === "ally_defend"), "被鎖定的隊友應接著選擇防禦");
  await finishTask(page, "allyTask");
  assert(await page.evaluate(() => state.allyWaitingForMonster), "隊友防禦後應等待怪物攻擊");
  assert((await page.textContent("#allyActionName")).includes("防禦已準備"), "隊友資訊欄應顯示防禦狀態");

  await clickPart(page, 392, 330);
  await finishTask(page, "playerTask");
  assert(await page.evaluate(() => state.selectedAction === "axe" && state.actionUses.axe === 2), "斧頭攻擊後應保持選取並扣除次數");
  for (let index = 0; index < 2; index += 1) {
    await clickPart(page, 392, 330);
    await finishTask(page, "playerTask");
  }
  assert(await page.getByRole("option", { name: /短柄斧/ }).count() === 0, "斧頭三次用完後應消失");
  assert(await page.evaluate(() => state.selectedAction === "pistol"), "斧頭耗盡後應自動選取下一個行動");

  await clickPart(page, 604, 570);
  await finishTask(page, "playerTask");
  assert(await page.getByRole("option", { name: /燧發手槍/ }).count() === 0, "手槍一次用完後應消失");
  assert(await page.evaluate(() => state.selectedAction === "melee"), "手槍耗盡後應自動選取常駐肉搏");
  await clickPart(page, 177, 590);
  await finishTask(page, "playerTask");
  assert(await page.evaluate(() => state.selectedAction === "melee"), "肉搏完成後應保持選取");
  assert(await page.getByRole("option", { name: /肉搏/ }).count() === 1, "肉搏不應耗盡");

  await page.evaluate(() => {
    state.monsterEndsAt = performance.now() + 60;
  });
  await wait(160);
  snapshot = await page.evaluate(() => ({
    monsterTurn: state.monsterTurn,
    allyHealth: state.allyHealth,
    allyWaiting: state.allyWaitingForMonster,
  }));
  assert(snapshot.monsterTurn === 2, "惡魔攻擊後應開始下一個行動");
  assert(snapshot.allyHealth === 50, "32 傷害經隊友 18 防禦後應剩 50 生命");
  assert(!snapshot.allyWaiting, "惡魔攻擊後應解除隊友等待");

  await page.evaluate(() => {
    state.monsterTarget = "player";
    state.monsterEndsAt = performance.now() + 10000;
    updateView();
  });
  await page.getByRole("option", { name: /防禦/ }).click();
  await finishTask(page, "playerTask");
  assert(await page.evaluate(() => state.waitingForMonster), "玩家防禦後應鎖定到怪物攻擊");
  assert(await page.locator(".action-card:not(:disabled)").count() === 0, "等待期間所有玩家行動都應壓灰");

  await page.evaluate(() => {
    state.waitingForMonster = false;
    state.preparedDefense = null;
    updateView();
  });

  await page.evaluate(() => finishGame(true));
  await wait(560);
  assert(await page.locator("#lootModal").evaluate((modal) => modal.classList.contains("open")), "勝利後應開啟搜刮畫面");
  assert(await page.locator(".loot-item").count() === 3, "應顯示三種怪物戰利品");
  assert(Number(await page.textContent("#lootTimerText")) >= 14, "搜刮倒數應從 15 秒開始");
  assert(await page.locator(".looter.ally").count() === 3, "固定亂數下隊友應隨機選擇三件戰利品");
  await page.evaluate(() => {
    state.allyLootSelections.delete("claw");
    state.allyLootSelections.delete("head");
    renderLoot();
  });

  for (const item of ["怪物肉", "利爪"]) {
    await page.getByRole("button", { name: new RegExp(item) }).click();
  }
  assert(await page.locator(".looter.player").count() === 2, "玩家應能複選戰利品");
  const pickerBoxes = await page.locator(".loot-item").first().locator(".looter").evaluateAll(
    (items) => items.map((item) => item.getBoundingClientRect().x),
  );
  assert(Math.abs(pickerBoxes[0] - pickerBoxes[1]) < 29, "多人選擇圖示應以重疊方式顯示");
  await page.screenshot({ path: "demo-loot.png", fullPage: true });

  await page.evaluate(() => {
    Math.random = () => 0;
    state.lootDeadline = performance.now() + 60;
  });
  await wait(150);
  snapshot = await page.evaluate(() => ({
    lootResolved: state.lootResolved,
    carried: { ...carriedLoot },
  }));
  assert(snapshot.lootResolved, "15 秒結束後應自動分配戰利品");
  assert(snapshot.carried.meat === 1 && snapshot.carried.claw === 1 && snapshot.carried.head === 0, "玩家取得的戰利品應加入攜帶物");
  assert(await page.locator(".loot-item.awarded-player").count() === 2, "分配結果應標示取得者");
  assert(await page.locator(".loot-item.abandoned").count() === 1, "無人選擇的戰利品應被放棄");

  await page.click("#lootContinue");
  assert(await page.locator(".action-card").count() === 7, "下一場應加入怪物肉與利爪兩張行動牌");
  assert(await page.getByRole("option", { name: /怪物首級/ }).count() === 0, "怪物首級不應出現在行動列");

  const tray = page.locator("#actionGrid");
  const dragImage = page.locator(".action-card").nth(3).locator(".action-icon");
  assert(await dragImage.getAttribute("draggable") === "false", "行動圖片不應啟動原生圖片拖曳");
  const dragBox = await dragImage.boundingBox();
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragBox.x - 500, dragBox.y + dragBox.height / 2, { steps: 8 });
  await page.mouse.up();
  const trayScroll = await tray.evaluate((item) => item.scrollLeft);
  assert(trayScroll > 200, "從行動圖片拖曳時應捲動整個拉霸");

  await page.evaluate(() => {
    state.playerHealth = 40;
    updateView();
  });
  assert(await page.getByRole("option", { name: /怪物肉/ }).count() === 0, "食物不應出現在戰鬥行動列");
  await page.getByRole("option", { name: /乾淨繃帶/ }).click();
  assert(await page.evaluate(() => state.playerTask?.action.id === "field_bandage"), "點擊繃帶後應開始醫療行動");
  await finishTask(page, "playerTask");
  const healedHealth = await page.evaluate(() => state.playerHealth);
  assert(healedHealth === 56, `繃帶應回復 16 生命，實際為 ${healedHealth}`);
  assert(await page.getByRole("option", { name: /乾淨繃帶/ }).count() === 1, "兩次繃帶應在使用一次後保留");

  await page.getByRole("option", { name: /利爪/ }).click();
  await clickPart(page, 604, 570);
  await finishTask(page, "playerTask");
  assert(await page.getByRole("option", { name: /利爪/ }).count() === 0, "利爪使用一次後應消失");

  const layout = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    playerCardHeight: document.querySelector("#playerCard").getBoundingClientRect().height,
    allyCardHeight: document.querySelector("#allyCard").getBoundingClientRect().height,
  }));
  assert(layout.playerCardHeight < 130 && layout.allyCardHeight < 185, "玩家與隊友資訊欄應保持精簡");
  assert(layout.scrollHeight === layout.viewportHeight, "桌面版不應產生垂直捲動");
  assert(errors.length === 0, `頁面錯誤：${errors.join(" | ")}`);

  console.log(JSON.stringify({ snapshot, layout, trayScroll, errors }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await browser?.close();
});
