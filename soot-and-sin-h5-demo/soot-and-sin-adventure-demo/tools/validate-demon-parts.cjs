const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");
const os = require("os");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(pathToFileURL(path.resolve(__dirname, "../battle/index.html")).href);

  const armResult = await page.evaluate(() => {
    resetState();
    state.active = true;
    elements.modal.classList.remove("open");
    Math.random = () => 0;
    const now = performance.now();
    state.currentMonsterAction = monsterActions.find((action) => action.id === "frenzy");
    state.previousMonsterAction = "frenzy";
    state.monsterStartedAt = now;
    state.monsterEndsAt = now + state.currentMonsterAction.duration * 1000;
    const left = state.parts.find((part) => part.id === "left_limb");
    const outcome = applyPartDamage(left, left.durability, now);
    updateView(now);
    showDamage(left.durability, left, { destroyed: true });
    renderPartCallout(state.parts.find((part) => part.id === "right_limb"));
    const rightCallout = document.querySelector("#partCallouts").textContent;
    renderPartCallout(left);
    return {
      outcome,
      durability: left.durability,
      destroyed: left.destroyed,
      monsterHealth: state.monsterHealth,
      currentAction: state.currentMonsterAction.id,
      available: monsterActions.filter(canMonsterUseAction).map((action) => action.id),
      destroyedLabel: document.querySelector(".part-callout.destroyed text")?.textContent,
      rightCallout,
      destroyedOverlay: Boolean(document.querySelector('.hit-overlay[data-part="left_limb"].destroyed')),
      destroyedOverlayOpacity: getComputedStyle(
        document.querySelector('.hit-overlay[data-part="left_limb"].destroyed'),
      ).opacity,
      leftDamageLayer: document.querySelector("#destroyedLeftLimb").classList.contains("visible"),
      rightDamageLayer: document.querySelector("#destroyedRightLimb").classList.contains("visible"),
      breakFeedback: document.querySelector("#damageNumber").textContent,
      feedbackX: document.querySelector("#damageNumber").style.getPropertyValue("--feedback-x"),
      feedbackFontSize: getComputedStyle(document.querySelector("#damageNumber")).fontSize,
      leaksDurability: document.querySelector("#partCallouts").textContent.includes("部位："),
    };
  });
  assert(armResult.durability === 54 && armResult.destroyed, "左右手應在怪物生命 60% 傷害時破壞");
  assert(armResult.monsterHealth === 36, "部位傷害沒有同步扣除怪物生命");
  assert(armResult.currentAction !== "frenzy" && !armResult.available.includes("frenzy"), "單手破壞後仍可使用狂抓");
  assert(armResult.destroyedLabel?.includes("已破壞") && armResult.destroyedOverlay
    && armResult.destroyedOverlayOpacity === "0", "破壞部位沒有清楚標示，或命中高亮仍半透明殘留");
  assert(armResult.leftDamageLayer && !armResult.rightDamageLayer, "單手破壞圖層顯示錯誤");
  assert(armResult.breakFeedback.includes("部位破壞") && armResult.feedbackX === "22%", "破壞提示沒有顯示在受擊部位");
  assert(parseFloat(armResult.feedbackFontSize) <= 24.1, "傷害跳字沒有縮小 30%");
  assert(!armResult.rightCallout.includes("已破壞"), "指向右手時不應同時顯示左手破壞標示");
  assert(!armResult.leaksDurability, "介面不應顯示隱藏的部位耐久");

  const bothArms = await page.evaluate(() => {
    const right = state.parts.find((part) => part.id === "right_limb");
    applyPartDamage(right, right.durability);
    updateView();
    animateMonster("hit");
    showDamage(right.durability, right, { destroyed: true });
    return {
      leftDamageLayer: document.querySelector("#destroyedLeftLimb").classList.contains("visible"),
      rightDamageLayer: document.querySelector("#destroyedRightLimb").classList.contains("visible"),
      imageLayers: document.querySelectorAll("#monsterArt > img").length,
      sharedHitAnimation: document.querySelector("#monsterArt").classList.contains("hit"),
      rightBreakFeedback: document.querySelector("#damageNumber").textContent,
    };
  });
  assert(bothArms.leftDamageLayer && bothArms.rightDamageLayer, "雙手破壞圖層無法同時疊加");
  assert(bothArms.imageLayers === 3 && bothArms.sharedHitAnimation, "三張怪物圖沒有共用受擊放大動畫");
  assert(bothArms.rightBreakFeedback.includes("部位破壞"), "右手破壞沒有顯示明顯提示");
  await page.waitForTimeout(550);
  await page.screenshot({ path: path.join(os.tmpdir(), "soot-and-sin-demon-part-break.png"), fullPage: true });

  const headResult = await page.evaluate(() => {
    resetState();
    state.active = true;
    const now = performance.now();
    state.currentMonsterAction = monsterActions.find((action) => action.id === "bite");
    state.monsterStartedAt = now;
    state.monsterEndsAt = now + state.currentMonsterAction.duration * 1000;
    const originalEnd = state.monsterEndsAt;
    const head = state.parts.find((part) => part.id === "head");
    const stun = applyPartDamage(head, 20, now);
    updateTimeline(now + 500);
    const frozenTime = document.querySelector("#timerText").textContent;
    const lethal = applyPartDamage(head, head.durability - head.damageTaken, now + 500);
    return {
      durability: head.durability,
      stun,
      lethal,
      delayedBy: state.monsterEndsAt - originalEnd,
      frozenTime,
      destroyed: head.destroyed,
      monsterHealth: state.monsterHealth,
    };
  });
  assert(headResult.durability === 72, "頭部耐久應為怪物生命 80%");
  assert(headResult.stun.stunned && headResult.delayedBy === 2000 && headResult.frozenTime === "30", "頭部命中沒有暫停倒數 2 秒");
  assert(headResult.lethal.destroyed && headResult.destroyed && headResult.monsterHealth === 0, "頭部破壞沒有造成即死");
  assert(errors.length === 0, `頁面錯誤：${errors.join("；")}`);

  console.log(JSON.stringify({ ok: true, armResult, headResult }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
