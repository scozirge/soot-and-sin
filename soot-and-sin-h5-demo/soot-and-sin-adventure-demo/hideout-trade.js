(() => {
  "use strict";

  const BOARD = { cols: 8, rows: 6 };
  const shapes = {
    canned_food: [[1]], bandage: [[1]], hardtack: [[1]], concentrated_ration: [[1]], monster_meat: [[1]],
    medical_alcohol: [[1], [1]], adrenaline: [[1], [1]], rusted_knife: [[1], [1]],
    old_revolver: [[1, 1], [1, 1]], silver_sabre: [[1], [1], [1]], demon_claw: [[1, 1], [1, 1]],
    demon_head: [[1, 1], [1, 1]], iron_key: [[1, 1]], oil_lamp: [[1, 1], [1, 1], [1, 1], [1, 1]],
  };
  const images = {
    canned_food: "shared-assets/item-can.webp", bandage: "shared-assets/item-bandage.webp",
    hardtack: "shared-assets/item-biscuit.webp", concentrated_ration: "shared-assets/item-biscuit.webp",
    medical_alcohol: "shared-assets/item-spirit.webp", adrenaline: "shared-assets/item-spirit.webp",
    iron_key: "shared-assets/item-key.webp", oil_lamp: "shared-assets/item-lamp.webp",
    rusted_knife: "battle/assets/action-axe.webp", old_revolver: "battle/assets/action-pistol.webp",
    silver_sabre: "battle/assets/action-axe.webp", monster_meat: "battle/assets/loot-monster-meat.svg",
    demon_claw: "battle/assets/loot-demon-claw.svg", demon_head: "battle/assets/loot-demon-head.svg",
  };
  const elements = {
    board: document.querySelector("#tradePlayerBoard"),
    shared: document.querySelector("#tradeSharedList"),
    receiver: document.querySelector("#tradeAllyReceiver"),
    capacity: document.querySelector("#tradeCapacity"),
    playerConfirm: document.querySelector("#tradePlayerConfirm"),
    allyConfirm: document.querySelector("#tradeAllyConfirm"),
    playerReady: document.querySelector("#tradePlayerReady"),
    allyReady: document.querySelector("#tradeAllyReady"),
    cancel: document.querySelector("#tradeCancel"),
    event: document.querySelector("#tradeEvent"),
    status: document.querySelector("#tradeStatus"),
    tooltip: document.querySelector("#tradeTooltip"),
    dragLayer: document.querySelector("#tradeDragLayer"),
    complete: document.querySelector("#tradeComplete"),
    completeClose: document.querySelector("#tradeCompleteClose"),
  };

  let models = [];
  let confirmations = { player: false, ally: false };
  let completed = false;
  let drag = null;
  let allyConfirmTimer;

  function widthOf(shape) { return shape[0].length; }
  function heightOf(shape) { return shape.length; }
  function cellCount(shape) { return shape.flat().filter(Boolean).length; }
  function cloneShape(shape) { return shape.map((row) => [...row]); }
  function rotateShape(shape) { return shape[0].map((_, column) => shape.map((row) => row[column]).reverse()); }
  function itemShape(item) { return cloneShape(shapes[item.id] || (item.category === "food" || item.category === "medical" ? [[1]] : [[1, 1]])); }
  function itemImage(item) { return images[item.id] || "shared-assets/item-reliquary.webp"; }

  function cells(model, x = model.x, y = model.y, shape = model.shape) {
    const result = [];
    shape.forEach((row, rowY) => row.forEach((value, rowX) => {
      if (value) result.push(`${x + rowX}:${y + rowY}`);
    }));
    return result;
  }

  function placement(model, x, y, shape) {
    for (let row = 0; row < heightOf(shape); row += 1) {
      for (let column = 0; column < widthOf(shape); column += 1) {
        if (!shape[row][column]) continue;
        if (x + column < 0 || y + row < 0 || x + column >= BOARD.cols || y + row >= BOARD.rows) return { valid: false };
      }
    }
    const targetCells = new Set(cells(model, x, y, shape));
    const overlaps = models.filter((other) => other.id !== model.id && other.location === "player" && cells(other).some((cell) => targetCells.has(cell)));
    if (!overlaps.length) return { valid: true, stack: null };
    const stack = overlaps.length === 1 && overlaps[0].source.id === model.source.id ? overlaps[0] : null;
    return { valid: Boolean(stack), stack };
  }

  function firstFit(model) {
    for (let y = 0; y <= BOARD.rows - heightOf(model.shape); y += 1) {
      for (let x = 0; x <= BOARD.cols - widthOf(model.shape); x += 1) {
        if (placement(model, x, y, model.shape).valid) return { x, y };
      }
    }
    return null;
  }

  function createModel(source, id, location, offeredBy) {
    return { id, source: { ...source }, location, offeredBy, x: 0, y: 0, shape: itemShape(source), rotation: 0, artScale: source.id === "iron_key" ? .72 : 1 };
  }

  function initialize() {
    cancelDrag();
    clearTimeout(allyConfirmTimer);
    const session = AdventureState.load();
    completed = Boolean(session.hideoutTradeCompleted);
    confirmations = { player: completed, ally: completed };
    models = [];
    session.inventory.forEach((source, index) => {
      const model = createModel(source, `player_${source.id}_${index}`, "player");
      const fit = firstFit(model);
      if (!fit) return;
      model.x = fit.x;
      model.y = fit.y;
      models.push(model);
    });
    if (!completed) {
      models.push(createModel({
        id: "hardtack", name: "軍用硬餅", category: "food", heal: 28,
        usableIn: ["rest"], quantity: 1, rarity: "uncommon", stat: "食物 · 休息時恢復 28 生命",
      }, "morrow_offer_hardtack", "shared", "ally"));
    }
    elements.complete.hidden = true;
    elements.status.textContent = completed ? "本次安全區已完成交易" : "先分配 Morrow 放入的物資，再由雙方確認";
    render();
  }

  function makeShape(shape) {
    const element = document.createElement("span");
    element.className = "trade-shape";
    element.style.gridTemplateColumns = `repeat(${widthOf(shape)}, 1fr)`;
    element.style.gridTemplateRows = `repeat(${heightOf(shape)}, 1fr)`;
    shape.flat().forEach(() => element.append(document.createElement("i")));
    return element;
  }

  function makeGridItem(model, ghost = false) {
    const element = document.createElement("div");
    element.className = `trade-item${ghost ? " trade-ghost" : ""}`;
    element.dataset.tradeId = model.id;
    element.append(makeShape(model.shape));
    const art = document.createElement("span");
    art.className = "trade-art";
    art.innerHTML = `<img src="${itemImage(model.source)}" alt="" draggable="false">`;
    element.append(art);
    layoutArt(element, model);
    if (model.source.quantity > 1) element.insertAdjacentHTML("beforeend", `<b class="trade-quantity">×${model.source.quantity}</b>`);
    return element;
  }

  function layoutArt(element, model) {
    const longest = Math.max(widthOf(model.shape), heightOf(model.shape));
    const art = element.querySelector(".trade-art");
    art.style.width = `${longest / widthOf(model.shape) * 88 * model.artScale}%`;
    art.style.height = `${longest / heightOf(model.shape) * 88 * model.artScale}%`;
    art.querySelector("img").style.transform = `rotate(${model.rotation}deg)`;
  }

  function makeListItem(model) {
    const element = document.createElement("div");
    element.className = "trade-list-item";
    element.dataset.tradeId = model.id;
    element.innerHTML = `<span class="trade-list-art"><img src="${itemImage(model.source)}" alt="" draggable="false"></span><span class="trade-list-copy"><small>${model.offeredBy === "ally" ? "Morrow 放入" : "scozirge 放入"}</small><strong>${model.source.name}</strong><span>${model.source.stat || `取出後佔 ${cellCount(model.shape)} 格`}</span></span>${model.source.quantity > 1 ? `<b class="trade-quantity">×${model.source.quantity}</b>` : ""}`;
    return element;
  }

  function bind(element, model) {
    element.addEventListener("pointerdown", (event) => beginDrag(event, model, element));
    element.addEventListener("pointerenter", (event) => showTooltip(event, model));
    element.addEventListener("pointermove", moveTooltip);
    element.addEventListener("pointerleave", hideTooltip);
  }

  function render() {
    elements.board.replaceChildren();
    elements.shared.replaceChildren();
    models.forEach((model) => {
      if (model.location === "player") {
        const element = makeGridItem(model);
        element.style.left = `${model.x / BOARD.cols * 100}%`;
        element.style.top = `${model.y / BOARD.rows * 100}%`;
        element.style.width = `${widthOf(model.shape) / BOARD.cols * 100}%`;
        element.style.height = `${heightOf(model.shape) / BOARD.rows * 100}%`;
        elements.board.append(element);
        bind(element, model);
      } else if (model.location === "shared") {
        const element = makeListItem(model);
        elements.shared.append(element);
        bind(element, model);
      }
    });
    const used = models.filter((model) => model.location === "player").reduce((sum, model) => sum + cellCount(model.shape), 0);
    elements.capacity.textContent = `${used} / ${BOARD.cols * BOARD.rows}`;
    const blocked = completed || models.some((model) => model.location === "shared");
    ["player", "ally"].forEach((owner) => {
      const button = elements[`${owner}Confirm`];
      button.disabled = owner === "ally" || blocked;
      button.setAttribute("aria-pressed", String(confirmations[owner]));
      button.textContent = confirmations[owner]
        ? `${owner === "player" ? "我方" : "Morrow"}已確認`
        : `${owner === "player" ? "我方確認" : "Morrow 確認中"}`;
      elements[`${owner}Ready`].classList.toggle("ready", confirmations[owner]);
    });
    elements.cancel.disabled = completed;
    scheduleAllyConfirmation();
  }

  function scheduleAllyConfirmation() {
    clearTimeout(allyConfirmTimer);
    if (completed || confirmations.ally || models.some((model) => model.location === "shared")) return;
    allyConfirmTimer = setTimeout(() => confirm("ally", true), 650 + Math.random() * 850);
  }

  function showTooltip(event, model) {
    if (drag) return;
    elements.tooltip.innerHTML = `<strong>${model.source.name}</strong><p>${model.source.stat || "沒有可使用效果"}</p><small>數量 ×${model.source.quantity}　佔用 ${cellCount(model.shape)} 格</small>`;
    elements.tooltip.classList.add("visible");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (drag || !elements.tooltip.classList.contains("visible")) return;
    const bounds = elements.tooltip.getBoundingClientRect();
    elements.tooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - bounds.width - 8)}px`;
    elements.tooltip.style.top = `${Math.min(event.clientY + 14, innerHeight - bounds.height - 8)}px`;
  }

  function hideTooltip() { elements.tooltip.classList.remove("visible"); }

  function beginDrag(event, model, sourceElement) {
    if (completed || drag || event.button !== 0 || model.location === "ally") return;
    event.preventDefault();
    hideTooltip();
    const working = { ...model, shape: cloneShape(model.shape) };
    const sourceRect = sourceElement.getBoundingClientRect();
    const boardRect = elements.board.getBoundingClientRect();
    const fromBoard = model.location === "player";
    const grabX = fromBoard ? Math.min(widthOf(model.shape) - 1, Math.max(0, Math.floor((event.clientX - sourceRect.left) / (sourceRect.width / widthOf(model.shape))))) : 0;
    const grabY = fromBoard ? Math.min(heightOf(model.shape) - 1, Math.max(0, Math.floor((event.clientY - sourceRect.top) / (sourceRect.height / heightOf(model.shape))))) : 0;
    const ghost = makeGridItem(working, true);
    elements.dragLayer.append(ghost);
    sourceElement.classList.add("dragging");
    drag = { model, working, sourceElement, ghost, origin: model.location, grabX, grabY, cellWidth: boardRect.width / BOARD.cols, cellHeight: boardRect.height / BOARD.rows, clientX: event.clientX, clientY: event.clientY, candidate: null };
    updateGhost();
    updateDrag(event.clientX, event.clientY);
    addEventListener("pointermove", onMove);
    addEventListener("pointerup", finishDrag, { once: true });
    addEventListener("pointercancel", cancelDrag, { once: true });
  }

  function updateGhost() {
    drag.ghost.replaceChildren(...makeGridItem(drag.working).childNodes);
    drag.ghost.style.width = `${drag.cellWidth * widthOf(drag.working.shape)}px`;
    drag.ghost.style.height = `${drag.cellHeight * heightOf(drag.working.shape)}px`;
  }

  function onMove(event) { if (drag) updateDrag(event.clientX, event.clientY); }
  function inside(rect, x, y) { return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom; }
  function clearDropUi() {
    document.querySelectorAll(".trade-preview").forEach((element) => element.remove());
    elements.board.classList.remove("drop-active");
    elements.shared.classList.remove("drop-active");
    elements.receiver.classList.remove("drop-active");
  }

  function updateDrag(clientX, clientY) {
    drag.clientX = clientX;
    drag.clientY = clientY;
    drag.ghost.style.left = `${clientX - drag.grabX * drag.cellWidth - drag.cellWidth / 2}px`;
    drag.ghost.style.top = `${clientY - drag.grabY * drag.cellHeight - drag.cellHeight / 2}px`;
    clearDropUi();
    if (drag.origin === "player" && inside(elements.shared.getBoundingClientRect(), clientX, clientY)) {
      drag.candidate = { type: "shared", valid: true };
      elements.shared.classList.add("drop-active");
      return;
    }
    if (drag.origin === "shared" && inside(elements.receiver.getBoundingClientRect(), clientX, clientY)) {
      drag.candidate = { type: "ally", valid: true };
      elements.receiver.classList.add("drop-active");
      return;
    }
    const rect = elements.board.getBoundingClientRect();
    if (!inside(rect, clientX, clientY)) {
      drag.candidate = null;
      return;
    }
    elements.board.classList.add("drop-active");
    const x = Math.floor((clientX - rect.left) / (rect.width / BOARD.cols)) - drag.grabX;
    const y = Math.floor((clientY - rect.top) / (rect.height / BOARD.rows)) - drag.grabY;
    const result = placement(drag.model, x, y, drag.working.shape);
    drag.candidate = { type: "player", x, y, ...result };
    drag.working.shape.forEach((row, rowY) => row.forEach((value, rowX) => {
      if (!value) return;
      const preview = document.createElement("i");
      preview.className = `trade-preview${result.valid ? "" : " invalid"}`;
      preview.style.left = `${(x + rowX) / BOARD.cols * 100}%`;
      preview.style.top = `${(y + rowY) / BOARD.rows * 100}%`;
      preview.style.width = `${100 / BOARD.cols}%`;
      preview.style.height = `${100 / BOARD.rows}%`;
      elements.board.append(preview);
    }));
  }

  function finishDrag() {
    if (!drag) return;
    const current = drag;
    cleanupDrag();
    if (!current.candidate?.valid) return;
    if (current.candidate.type === "shared") {
      current.model.location = "shared";
      current.model.offeredBy = "player";
      invalidateConfirmations(`你將「${current.model.source.name}」放入共用窗`);
    } else if (current.candidate.type === "ally") {
      current.model.location = "ally";
      invalidateConfirmations(`Morrow 收下了「${current.model.source.name}」`);
    } else if (current.candidate.stack) {
      current.candidate.stack.source.quantity += current.model.source.quantity;
      models.splice(models.indexOf(current.model), 1);
      if (current.origin === "shared") invalidateConfirmations(`你收下了「${current.model.source.name}」`);
    } else {
      current.model.location = "player";
      current.model.x = current.candidate.x;
      current.model.y = current.candidate.y;
      current.model.shape = cloneShape(current.working.shape);
      current.model.rotation = current.working.rotation;
      if (current.origin === "shared") invalidateConfirmations(`你收下了「${current.model.source.name}」`);
    }
    render();
  }

  function cleanupDrag() {
    const current = drag;
    removeEventListener("pointermove", onMove);
    removeEventListener("pointerup", finishDrag);
    removeEventListener("pointercancel", cancelDrag);
    clearDropUi();
    current.ghost.remove();
    current.sourceElement.classList.remove("dragging");
    drag = null;
  }

  function cancelDrag() { if (drag) cleanupDrag(); }

  function invalidateConfirmations(message) {
    clearTimeout(allyConfirmTimer);
    const reset = confirmations.player || confirmations.ally;
    confirmations = { player: false, ally: false };
    elements.status.textContent = reset ? `${message}，雙方確認已取消` : message;
  }

  function confirm(owner, value = !confirmations[owner]) {
    if (completed || models.some((model) => model.location === "shared")) return;
    confirmations[owner] = value;
    elements.status.textContent = confirmations[owner] ? `${owner === "player" ? "你" : "Morrow"}已確認` : `${owner === "player" ? "你" : "Morrow"}取消確認`;
    render();
    if (confirmations.player && confirmations.ally) completeTrade();
  }

  function playerInventory() {
    return models.filter((model) => model.location === "player").map((model) => ({ ...model.source }));
  }

  function completeTrade() {
    completed = true;
    clearTimeout(allyConfirmTimer);
    const session = AdventureState.load();
    session.inventory = playerInventory();
    session.hideoutTradeCompleted = true;
    session.lastResult = "與 Morrow 完成物資交換";
    AdventureState.save(session);
    elements.status.textContent = "雙方確認完成，交易成立";
    elements.complete.hidden = false;
    render();
    dispatchEvent(new CustomEvent("hideout-inventory-changed"));
  }

  function cancelTrade() {
    if (completed) return;
    initialize();
    elements.event.hidden = true;
    dispatchEvent(new CustomEvent("hideout-trade-cancelled"));
  }

  addEventListener("keydown", (event) => {
    if (!drag || event.repeat || event.key.toLowerCase() !== "r") return;
    event.preventDefault();
    const oldHeight = heightOf(drag.working.shape);
    const oldGrabX = drag.grabX;
    drag.working.shape = rotateShape(drag.working.shape);
    drag.working.rotation = (drag.working.rotation + 90) % 360;
    drag.grabX = oldHeight - 1 - drag.grabY;
    drag.grabY = oldGrabX;
    updateGhost();
    updateDrag(drag.clientX, drag.clientY);
  });
  elements.playerConfirm.addEventListener("click", () => confirm("player"));
  elements.cancel.addEventListener("click", cancelTrade);
  elements.completeClose.addEventListener("click", () => { elements.complete.hidden = true; });
  addEventListener("hideout-trade-reset", initialize);
  initialize();
})();
