const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const home = pathToFileURL(path.resolve(__dirname, "../index.html")).href;
  await page.goto(home);
  await page.evaluate(() => { AdventureState.reset(); location.reload(); });
  await page.waitForURL(/story\/index\.html$/);
  await page.waitForSelector(".chapter-route li.active");

  const route = await page.evaluate(() => ({
    total: document.querySelectorAll(".chapter-route li").length,
    safezone: AdventureState.chapterNodes().filter((node) => node.type === "safezone").length,
    unknown: document.querySelectorAll(".chapter-route li.unknown").length,
    active: document.querySelector(".chapter-route li.active strong")?.textContent,
    leakedName: document.querySelector(".chapter-route").textContent.includes("苦痛祭司"),
    numbered: document.querySelectorAll(".chapter-route li small").length,
  }));
  assert(route.total === 12, "小節劇本不是 12 個節點");
  assert(route.safezone === 2, "小節劇本不是固定 2 個安全區節點");
  assert(route.unknown === 9, "預設沒有只揭露目前與後續 2 個節點");
  assert(route.active === "關鍵事件" && !route.leakedName && route.numbered === 0, "節點地圖提前透露事件名稱或編號");
  assert(await page.locator("#storyTitle").textContent() === "苦痛祭司", "第一個關鍵事件內容不正確");
  assert(await page.locator("#storyText").textContent() === "門後是一間光線微弱的暗室，你聽到房間深處傳來微小的悶哼聲。走過去一看，發現一位奄奄一息的男性坐在地上，滿身是血，非常虛弱且似乎無法動彈。當你更靠近時，對方眼珠看向你並激烈的發出含糊的聲音，似乎無法正常說話，但他一直看向旁邊的桌子。可以感覺得出來對方想傳達某些事情。", "苦痛祭司開場沒有照 Google 劇本原文顯示");
  assert((await page.locator("#storyScene").getAttribute("style")).includes("pain-priest-room.png"), "苦痛祭司開場沒有使用房間插圖");
  assert(await page.locator("#storyChoices button").count() === 3, "苦痛祭司沒有顯示劇本選項");
  assert(await page.locator("#storyChoices button").nth(1).isDisabled(), "缺少照明物時仍能使用條件選項");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-chapter-story.png"), fullPage: true });

  await page.locator("#storyChoices button").first().click();
  assert(await page.locator("#storyText").textContent() === "你在桌上發現一張剪著人形的紙片，紙片上有奇怪的血跡符號，且在頭頂的部分綁著一搓頭髮。", "調查桌面沒有照 Google 劇本原文顯示");
  assert(await page.locator("#storyChoices button").count() === 2, "調查桌面的子選項與 Google 劇本不符");
  await page.locator("#storyChoices button").first().click();
  assert((await page.locator("#storyScene").getAttribute("style")).includes("pain-priest-reveal.png"), "祭司現身時沒有切換插圖");
  assert((await page.textContent("#storyFeedback")).includes("你失去 10 點理智"), "劇本分支沒有照 Google 劇本顯示系統回饋");
  assert(await page.locator("#storyContinue").textContent() === "進入戰鬥", "劇本戰鬥按鈕沒有直接標示進入戰鬥");
  await page.screenshot({ path: path.resolve(__dirname, "../preview-chapter-story-reveal.png"), fullPage: true });
  await page.click("#storyContinue");
  await page.waitForURL(/battle\/index\.html$/);
  const nestedCombat = await page.evaluate(() => AdventureState.load());
  assert(nestedCombat.currentNodeIndex === 0 && nestedCombat.currentEvent === "combat" && nestedCombat.chapterStoryCombat, "劇本觸發戰鬥時錯誤推進到下一個節點");
  assert(nestedCombat.sanity === 90, "劇本選項結果沒有保存");
  await page.evaluate(() => {
    lootDistributionUi = { getInventory: () => AdventureState.load().inventory };
    finishAdventureCombat();
  });
  await page.waitForFunction(() => AdventureState.load().currentNodeIndex === 1);
  const advanced = await page.evaluate(() => AdventureState.load());
  assert(advanced.currentNodeIndex === 1 && !advanced.chapterStoryCombat, "劇本內戰鬥勝利後沒有完成原劇本節點");

  await page.evaluate(() => {
    const state = AdventureState.load();
    state.currentNodeIndex = 3;
    state.currentEvent = "safezone";
    state.safeZoneChoice = null;
    state.safeZoneEndsAt = null;
    state.hideoutRestClaimed = false;
    AdventureState.save(state);
  });
  await page.goto(home);
  await page.waitForSelector("#safeVoteModal:not([hidden])");
  assert(await page.locator('[data-safe-vote="rest"]').count() === 1 && await page.locator('[data-safe-vote="search"]').count() === 1,
    "安全區沒有提供搜索／休息選擇");

  await page.evaluate(() => {
    const state = AdventureState.load();
    state.currentEvent = "search";
    state.safeZoneChoice = "search";
    AdventureState.save(state);
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, "../search/index.html")).href);
  await page.evaluate(() => {
    clearScheduled();
    document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("open"));
    state.depth = 1;
    state.successes = 1;
    state.results = [];
    continueEvent();
  });
  await page.click("#replayButton");
  await page.waitForURL(/story\/index\.html$/);
  assert((await page.evaluate(() => AdventureState.load())).currentNodeIndex === 4, "安全區搜索完成後沒有前往下一節點");

  await page.goto(pathToFileURL(path.resolve(__dirname, "../story/index.html")).href);
  await page.evaluate(() => {
    const state = AdventureState.reset();
    state.scoutingAbility = 120;
    AdventureState.save(state);
    location.reload();
  });
  await page.waitForSelector(".chapter-route");
  assert(await page.locator(".chapter-route li.unknown").count() === 7, "高搜查能力沒有揭露更多後續節點");
  assert(errors.length === 0, `節點劇本頁面錯誤：${errors.join("、")}`);
  console.log(JSON.stringify({ ok: true, nodes: route.total, safeZoneNodes: route.safezone, defaultVisibleAhead: 2, highScoutingVisibleAhead: 4, firstStory: "苦痛祭司" }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
