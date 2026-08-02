(() => {
  "use strict";

  const BOARD = { cols: 8, rows: 6 };
  const names = { player: "scozirge", ally: "Morrow" };
  const categoryNames = { food: "食物", medical: "醫療用品", material: "材料", artifact: "貴重物", tool: "工具", weapon: "武器" };
  const itemImages = {
    can: "assets/item-can.webp",
    bandage: "assets/item-bandage.webp",
    spirit: "assets/item-spirit.webp",
    parts: "assets/item-parts.webp",
    reliquary: "assets/item-reliquary.webp",
    key: "assets/item-key.webp",
    lamp: "assets/item-lamp.webp",
    biscuit: "assets/item-biscuit.webp",
    revolver: "assets/item-revolver.webp",
  };
  const elements = {
    boards: {
      player: document.querySelector("#playerBoard"),
      ally: document.querySelector("#allyBoard"),
    },
    shared: document.querySelector("#sharedList"),
    playerCapacity: document.querySelector("#playerCapacity"),
    allyCapacity: document.querySelector("#allyCapacity"),
    playerConfirm: document.querySelector("#playerConfirm"),
    allyConfirm: document.querySelector("#allyConfirm"),
    playerReady: document.querySelector("#playerReadyState"),
    allyReady: document.querySelector("#allyReadyState"),
    status: document.querySelector("#statusText"),
    tooltip: document.querySelector("#itemTooltip"),
    dragLayer: document.querySelector("#dragLayer"),
    complete: document.querySelector("#completeOverlay"),
    reset: document.querySelector("#resetButton"),
    completeReset: document.querySelector("#completeReset"),
  };

  function freshItems() {
    return [
      { id: "player-lamp", kind: "oil_lamp", name: "舊式油燈", effect: "搜索昏暗場所時，提高發現物資的機率。", category: "tool", icon: "lamp", location: "player", x: 0, y: 0, shape: [[1, 1], [1, 1], [1, 1], [1, 1]], rotation: 0, quantity: 1 },
      { id: "player-revolver", kind: "old_revolver", name: "老舊左輪", effect: "傷害 26、命中 82%，彈巢運作並不穩定。", category: "weapon", icon: "revolver", location: "player", x: 3, y: 0, shape: [[1, 1], [1, 1]], rotation: 0, quantity: 1 },
      { id: "player-bandage", kind: "clean_bandage", name: "乾淨繃帶", effect: "可在戰鬥中使用，恢復 12 點生命。", category: "medical", icon: "bandage", location: "player", x: 6, y: 0, shape: [[1]], rotation: 0, quantity: 3 },
      { id: "player-can", kind: "canned_food", name: "密封罐頭", effect: "只能在藏匿處食用，恢復 18 點生命。", category: "food", icon: "can", location: "player", x: 7, y: 0, shape: [[1]], rotation: 0, quantity: 2 },
      { id: "player-key", kind: "iron_key", name: "鐵製鑰匙", effect: "探索時可開啟一扇上鎖的門或容器。", category: "tool", icon: "key", artScale: .72, location: "player", x: 5, y: 2, shape: [[1, 1]], rotation: 0, quantity: 1 },
      { id: "ally-reliquary", kind: "black_reliquary", name: "黑霧聖匣", effect: "來歷不明的貴重物，能以高價出售。", category: "artifact", icon: "reliquary", location: "ally", x: 0, y: 0, shape: [[1, 1], [1, 1]], rotation: 0, quantity: 1 },
      { id: "ally-spirit", kind: "medical_spirit", name: "醫療酒精", effect: "可在戰鬥中使用，解除流血並恢復 6 點生命。", category: "medical", icon: "spirit", location: "ally", x: 3, y: 0, shape: [[1], [1]], rotation: 0, quantity: 1 },
      { id: "ally-parts", kind: "precision_parts", name: "精密零件", effect: "稀有機械材料，可帶回家族工坊使用或出售。", category: "material", icon: "parts", location: "ally", x: 5, y: 0, shape: [[1, 1]], rotation: 0, quantity: 1 },
      { id: "ally-biscuit", kind: "hard_biscuit", name: "軍用硬餅", effect: "只能在藏匿處食用，恢復 10 點生命。", category: "food", icon: "biscuit", location: "ally", x: 3, y: 3, shape: [[1]], rotation: 0, quantity: 3 },
      { id: "ally-key", kind: "iron_key", name: "鐵製鑰匙", effect: "探索時可開啟一扇上鎖的門或容器。", category: "tool", icon: "key", artScale: .72, location: "ally", x: 5, y: 3, shape: [[1, 1]], rotation: 0, quantity: 1 },
    ];
  }

  let items = freshItems();
  let confirmations = { player: false, ally: false };
  let completed = false;
  let drag = null;

  function widthOf(shape) { return shape[0].length; }
  function heightOf(shape) { return shape.length; }
  function cellsOf(shape) { return shape.flat().filter(Boolean).length; }
  function cloneShape(shape) { return shape.map((row) => [...row]); }
  function rotateShape(shape) { return shape[0].map((_, column) => shape.map((row) => row[column]).reverse()); }

  function createShape(shape) {
    const element = document.createElement("span");
    element.className = "item-shape";
    element.style.gridTemplateColumns = `repeat(${widthOf(shape)}, 1fr)`;
    element.style.gridTemplateRows = `repeat(${heightOf(shape)}, 1fr)`;
    shape.flat().forEach((value) => {
      const cell = document.createElement("i");
      cell.className = `item-cell${value ? "" : " empty"}`;
      element.append(cell);
    });
    return element;
  }

  function createGridItem(item, ghost = false) {
    const element = document.createElement("div");
    element.className = `item${ghost ? " drag-ghost" : ""}`;
    element.dataset.itemId = item.id;
    element.append(createShape(item.shape));
    const art = document.createElement("span");
    art.className = "item-art";
    art.innerHTML = `<img src="${itemImages[item.icon]}" alt="" draggable="false">`;
    element.append(art);
    layoutArt(element, item);
    if (item.quantity > 1) {
      const quantity = document.createElement("b");
      quantity.className = "item-quantity";
      quantity.textContent = `×${item.quantity}`;
      element.append(quantity);
    }
    return element;
  }

  function layoutArt(element, item) {
    const longest = Math.max(widthOf(item.shape), heightOf(item.shape));
    const scale = item.artScale ?? 1;
    const art = element.querySelector(".item-art");
    art.style.width = `${longest / widthOf(item.shape) * 88 * scale}%`;
    art.style.height = `${longest / heightOf(item.shape) * 88 * scale}%`;
    art.querySelector("img").style.transform = `rotate(${item.rotation}deg)`;
  }

  function createSharedItem(item) {
    const element = document.createElement("div");
    element.className = "shared-item";
    element.dataset.itemId = item.id;
    element.innerHTML = `
      <span class="shared-art"><img src="${itemImages[item.icon]}" alt="" draggable="false"></span>
      <span class="shared-copy"><small>${names[item.offeredBy]} 放入</small><strong>${item.name}</strong><span>${categoryNames[item.category]} · 取出後佔 ${cellsOf(item.shape)} 格</span></span>
      ${item.quantity > 1 ? `<b class="item-quantity">×${item.quantity}</b>` : ""}
    `;
    return element;
  }

  function positionItem(element, item) {
    element.style.left = `${item.x / BOARD.cols * 100}%`;
    element.style.top = `${item.y / BOARD.rows * 100}%`;
    element.style.width = `${widthOf(item.shape) / BOARD.cols * 100}%`;
    element.style.height = `${heightOf(item.shape) / BOARD.rows * 100}%`;
  }

  function bindItem(element, item) {
    element.addEventListener("pointerdown", (event) => beginDrag(event, item, element));
    element.addEventListener("pointerenter", (event) => showTooltip(event, item));
    element.addEventListener("pointermove", moveTooltip);
    element.addEventListener("pointerleave", hideTooltip);
  }

  function render() {
    Object.values(elements.boards).forEach((board) => board.replaceChildren());
    elements.shared.replaceChildren();
    items.forEach((item) => {
      if (item.location === "shared") {
        const element = createSharedItem(item);
        elements.shared.append(element);
        bindItem(element, item);
        return;
      }
      const element = createGridItem(item);
      positionItem(element, item);
      elements.boards[item.location].append(element);
      bindItem(element, item);
    });
    updateStateUi();
  }

  function updateStateUi() {
    ["player", "ally"].forEach((owner) => {
      const used = items.filter((item) => item.location === owner).reduce((sum, item) => sum + cellsOf(item.shape), 0);
      elements[`${owner}Capacity`].textContent = `${used} / ${BOARD.cols * BOARD.rows}`;
      const button = elements[`${owner}Confirm`];
      button.disabled = completed || items.some((item) => item.location === "shared");
      button.setAttribute("aria-pressed", String(confirmations[owner]));
      button.querySelector("strong").textContent = confirmations[owner] ? "已確認" : "確認交易";
      const ready = elements[`${owner}Ready`];
      ready.classList.toggle("ready", confirmations[owner]);
      ready.querySelector("strong").textContent = confirmations[owner] ? "已確認" : "未確認";
    });
  }

  function itemCells(item, x = item.x, y = item.y, shape = item.shape) {
    const cells = [];
    shape.forEach((row, rowY) => row.forEach((value, rowX) => {
      if (value) cells.push(`${x + rowX}:${y + rowY}`);
    }));
    return cells;
  }

  function placement(item, owner, x, y, shape) {
    for (let row = 0; row < heightOf(shape); row += 1) {
      for (let column = 0; column < widthOf(shape); column += 1) {
        if (!shape[row][column]) continue;
        if (x + column < 0 || y + row < 0 || x + column >= BOARD.cols || y + row >= BOARD.rows) return { valid: false };
      }
    }
    const targetCells = new Set(itemCells(item, x, y, shape));
    const overlaps = items.filter((other) => other.id !== item.id && other.location === owner && itemCells(other).some((cell) => targetCells.has(cell)));
    if (!overlaps.length) return { valid: true, stack: null };
    const stack = item.location === "shared" && overlaps.length === 1 && overlaps[0].kind === item.kind ? overlaps[0] : null;
    return { valid: Boolean(stack), stack };
  }

  function showTooltip(event, item) {
    if (drag) return;
    elements.tooltip.innerHTML = `<strong>${item.name}</strong><em>${categoryNames[item.category]}</em><p>${item.effect}</p><small>數量 ×${item.quantity}　佔用 ${cellsOf(item.shape)} 格</small>`;
    elements.tooltip.classList.add("visible");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (drag || !elements.tooltip.classList.contains("visible")) return;
    const bounds = elements.tooltip.getBoundingClientRect();
    elements.tooltip.style.left = `${Math.min(event.clientX + 15, innerWidth - bounds.width - 8)}px`;
    elements.tooltip.style.top = `${Math.min(event.clientY + 15, innerHeight - bounds.height - 8)}px`;
  }

  function hideTooltip() { elements.tooltip.classList.remove("visible"); }

  function beginDrag(event, item, sourceElement) {
    if (completed || drag || event.button !== 0) return;
    event.preventDefault();
    hideTooltip();
    const working = { ...item, shape: cloneShape(item.shape) };
    const sourceRect = sourceElement.getBoundingClientRect();
    const boardRect = elements.boards.player.getBoundingClientRect();
    const cellWidth = boardRect.width / BOARD.cols;
    const cellHeight = boardRect.height / BOARD.rows;
    const fromBoard = item.location !== "shared";
    const grabX = fromBoard ? Math.min(widthOf(item.shape) - 1, Math.max(0, Math.floor((event.clientX - sourceRect.left) / (sourceRect.width / widthOf(item.shape))))) : 0;
    const grabY = fromBoard ? Math.min(heightOf(item.shape) - 1, Math.max(0, Math.floor((event.clientY - sourceRect.top) / (sourceRect.height / heightOf(item.shape))))) : 0;
    const ghost = createGridItem(working, true);
    elements.dragLayer.append(ghost);
    sourceElement.classList.add("dragging");
    drag = { item, working, sourceElement, ghost, origin: item.location, grabX, grabY, cellWidth, cellHeight, clientX: event.clientX, clientY: event.clientY, candidate: null };
    updateGhost();
    updateDrag(event.clientX, event.clientY);
    addEventListener("pointermove", onPointerMove);
    addEventListener("pointerup", finishDrag, { once: true });
    addEventListener("pointercancel", cancelDrag, { once: true });
  }

  function updateGhost() {
    drag.ghost.replaceChildren(...createGridItem(drag.working).childNodes);
    drag.ghost.style.width = `${drag.cellWidth * widthOf(drag.working.shape)}px`;
    drag.ghost.style.height = `${drag.cellHeight * heightOf(drag.working.shape)}px`;
  }

  function onPointerMove(event) { if (drag) updateDrag(event.clientX, event.clientY); }

  function clearDropUi() {
    document.querySelectorAll(".drop-preview").forEach((preview) => preview.remove());
    elements.shared.classList.remove("drop-active");
    Object.values(elements.boards).forEach((board) => board.classList.remove("drop-active"));
  }

  function pointInside(rect, x, y) { return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom; }

  function updateDrag(clientX, clientY) {
    drag.clientX = clientX;
    drag.clientY = clientY;
    drag.ghost.style.left = `${clientX - drag.grabX * drag.cellWidth - drag.cellWidth / 2}px`;
    drag.ghost.style.top = `${clientY - drag.grabY * drag.cellHeight - drag.cellHeight / 2}px`;
    clearDropUi();
    const sharedRect = elements.shared.getBoundingClientRect();
    if (drag.item.location !== "shared" && pointInside(sharedRect, clientX, clientY)) {
      drag.candidate = { type: "shared", valid: true };
      elements.shared.classList.add("drop-active");
      return;
    }
    for (const owner of ["player", "ally"]) {
      const board = elements.boards[owner];
      const rect = board.getBoundingClientRect();
      if (!pointInside(rect, clientX, clientY)) continue;
      board.classList.add("drop-active");
      const x = Math.floor((clientX - rect.left) / (rect.width / BOARD.cols)) - drag.grabX;
      const y = Math.floor((clientY - rect.top) / (rect.height / BOARD.rows)) - drag.grabY;
      const mustUseShared = drag.item.location !== "shared" && drag.item.location !== owner;
      const result = mustUseShared ? { valid: false, stack: null } : placement(drag.item, owner, x, y, drag.working.shape);
      drag.candidate = { type: "board", owner, x, y, ...result };
      drag.working.shape.forEach((row, rowY) => row.forEach((value, rowX) => {
        if (!value) return;
        const preview = document.createElement("i");
        preview.className = `drop-preview${result.valid ? "" : " invalid"}`;
        preview.style.left = `${(x + rowX) / BOARD.cols * 100}%`;
        preview.style.top = `${(y + rowY) / BOARD.rows * 100}%`;
        preview.style.width = `${100 / BOARD.cols}%`;
        preview.style.height = `${100 / BOARD.rows}%`;
        board.append(preview);
      }));
      return;
    }
    drag.candidate = null;
  }

  function finishDrag() {
    if (!drag) return;
    const current = drag;
    cleanupDrag();
    if (!current.candidate?.valid) return;
    if (current.candidate.type === "shared") {
      current.item.offeredBy = current.origin;
      current.item.location = "shared";
      invalidateConfirmations(`${names[current.item.offeredBy]} 將「${current.item.name}」放入共用窗`);
      render();
      return;
    }
    if (current.candidate.stack) {
      current.candidate.stack.quantity += current.item.quantity;
      items.splice(items.indexOf(current.item), 1);
    } else {
      current.item.location = current.candidate.owner;
      current.item.x = current.candidate.x;
      current.item.y = current.candidate.y;
      current.item.shape = cloneShape(current.working.shape);
      current.item.rotation = current.working.rotation;
      delete current.item.offeredBy;
    }
    if (current.origin === "shared") {
      invalidateConfirmations(`${names[current.candidate.owner]} 取走了「${current.item.name}」`);
    }
    render();
  }

  function cleanupDrag() {
    const current = drag;
    removeEventListener("pointermove", onPointerMove);
    removeEventListener("pointerup", finishDrag);
    removeEventListener("pointercancel", cancelDrag);
    clearDropUi();
    current.ghost.remove();
    current.sourceElement.classList.remove("dragging");
    drag = null;
  }

  function cancelDrag() { if (drag) cleanupDrag(); }

  function invalidateConfirmations(message) {
    const hadConfirmation = confirmations.player || confirmations.ally;
    confirmations = { player: false, ally: false };
    elements.status.textContent = hadConfirmation ? `${message}，雙方確認已取消` : message;
  }

  function toggleConfirmation(owner) {
    if (completed) return;
    if (items.some((item) => item.location === "shared")) {
      elements.status.textContent = "共用窗必須清空才能確認交易";
      return;
    }
    confirmations[owner] = !confirmations[owner];
    elements.status.textContent = confirmations[owner] ? `${names[owner]} 已確認，等待另一方` : `${names[owner]} 取消確認`;
    updateStateUi();
    if (confirmations.player && confirmations.ally) completeTrade();
  }

  function completeTrade() {
    completed = true;
    elements.status.textContent = "雙方確認完成，交易成立";
    elements.complete.hidden = false;
    updateStateUi();
  }

  function resetTrade() {
    cancelDrag();
    items = freshItems();
    confirmations = { player: false, ally: false };
    completed = false;
    elements.complete.hidden = true;
    elements.status.textContent = "將想交換的物資放入中央共用窗";
    render();
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
  elements.playerConfirm.addEventListener("click", () => toggleConfirmation("player"));
  elements.allyConfirm.addEventListener("click", () => toggleConfirmation("ally"));
  elements.reset.addEventListener("click", resetTrade);
  elements.completeReset.addEventListener("click", resetTrade);
  render();
})();
