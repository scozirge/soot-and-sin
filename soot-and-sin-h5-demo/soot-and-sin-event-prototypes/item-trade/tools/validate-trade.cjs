const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function dragTo(page, sourceSelector, targetSelector, targetRatio = { x: .5, y: .5 }) {
  const source = await page.locator(sourceSelector).boundingBox();
  const target = await page.locator(targetSelector).boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width * targetRatio.x, target.y + target.height * targetRatio.y, { steps: 10 });
  await page.mouse.up();
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1050 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, "../index.html")).href);

  assert(await page.locator('#playerBoard [data-item-id="player-lamp"] .item-cell').count() === 8, "油燈不是 8 格");
  assert(await page.locator('#playerBoard [data-item-id="player-revolver"] .item-cell').count() === 4, "老舊左輪不是 4 格");
  const key = await page.locator('#playerBoard [data-item-id="player-key"]').boundingBox();
  const playerBoard = await page.locator("#playerBoard").boundingBox();
  await page.mouse.move(key.x + key.width / 2, key.y + key.height / 2);
  await page.mouse.down();
  await page.mouse.move(playerBoard.x + playerBoard.width * .45, playerBoard.y + playerBoard.height * .75, { steps: 8 });
  await page.keyboard.press("r");
  await page.mouse.up();
  const rotatedKey = await page.locator('#playerBoard [data-item-id="player-key"]').boundingBox();
  assert(rotatedKey.height > rotatedKey.width * 1.8, "拖曳時按 R 沒有旋轉格子");
  assert(await page.locator('#playerBoard [data-item-id="player-key"] img').evaluate((image) => image.style.transform) === "rotate(90deg)", "旋轉後圖片沒有同步轉向");

  await page.click("#playerConfirm");
  assert(await page.locator("#playerConfirm").getAttribute("aria-pressed") === "true", "玩家無法先確認空白交易");
  await dragTo(page, '#playerBoard [data-item-id="player-bandage"]', "#sharedList");
  assert(await page.locator('#sharedList [data-item-id="player-bandage"]').count() === 1, "物資無法放入共用窗");
  assert(await page.locator("#playerConfirm").getAttribute("aria-pressed") === "false", "共用窗變動後沒有取消玩家確認");
  assert(await page.locator("#allyConfirm").getAttribute("aria-pressed") === "false", "共用窗變動後沒有取消隊友確認");
  assert(await page.locator("#playerConfirm").isDisabled(), "共用窗未清空時仍能確認");

  await dragTo(page, '#sharedList [data-item-id="player-bandage"]', "#allyBoard", { x: .94, y: .92 });
  assert(await page.locator('#allyBoard [data-item-id="player-bandage"]').count() === 1, "隊友無法從共用窗取走玩家物資");
  assert(await page.locator("#sharedList .shared-item").count() === 0, "取走後共用窗沒有清空");
  assert(!(await page.locator("#playerConfirm").isDisabled()), "共用窗清空後仍無法確認");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-trade.png"), fullPage: true });

  await page.click("#playerConfirm");
  await page.click("#allyConfirm");
  await page.waitForSelector("#completeOverlay:not([hidden])");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-trade-complete.png"), fullPage: true });
  assert(errors.length === 0, `頁面錯誤：${errors.join("、")}`);

  console.log(JSON.stringify({
    ok: true,
    shapes: { lamp: 8, revolver: 4 },
    transfer: "scozirge → shared → Morrow",
    confirmationsReset: true,
    tradeCompleted: true,
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
