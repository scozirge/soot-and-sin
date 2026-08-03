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
  const page = await browser.newPage({ viewport: { width: 1600, height: 1050 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    if (window.name.startsWith("SOOT_AND_SIN_ADVENTURE:")) return;
    window.name = `SOOT_AND_SIN_ADVENTURE:${JSON.stringify({
      version: 2,
      currentNodeIndex: 0,
      currentEvent: "combat",
      chapterStoryCombat: true,
      playerHealth: 72,
      inventory: [],
      pendingLoot: [],
    })}`;
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, "../battle/index.html")).href);
  await page.waitForFunction(() => document.querySelector("#monsterFigure")?.complete);

  const setup = await page.evaluate(() => ({
    isPainPriestEncounter,
    encounterName: encounter.name,
    art: elements.monsterFigure.getAttribute("src"),
    naturalSize: [elements.monsterFigure.naturalWidth, elements.monsterFigure.naturalHeight],
    viewBox: elements.partGrid.getAttribute("viewBox"),
    parts: state.parts.map(({ id, durability }) => ({ id, durability })),
    actions: monsterActions.map(({ id, damage, accuracy, duration }) => ({ id, damage, accuracy, duration })),
    damageLayers: [...document.querySelectorAll("#monsterArt .damage-overlay")]
      .map((layer) => ({ part: layer.dataset.part, clipped: Boolean(layer.style.clipPath) })),
    shortcuts: partKeys,
  }));
  assert(setup.isPainPriestEncounter && setup.encounterName === "苦痛祭司", "劇本節點沒有載入苦痛祭司遭遇");
  assert(setup.art.endsWith("assets/pain-priest.png"), "苦痛祭司沒有使用選定的第一張圖");
  assert(setup.naturalSize.join("x") === "957x1643" && setup.viewBox === "0 0 957 1643",
    "祭司圖片尺寸與命中圖層座標不一致");
  assert(JSON.stringify(setup.parts) === JSON.stringify([
    { id: "head", durability: 45 },
    { id: "right_hand", durability: 36 },
    { id: "left_hand", durability: 36 },
    { id: "legs", durability: 27 },
  ]), "四個部位耐久沒有依 50/40/40/30% 計算");
  assert(setup.actions.find((action) => action.id === "bite")?.accuracy === 55
    && setup.actions.find((action) => action.id === "stab")?.accuracy === 90
    && setup.actions.find((action) => action.id === "claw")?.duration === 10,
  "咬／刺／爪的傷害、命中或時間分級不正確");
  assert(setup.damageLayers.length === 4 && setup.damageLayers.every((layer) => layer.clipped),
    "四張部位破壞圖沒有建立為可疊加裁切層");
  assert(setup.shortcuts.legs === "R", "第四部位沒有配置快捷鍵");

  const mechanics = await page.evaluate(() => {
    const prepareAction = (id, now) => {
      state.active = true;
      state.currentMonsterAction = monsterActions.find((action) => action.id === id);
      state.previousMonsterAction = id;
      state.monsterTarget = "player";
      state.monsterStartedAt = now;
      state.monsterActionDuration = state.currentMonsterAction.duration;
      state.monsterEndsAt = now + state.monsterActionDuration * 1000;
    };

    Math.random = () => 0;
    resetState();
    let now = performance.now();
    prepareAction("stab", now);
    const right = state.parts.find((part) => part.id === "right_hand");
    const rightBreak = applyPartDamage(right, right.durability, now);
    updateView(now);
    const rightResult = {
      effect: rightBreak.effect,
      available: monsterActions.filter(canMonsterUseAction).map((action) => action.id),
      current: state.currentMonsterAction.id,
      layerVisible: document.querySelector('[data-part="right_hand"].damage-overlay').classList.contains("visible"),
    };

    resetState();
    now = performance.now();
    prepareAction("claw", now);
    const left = state.parts.find((part) => part.id === "left_hand");
    applyPartDamage(left, left.durability, now);
    const leftResult = {
      available: monsterActions.filter(canMonsterUseAction).map((action) => action.id),
      current: state.currentMonsterAction.id,
    };

    resetState();
    now = performance.now();
    prepareAction("bite", now);
    const originalEnd = state.monsterEndsAt;
    const legs = state.parts.find((part) => part.id === "legs");
    const legsBreak = applyPartDamage(legs, legs.durability, now);
    updateView(now);
    const legsResult = {
      effect: legsBreak.effect,
      speed: state.monsterSpeedMultiplier,
      actionDuration: state.monsterActionDuration,
      extraRemaining: state.monsterEndsAt - originalEnd,
      layerVisible: document.querySelector('[data-part="legs"].damage-overlay').classList.contains("visible"),
    };

    resetState();
    now = performance.now();
    prepareAction("bite", now);
    const head = state.parts.find((part) => part.id === "head");
    const originalHeadEnd = state.monsterEndsAt;
    const stun = applyPartDamage(head, 20, now);
    const lethal = applyPartDamage(head, head.durability - head.damageTaken, now + 500);
    const headResult = {
      stun,
      lethal,
      stunDelay: state.monsterEndsAt - originalHeadEnd,
      monsterHealth: state.monsterHealth,
    };

    resetState();
    now = performance.now();
    prepareAction("bite", now);
    Math.random = () => .99;
    const healthBeforeMiss = state.playerHealth;
    resolveMonsterAction();
    const missResult = {
      healthUnchanged: state.playerHealth === healthBeforeMiss,
      log: state.logs[0],
    };
    return { rightResult, leftResult, legsResult, headResult, missResult };
  });

  assert(!mechanics.rightResult.available.includes("stab") && mechanics.rightResult.current !== "stab",
    "右手破壞後仍可使用刺擊");
  assert(mechanics.rightResult.layerVisible, "右手破壞圖層沒有顯示");
  assert(!mechanics.leftResult.available.includes("claw") && mechanics.leftResult.current !== "claw",
    "左手破壞後仍可使用爪擊");
  assert(mechanics.legsResult.speed === .7
    && Math.abs(mechanics.legsResult.actionDuration - 30 / .7) < .001
    && Math.abs(mechanics.legsResult.extraRemaining - (30 / .7 - 30) * 1000) < 2,
  "雙腿破壞沒有把當前及後續行動速度降為 70%");
  assert(mechanics.legsResult.effect.includes("降低 30%") && mechanics.legsResult.layerVisible,
    "斷腿效果或破壞圖層沒有正確顯示");
  assert(mechanics.headResult.stun.stunned && mechanics.headResult.stunDelay === 2000,
    "頭部命中沒有暈眩 2 秒");
  assert(mechanics.headResult.lethal.destroyed && mechanics.headResult.monsterHealth === 0,
    "頭部破壞沒有立即擊殺");
  assert(mechanics.missResult.healthUnchanged && mechanics.missResult.log.includes("沒有命中"),
    "敵方低命中招式沒有進行命中判定");
  assert(errors.length === 0, `頁面錯誤：${errors.join("；")}`);

  await page.evaluate(() => {
    resetState();
    state.active = true;
    Math.random = () => 0;
    elements.modal.classList.remove("open");
    beginMonsterAction(performance.now());
    updateView();
  });
  await page.screenshot({ path: path.resolve(__dirname, "../preview-pain-priest-battle.png"), fullPage: true });
  await page.evaluate(() => {
    state.parts.forEach((part) => { part.destroyed = true; });
    renderParts();
  });
  await page.screenshot({ path: path.resolve(__dirname, "../preview-pain-priest-part-breaks.png"), fullPage: true });
  await page.evaluate(() => {
    state.playerHealth = 61;
    finishAdventureCombat();
  });
  await page.waitForFunction(() => AdventureState.load().currentNodeIndex === 1);
  const routeResult = await page.evaluate(() => {
    const adventure = AdventureState.load();
    return {
      currentNodeIndex: adventure.currentNodeIndex,
      chapterStoryCombat: adventure.chapterStoryCombat,
      currentEvent: adventure.currentEvent,
      savedHealth: adventure.playerHealth,
      nextEncounter: document.querySelector("#monsterName")?.textContent,
    };
  });
  assert(routeResult.currentNodeIndex === 1 && !routeResult.chapterStoryCombat
    && routeResult.currentEvent === "combat" && routeResult.savedHealth === 61,
  "祭司勝利後沒有保存狀態並推進劇本遭遇");
  assert(routeResult.nextEncounter === "惡魔", "祭司遭遇設定洩漏到下一個怪物節點");
  console.log(JSON.stringify({ ok: true, setup, mechanics, routeResult }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
