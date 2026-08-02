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
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const home = pathToFileURL(path.resolve(__dirname, "../index.html")).href;
  await page.goto(home);
  await page.evaluate(() => {
    const session = AdventureState.reset();
    session.playerHealth = 40;
    session.currentEvent = "safezone";
    AdventureState.save(session);
  });
  await page.goto(home);
  await page.waitForSelector("#safeVoteModal:not([hidden])");
  await page.evaluate(() => { Math.random = () => 0; });
  await page.click('[data-safe-vote="rest"]');
  await page.waitForSelector("#restControls:not([hidden])", { timeout: 7000 });
  const restState = await page.evaluate(() => AdventureState.load());
  assert(restState.safeZoneChoice === "rest", "5 秒投票沒有選出休息");
  assert(restState.playerHealth === 47, "選擇休息沒有恢復 10% 最大生命");
  const countdown = Number(await page.locator("#restCountdown").textContent());
  assert(countdown > 0 && countdown <= 30, "休息倒數不是 30 秒");
  assert(await page.locator("#tradeInviteButton:not([disabled])").count() === 1, "休息時無法點擊隊友頭像邀請交易");

  await page.click("#playerEndRest");
  assert(await page.locator("#playerEndRest").getAttribute("aria-pressed") === "true", "玩家無法選擇結束休息");
  assert(await page.locator("#allyEndRest").isDisabled(), "玩家不應能替電腦隊友操作結束休息");
  await page.waitForURL(/battle\/index\.html$/, { timeout: 6000 });
  assert(errors.length === 0, `安全區頁面錯誤：${errors.join("、")}`);
  console.log(JSON.stringify({ ok: true, voteSeconds: 5, restSeconds: 30, healedTo: restState.playerHealth, earlyEnd: true }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
