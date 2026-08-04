const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { PNG } = require("pngjs");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function readMaskedLayerStats(layerFile, maskFile, part) {
  const png = PNG.sync.read(fs.readFileSync(layerFile));
  const mask = PNG.sync.read(fs.readFileSync(maskFile));
  assert(png.width === mask.width && png.height === mask.height,
    `${part} 圖層和遮罩尺寸不一致`);
  let transparent = 0;
  let visible = 0;
  let alphaMismatch = 0;
  const bounds = { minX: png.width, minY: png.height, maxX: -1, maxY: -1 };
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const offset = (y * png.width + x) * 4;
      const alpha = png.data[offset + 3];
      const maskAlpha = mask.data[offset];
      if (alpha !== maskAlpha) alphaMismatch += 1;
      if (alpha === 0) transparent += 1;
      else {
        visible += 1;
        bounds.minX = Math.min(bounds.minX, x);
        bounds.minY = Math.min(bounds.minY, y);
        bounds.maxX = Math.max(bounds.maxX, x);
        bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
  }
  const alphaAt = (x, y) => png.data[(y * png.width + x) * 4 + 3];
  const boxArea = visible > 0
    ? (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1)
    : 0;
  return {
    part,
    transparent,
    visible,
    alphaMismatch,
    size: [png.width, png.height],
    bounds: visible > 0 ? bounds : null,
    occupancy: boxArea ? visible / boxArea : 0,
    corners: [
      alphaAt(0, 0),
      alphaAt(png.width - 1, 0),
      alphaAt(0, png.height - 1),
      alphaAt(png.width - 1, png.height - 1),
    ],
  };
}

function readDamageStats(part) {
  const root = path.resolve(__dirname, "../battle/assets/damage-overlays");
  return readMaskedLayerStats(
    path.join(root, `pain-priest-${part}-destroyed.png`),
    path.join(root, `pain-priest-${part}-damage-mask.png`),
    part,
  );
}

function readHitStats(part) {
  const root = path.resolve(__dirname, "../battle/assets/hit-overlays");
  const layerFile = path.join(root, `pain-priest-${part}.png`);
  const maskFile = path.join(root, `pain-priest-${part}-mask.png`);
  const stats = readMaskedLayerStats(layerFile, maskFile, part);
  const layer = PNG.sync.read(fs.readFileSync(layerFile));
  const mask = PNG.sync.read(fs.readFileSync(maskFile));
  const base = PNG.sync.read(fs.readFileSync(path.resolve(root, "../pain-priest.png")));
  const deltas = [];
  let count = 0;
  let baseLumaSum = 0;
  let resultLumaSum = 0;
  let baseLumaSquared = 0;
  let resultLumaSquared = 0;
  let lumaProducts = 0;
  for (let pixel = 0; pixel < layer.width * layer.height; pixel += 1) {
    const offset = pixel * 4;
    const alphaByte = mask.data[offset];
    if (alphaByte < 64) continue;
    const alpha = alphaByte / 255;
    const result = [0, 1, 2].map((channel) => (
      layer.data[offset + channel] * alpha + base.data[offset + channel] * (1 - alpha)
    ));
    const delta = Math.sqrt(result.reduce((sum, value, channel) => (
      sum + (value - base.data[offset + channel]) ** 2
    ), 0));
    deltas.push(delta);
    const baseLuma = base.data[offset] * .2126 + base.data[offset + 1] * .7152
      + base.data[offset + 2] * .0722;
    const resultLuma = result[0] * .2126 + result[1] * .7152 + result[2] * .0722;
    count += 1;
    baseLumaSum += baseLuma;
    resultLumaSum += resultLuma;
    baseLumaSquared += baseLuma ** 2;
    resultLumaSquared += resultLuma ** 2;
    lumaProducts += baseLuma * resultLuma;
  }
  deltas.sort((a, b) => a - b);
  const covariance = lumaProducts - baseLumaSum * resultLumaSum / count;
  const baseVariance = baseLumaSquared - baseLumaSum ** 2 / count;
  const resultVariance = resultLumaSquared - resultLumaSum ** 2 / count;
  return {
    ...stats,
    meanColorDelta: deltas.reduce((sum, value) => sum + value, 0) / deltas.length,
    p10ColorDelta: deltas[Math.floor(deltas.length * .1)],
    textureCorrelation: covariance / Math.sqrt(baseVariance * resultVariance),
  };
}

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
  await page.waitForFunction(() => [...document.querySelectorAll("#monsterArt .damage-overlay")]
    .every((layer) => layer.complete && layer.naturalWidth > 0));
  await page.waitForFunction(() => [...document.querySelectorAll("#partOverlays .hit-overlay")]
    .every((layer) => layer.complete && layer.naturalWidth > 0));

  const setup = await page.evaluate(() => ({
    isPainPriestEncounter,
    encounterName: encounter.name,
    art: elements.monsterFigure.getAttribute("src"),
    naturalSize: [elements.monsterFigure.naturalWidth, elements.monsterFigure.naturalHeight],
    viewBox: elements.partGrid.getAttribute("viewBox"),
    parts: state.parts.map(({ id, durability }) => ({ id, durability })),
    actions: monsterActions.map(({ id, damage, accuracy, duration }) => ({ id, damage, accuracy, duration })),
    headDamageImage: regions.find((region) => region.id === "head")?.damageImage ?? null,
    damageLayers: [...document.querySelectorAll("#monsterArt .damage-overlay")]
      .map((layer) => ({
        part: layer.dataset.part,
        clipped: Boolean(layer.style.clipPath),
        size: [layer.naturalWidth, layer.naturalHeight],
        directChild: layer.parentElement === elements.monsterArt,
      })),
    hitLayers: [...document.querySelectorAll("#partOverlays .hit-overlay")]
      .map((layer) => ({
        part: layer.dataset.part,
        source: layer.getAttribute("src"),
        clipped: layer.classList.contains("clipped") || Boolean(layer.style.clipPath),
        size: [layer.naturalWidth, layer.naturalHeight],
      })),
    hitZoneBounds: [...document.querySelectorAll("#partGrid .hit-zone")]
      .map((zone) => {
        const bounds = zone.getBBox();
        return {
          part: zone.dataset.part,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        };
      }),
    calloutOverflow: getComputedStyle(elements.partCallouts).overflow,
    shortcuts: partKeys,
  }));
  const alphaStats = ["right_hand", "left_hand", "legs"].map(readDamageStats);
  const hitStats = ["head", "right_hand", "left_hand", "legs"].map(readHitStats);
  const anatomyBounds = {
    head: { minX: 400, minY: 210, maxX: 665, maxY: 535 },
    right_hand: { minX: 230, minY: 125, maxX: 380, maxY: 300 },
    left_hand: { minX: 575, minY: 585, maxX: 790, maxY: 775 },
    legs: { minX: 455, minY: 1295, maxX: 585, maxY: 1545 },
  };
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
  assert(setup.headDamageImage === null
    && !fs.existsSync(path.resolve(__dirname, "../battle/assets/damage-overlays/pain-priest-head-destroyed.png")),
  "致死頭部不應有持續顯示的部位破壞圖");
  assert(setup.damageLayers.length === 3
    && setup.damageLayers.map((layer) => layer.part).sort().join(",") === "left_hand,legs,right_hand"
    && setup.damageLayers.every((layer) => !layer.clipped
      && layer.size.join("x") === "957x1643" && layer.directChild),
  "三張非致死部位破壞圖必須是不依賴 CSS 裁切的同尺寸共同容器圖層");
  assert(setup.hitLayers.length === 4
    && setup.hitLayers.map((layer) => layer.part).sort().join(",") === "head,left_hand,legs,right_hand"
    && setup.hitLayers.every((layer) => layer.source === `assets/hit-overlays/pain-priest-${layer.part}.png`
      && !layer.clipped && layer.size.join("x") === "957x1643"),
  "四個命中高亮必須各自使用原尺寸的精細遮罩圖，不可使用 CSS 矩形裁切");
  assert(setup.calloutOverflow === "hidden", "部位提示 SVG 不可依賴越界顯示");
  assert(alphaStats.every((layer) => layer.visible > 0
    && layer.visible < layer.size[0] * layer.size[1] * .1
    && layer.transparent > layer.visible && layer.corners.every((alpha) => alpha === 0)
    && layer.alphaMismatch === 0 && layer.occupancy < .8),
  "部位破壞圖必須逐像素套用不規則修補遮罩；遮罩外與四角應完全透明");
  assert(hitStats.every((layer) => layer.visible > 0
    && layer.visible < layer.size[0] * layer.size[1] * .2
    && layer.transparent > layer.visible && layer.corners.every((alpha) => alpha === 0)
    && layer.alphaMismatch === 0 && layer.occupancy < .8),
  "命中高亮必須逐像素套用 2 倍解析 GrabCut 遮罩，不可退化成矩形色塊");
  assert(hitStats.every((layer) => layer.bounds.minX >= anatomyBounds[layer.part].minX
    && layer.bounds.minY >= anatomyBounds[layer.part].minY
    && layer.bounds.maxX <= anatomyBounds[layer.part].maxX
    && layer.bounds.maxY <= anatomyBounds[layer.part].maxY),
  "命中高亮只能涵蓋設定的解剖部位，不得染到衣袖、裙擺、前臂、武器或背景");
  assert(hitStats.every((layer) => layer.meanColorDelta >= 55
    && layer.p10ColorDelta >= 35 && layer.textureCorrelation >= .8),
  "選取色在暗背景中必須明顯可辨，且需保留原部位明暗與材質");
  assert(setup.hitZoneBounds.every((zone) => {
    const limits = anatomyBounds[zone.part];
    const maskBounds = hitStats.find((layer) => layer.part === zone.part).bounds;
    const maskArea = (maskBounds.maxX - maskBounds.minX + 1)
      * (maskBounds.maxY - maskBounds.minY + 1);
    return zone.x >= limits.minX && zone.y >= limits.minY
      && zone.x + zone.width <= limits.maxX && zone.y + zone.height <= limits.maxY
      && zone.x <= maskBounds.minX + 16 && zone.y <= maskBounds.minY + 16
      && zone.x + zone.width >= maskBounds.maxX - 16
      && zone.y + zone.height >= maskBounds.maxY - 16
      && zone.width * zone.height / maskArea < 1.6;
  }), "SVG 點擊區必須緊貼同一解剖部位，不得仍使用舊的整條肢體範圍");
  assert(setup.shortcuts.legs === "R", "第四部位沒有配置快捷鍵");

  const overlaps = (a, b) => !(a.maxX < b.minX || b.maxX < a.minX
    || a.maxY < b.minY || b.maxY < a.minY);
  assert(alphaStats.every((layer, index) => alphaStats.slice(index + 1)
    .every((other) => !overlaps(layer.bounds, other.bounds))),
  "三個局部破壞遮罩不可互相重疊");

  const calloutChecks = await page.evaluate(() => state.parts.map((part) => {
    part.revealed = true;
    renderPartCallout(part);
    const group = elements.partCallouts.querySelector(".part-callout");
    const bounds = group.dataset.bounds.split(",").map(Number);
    const padding = Number(group.dataset.safePadding);
    const [viewX, viewY, viewWidth, viewHeight] = elements.partCallouts
      .getAttribute("viewBox").split(/\s+/).map(Number);
    const calloutRect = group.getBoundingClientRect();
    const intentRect = elements.intentCard.getBoundingClientRect();
    const overlapsIntent = calloutRect.right > intentRect.left
      && calloutRect.left < intentRect.right
      && calloutRect.bottom > intentRect.top
      && calloutRect.top < intentRect.bottom;
    return {
      part: part.id,
      padding,
      bounds,
      adjusted: group.dataset.boundsAdjusted,
      inBounds: bounds[0] >= viewX + padding - .01
        && bounds[1] >= viewY + padding - .01
        && bounds[0] + bounds[2] <= viewX + viewWidth - padding + .01
        && bounds[1] + bounds[3] <= viewY + viewHeight - padding + .01,
      overlapsIntent,
    };
  }));
  assert(calloutChecks.every((check) => check.padding === 24 && check.inBounds),
    "部位提示必須用 getBBox() 驗證，且距離 viewBox 四邊至少 24px");
  assert(calloutChecks.every((check) => !check.overlapsIntent),
    "部位提示不可與敵方意圖卡重疊");

  const measureAttackAlignment = async (viewport) => {
    await page.setViewportSize(viewport);
    return page.evaluate(async () => {
      resetState();
      state.active = true;
      state.selectedAction = actions.find((action) => action.type === "attack").id;
      state.selectedPart = "right_hand";
      state.parts.forEach((part) => { part.revealed = true; });
      elements.modal.classList.remove("open");
      renderParts();
      updateView();
      const rectOf = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          centerX: rect.left + rect.width / 2,
          centerY: rect.top + rect.height / 2,
        };
      };
      const restingArt = rectOf(elements.monsterArt);
      animateMonster("attack");
      await new Promise((resolve) => setTimeout(resolve, 100));

      const overlay = document.querySelector('[data-part="right_hand"].hit-overlay');
      return {
        viewport: [innerWidth, innerHeight],
        restingArt,
        art: rectOf(elements.monsterArt),
        overlay: rectOf(overlay),
        selectedFilter: getComputedStyle(overlay).filter,
        callouts: rectOf(elements.partCallouts),
        zones: rectOf(elements.partGrid),
        transforms: [
          getComputedStyle(elements.monsterArt).transform,
          getComputedStyle(elements.partOverlays).transform,
          getComputedStyle(elements.partCallouts).transform,
          getComputedStyle(elements.partGrid).transform,
        ],
        origins: [
          getComputedStyle(elements.monsterArt).transformOrigin,
          getComputedStyle(elements.partOverlays).transformOrigin,
          getComputedStyle(elements.partCallouts).transformOrigin,
          getComputedStyle(elements.partGrid).transformOrigin,
        ],
      };
    });
  };
  const attackAlignment = [
    await measureAttackAlignment({ width: 1600, height: 1050 }),
    await measureAttackAlignment({ width: 430, height: 932 }),
  ];
  const sameRect = (a, b) => ["left", "top", "width", "height", "centerX", "centerY"]
    .every((key) => Math.abs(a[key] - b[key]) < .25);
  assert(attackAlignment.every((check) => [check.overlay, check.callouts, check.zones]
    .every((rect) => sameRect(check.art, rect))
    && check.art.width > check.restingArt.width
    && check.art.height > check.restingArt.height
    && check.selectedFilter.includes("brightness(1.35)")
    && check.selectedFilter.includes("saturate(1.6)")
    && !check.selectedFilter.includes("drop-shadow")
    && new Set(check.transforms).size === 1
    && !check.transforms[0].startsWith("matrix(1, 0, 0, 1,")
    && new Set(check.origins).size === 1),
  "怪物攻擊放大時，本體、部位圖、提示與命中區必須使用相同中心點和 transform");
  await page.setViewportSize({ width: 1600, height: 1050 });

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
      hitOverlayOpacity: getComputedStyle(
        document.querySelector('[data-part="right_hand"].hit-overlay'),
      ).opacity,
    };

    resetState();
    now = performance.now();
    prepareAction("claw", now);
    const left = state.parts.find((part) => part.id === "left_hand");
    applyPartDamage(left, left.durability, now);
    updateView(now);
    const leftResult = {
      available: monsterActions.filter(canMonsterUseAction).map((action) => action.id),
      current: state.currentMonsterAction.id,
      layerVisible: document.querySelector('[data-part="left_hand"].damage-overlay').classList.contains("visible"),
    };
    const secondHand = state.parts.find((part) => part.id === "right_hand");
    applyPartDamage(secondHand, secondHand.durability, now);
    updateView(now);
    const bothHandLayers = document.querySelectorAll(
      '[data-part="left_hand"].damage-overlay.visible, [data-part="right_hand"].damage-overlay.visible',
    ).length;

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
      hasPersistentDamageLayer: Boolean(document.querySelector('[data-part="head"].damage-overlay')),
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
    return { rightResult, leftResult, bothHandLayers, legsResult, headResult, missResult };
  });

  assert(!mechanics.rightResult.available.includes("stab") && mechanics.rightResult.current !== "stab",
    "右手破壞後仍可使用刺擊");
  assert(mechanics.rightResult.layerVisible && mechanics.rightResult.hitOverlayOpacity === "0",
    "右手破壞圖應顯示，但原命中高亮不得半透明殘留");
  assert(!mechanics.leftResult.available.includes("claw") && mechanics.leftResult.current !== "claw"
    && mechanics.leftResult.layerVisible,
    "左手破壞後仍可使用爪擊");
  assert(mechanics.bothHandLayers === 2, "左右手破壞圖無法同時疊加");
  assert(mechanics.legsResult.speed === .7
    && Math.abs(mechanics.legsResult.actionDuration - 30 / .7) < .001
    && Math.abs(mechanics.legsResult.extraRemaining - (30 / .7 - 30) * 1000) < 2,
  "雙腿破壞沒有把當前及後續行動速度降為 70%");
  assert(mechanics.legsResult.effect.includes("降低 30%") && mechanics.legsResult.layerVisible,
    "斷腿效果或破壞圖層沒有正確顯示");
  assert(mechanics.headResult.stun.stunned && mechanics.headResult.stunDelay === 2000,
    "頭部命中沒有暈眩 2 秒");
  assert(mechanics.headResult.lethal.destroyed && mechanics.headResult.monsterHealth === 0
    && !mechanics.headResult.hasPersistentDamageLayer,
    "頭部破壞沒有立即擊殺");
  assert(mechanics.missResult.healthUnchanged && mechanics.missResult.log.includes("沒有命中"),
    "敵方低命中招式沒有進行命中判定");
  assert(errors.length === 0, `頁面錯誤：${errors.join("；")}`);

  const screenshotDir = path.join(os.tmpdir(), "soot-and-sin-pain-priest-validation");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const captureDamageState = async (name, destroyedParts, viewport) => {
    await page.setViewportSize(viewport);
    await page.evaluate((partIds) => {
      resetState();
      state.active = true;
      Math.random = () => 0;
      elements.modal.classList.remove("open");
      beginMonsterAction(performance.now());
      state.parts.forEach((part) => { part.destroyed = partIds.includes(part.id); });
      renderParts();
      updateView();
    }, destroyedParts);
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  };
  const visualCases = [
    ["initial", []],
    ["right-hand", ["right_hand"]],
    ["left-hand", ["left_hand"]],
    ["legs", ["legs"]],
    ["all-persistent", ["right_hand", "left_hand", "legs"]],
  ];
  for (const [name, partIds] of visualCases) {
    await captureDamageState(`desktop-${name}`, partIds, { width: 1600, height: 1050 });
  }
  const captureHitState = async (name, partId, viewport) => {
    await page.setViewportSize(viewport);
    await page.evaluate((selectedPart) => {
      resetState();
      state.active = true;
      state.selectedAction = actions.find((action) => action.type === "attack").id;
      state.selectedPart = selectedPart;
      state.parts.forEach((part) => { part.revealed = true; });
      elements.modal.classList.remove("open");
      renderParts();
      updateView();
    }, partId);
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  };
  for (const part of ["head", "right_hand", "left_hand", "legs"]) {
    await captureHitState(`desktop-hit-${part}`, part, { width: 1600, height: 1050 });
  }
  const captureAttackAlignment = async (name, viewport) => {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      resetState();
      state.active = true;
      state.selectedAction = actions.find((action) => action.type === "attack").id;
      state.selectedPart = "right_hand";
      state.parts.forEach((part) => { part.revealed = true; });
      elements.modal.classList.remove("open");
      renderParts();
      updateView();
      animateMonster("attack");
    });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
  };
  await captureAttackAlignment("desktop-attack-alignment", { width: 1600, height: 1050 });
  await page.evaluate(() => {
    resetState();
    state.active = true;
    state.parts.forEach((part) => { part.destroyed = part.id !== "head"; });
    renderParts();
    updateView();
    animateMonster("hit");
  });
  const stackedLayers = await page.evaluate(() => ({
    visible: document.querySelectorAll("#monsterArt .damage-overlay.visible").length,
    total: document.querySelectorAll("#monsterArt > img").length,
    headLayer: Boolean(document.querySelector('[data-part="head"].damage-overlay')),
    sharedAnimation: elements.monsterArt.classList.contains("hit"),
  }));
  assert(stackedLayers.visible === 3 && stackedLayers.total === 4
    && !stackedLayers.headLayer && stackedLayers.sharedAnimation,
    "多部位破壞圖沒有同時顯示，或受擊動畫未套用共同 monsterArt 容器");
  await page.screenshot({ path: path.join(screenshotDir, "desktop-all-persistent-hit.png"), fullPage: true });
  await page.waitForTimeout(500);
  for (const [name, partIds] of visualCases) {
    await captureDamageState(`mobile-${name}`, partIds, { width: 430, height: 932 });
  }
  for (const part of ["head", "right_hand", "left_hand", "legs"]) {
    await captureHitState(`mobile-hit-${part}`, part, { width: 430, height: 932 });
  }
  await captureAttackAlignment("mobile-attack-alignment", { width: 430, height: 932 });
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
  console.log(JSON.stringify({
    ok: true,
    setup,
    alphaStats,
    hitStats,
    calloutChecks,
    attackAlignment,
    mechanics,
    stackedLayers,
    routeResult,
    screenshotDir,
  }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
