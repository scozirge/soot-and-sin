const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));

  const filePath = path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  await page.goto(`file:///${filePath}`);
  await page.waitForSelector("[data-item='canned_food_loot']");

  if (await page.locator(".grid-board").count() !== 1) throw new Error("Only the backpack may use a grid");
  if (await page.locator("#lootTray").count() !== 1) throw new Error("The unlimited loot tray is missing");
  const bodyText = await page.locator("body").innerText();
  if (bodyText.includes("裝備中") || bodyText.includes("防具欄")) throw new Error("Equipment UI must not be present");
  const initialState = await page.evaluate(() => {
    const loot = window.inventoryPrototype.items.filter(item => item.board === "loot");
    const bandage = loot.find(item => item.kind === "clean_bandage");
    return {
      uniqueKinds: new Set(loot.map(item => item.kind)).size === loot.length,
      bandageQuantity: bandage?.quantity,
      compactItems: window.inventoryPrototype.items.filter(item => ["food", "medical"].includes(item.category)).every(item => item.shape.flat().filter(Boolean).length <= 2),
      toolSizes: window.inventoryPrototype.items.filter(item => item.category === "tool").map(item => item.shape.flat().filter(Boolean).length)
    };
  });
  if (!initialState.uniqueKinds || initialState.bandageQuantity !== 5) throw new Error(`Search loot must begin stacked: ${JSON.stringify(initialState)}`);
  if (!initialState.compactItems || JSON.stringify(initialState.toolSizes) !== JSON.stringify([2, 8])) throw new Error(`Item footprint categories are incorrect: ${JSON.stringify(initialState)}`);
  const imageState = await page.locator(".item-art img").evaluateAll(images => ({
    count: images.length,
    loaded: images.every(image => image.complete && image.naturalWidth > 0),
    webp: images.every(image => image.src.endsWith(".webp"))
  }));
  if (!imageState.loaded || !imageState.webp) throw new Error(`Formal item art did not load: ${JSON.stringify(imageState)}`);

  const sourceCan = page.locator("[data-item='canned_food_loot']");
  const targetCan = page.locator("[data-item='canned_food_pack']");
  await sourceCan.hover();
  const tooltipState = await page.locator("#itemTooltip").evaluate(element => ({
    visible: element.classList.contains("visible"),
    title: element.querySelector("strong")?.textContent,
    effect: element.querySelector("p")?.textContent,
    meta: element.querySelector("small")?.textContent,
    splitHint: element.querySelector("em")?.textContent
  }));
  if (!tooltipState.visible || tooltipState.title !== "密封罐頭" || !tooltipState.effect?.includes("恢復 18 點生命") || !tooltipState.meta?.includes("數量 ×2") || !tooltipState.splitHint?.includes("拆分一半")) {
    throw new Error(`Hover information card is incomplete: ${JSON.stringify(tooltipState)}`);
  }
  const sourceBox = await sourceCan.boundingBox();
  const targetBox = await targetCan.boundingBox();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 4);
  await page.mouse.down();
  if (await page.locator("#itemTooltip").evaluate(element => element.classList.contains("visible"))) {
    throw new Error("Tooltip must hide while dragging");
  }
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
  await page.mouse.up();

  const mergeState = await page.evaluate(() => window.inventoryPrototype.items
    .filter(item => item.kind === "canned_food")
    .map(item => ({ id: item.id, board: item.board, quantity: item.quantity })));
  if (mergeState.length !== 1 || mergeState[0].board !== "backpack" || mergeState[0].quantity !== 3) {
    throw new Error(`Same-item merge failed: ${JSON.stringify(mergeState)}`);
  }

  const key = page.locator("[data-item='iron_key']");
  const keyBox = await key.boundingBox();
  const board = page.locator("#backpackBoard");
  const boardBox = await board.boundingBox();
  const cellWidth = boardBox.width / 8;
  const cellHeight = boardBox.height / 6;
  await page.mouse.move(keyBox.x + keyBox.width / 2, keyBox.y + keyBox.height / 2);
  await page.mouse.down();
  await page.keyboard.press("r");
  const rotationVisual = await page.locator(".drag-ghost").evaluate(element => ({
    imageTransform: element.querySelector("img").style.transform,
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height
  }));
  if (rotationVisual.imageTransform !== "rotate(90deg)" || rotationVisual.height < rotationVisual.width * 1.8) {
    throw new Error(`Rotated art did not follow the footprint: ${JSON.stringify(rotationVisual)}`);
  }
  await page.mouse.move(boardBox.x + cellWidth * 5.5, boardBox.y + cellHeight * 3.5, { steps: 10 });
  await page.mouse.up();

  const rotated = await page.evaluate(() => {
    const item = window.inventoryPrototype.items.find(entry => entry.id === "iron_key");
    return { board: item.board, x: item.x, y: item.y, shape: item.shape };
  });
  if (rotated.board !== "backpack" || rotated.x !== 5 || rotated.y !== 2) {
    throw new Error(`Rotated backpack placement failed: ${JSON.stringify(rotated)}`);
  }
  if (JSON.stringify(rotated.shape) !== JSON.stringify([[1], [1]])) {
    throw new Error(`R rotation failed: ${JSON.stringify(rotated.shape)}`);
  }
  await page.screenshot({ path: path.resolve(__dirname, "..", "preview-rotated.png"), fullPage: true });

  const bandage = page.locator("[data-item='clean_bandage']");
  const bandageBox = await bandage.boundingBox();
  await page.mouse.move(bandageBox.x + bandageBox.width / 2, bandageBox.y + bandageBox.height / 2);
  await page.keyboard.down("Shift");
  await page.mouse.down();
  await page.keyboard.up("Shift");
  await page.mouse.move(boardBox.x + cellWidth * 4.5, boardBox.y + cellHeight * 4.5, { steps: 10 });
  await page.mouse.up();
  const splitState = await page.evaluate(() => window.inventoryPrototype.items
    .filter(item => item.kind === "clean_bandage")
    .map(item => ({ id: item.id, board: item.board, quantity: item.quantity, x: item.x, y: item.y })));
  if (splitState.length !== 2 || !splitState.some(item => item.board === "loot" && item.quantity === 3) || !splitState.some(item => item.board === "backpack" && item.quantity === 2 && item.x === 4 && item.y === 4)) {
    throw new Error(`Shift-drag stack split failed: ${JSON.stringify(splitState)}`);
  }

  const biscuit = page.locator("[data-item='hard_biscuit']");
  const biscuitBox = await biscuit.boundingBox();
  const trayBox = await page.locator("#lootTray").boundingBox();
  await page.mouse.move(biscuitBox.x + biscuitBox.width / 2, biscuitBox.y + biscuitBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(trayBox.x + trayBox.width - 30, trayBox.y + trayBox.height / 2, { steps: 10 });
  await page.mouse.up();

  const appendState = await page.evaluate(() => {
    const state = window.inventoryPrototype.items;
    return { board: state.find(item => item.id === "hard_biscuit").board, lastId: state.at(-1).id };
  });
  if (appendState.board !== "loot" || appendState.lastId !== "hard_biscuit") {
    throw new Error(`Unlimited tray append failed: ${JSON.stringify(appendState)}`);
  }
  if (errors.length) throw new Error(`Page errors: ${errors.join(" | ")}`);

  await page.reload();
  await page.waitForSelector("[data-item='medical_spirit']");
  await page.locator("[data-item='medical_spirit']").hover();
  await page.screenshot({ path: path.resolve(__dirname, "..", "preview-inventory.png"), fullPage: true });
  console.log(JSON.stringify({ ok: true, initialState, imageState, tooltipState, mergeState, rotationVisual, rotated, splitState, appendState, errors }, null, 2));
  await browser.close();
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
