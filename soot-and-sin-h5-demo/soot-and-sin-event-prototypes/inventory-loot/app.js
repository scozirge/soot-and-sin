(() => {
  "use strict";

  const backpack = { cols: 8, rows: 6, element: document.querySelector("#backpackBoard") };
  const boardDefs = { backpack };
  const lootTray = document.querySelector("#lootTray");
  const statusText = document.querySelector("#statusText");
  const itemTooltip = document.querySelector("#itemTooltip");
  const dragLayer = document.querySelector("#dragLayer");

  const categoryLabels = {
    food: "食物",
    medical: "醫療用品",
    material: "材料",
    artifact: "特殊物品",
    tool: "工具"
  };

  const itemImages = {
    can: "assets/item-can.webp",
    bandage: "assets/item-bandage.webp",
    bottle: "assets/item-spirit.webp",
    parts: "assets/item-parts.webp",
    reliquary: "assets/item-reliquary.webp",
    key: "assets/item-key.webp",
    lamp: "assets/item-lamp.webp",
    biscuit: "assets/item-biscuit.webp"
  };

  const items = [
    { id: "canned_food_loot", kind: "canned_food", name: "密封罐頭", effect: "只能在藏匿處食用，恢復 18 點生命。", category: "food", rarity: "common", icon: "can", board: "loot", x: 0, y: 0, shape: [[1]], rotation: 0, quantity: 2 },
    { id: "clean_bandage", kind: "clean_bandage", name: "乾淨繃帶", effect: "可在戰鬥中使用，恢復 12 點生命。", category: "medical", rarity: "common", icon: "bandage", board: "loot", x: 0, y: 0, shape: [[1]], rotation: 0, quantity: 3 },
    { id: "medical_spirit", kind: "medical_spirit", name: "醫療酒精", effect: "可在戰鬥中使用，解除流血並恢復 6 點生命。", category: "medical", rarity: "uncommon", icon: "bottle", board: "loot", x: 0, y: 0, shape: [[1], [1]], rotation: 0, quantity: 1 },
    { id: "precision_parts", kind: "precision_parts", name: "精密零件", effect: "稀有機械材料，可帶回家族工坊使用或出售。", category: "material", rarity: "uncommon", icon: "parts", board: "loot", x: 0, y: 0, shape: [[1, 1]], rotation: 0, quantity: 1 },
    { id: "black_reliquary", kind: "black_reliquary", name: "黑霧聖匣", effect: "來歷不明的貴重物，能以高價出售。", category: "artifact", rarity: "rare", icon: "reliquary", board: "loot", x: 0, y: 0, shape: [[1, 1], [1, 1]], rotation: 0, quantity: 1 },
    { id: "iron_key", kind: "iron_key", name: "鐵製鑰匙", effect: "探索時可開啟一扇上鎖的門或容器。", category: "tool", rarity: "uncommon", icon: "key", board: "loot", x: 0, y: 0, shape: [[1, 1]], artScale: .72, rotation: 0, quantity: 1 },
    { id: "clean_bandage_found_2", kind: "clean_bandage", name: "乾淨繃帶", effect: "可在戰鬥中使用，恢復 12 點生命。", category: "medical", rarity: "common", icon: "bandage", board: "loot", x: 0, y: 0, shape: [[1]], rotation: 0, quantity: 2 },
    { id: "oil_lamp", kind: "oil_lamp", name: "舊式油燈", effect: "搜索昏暗場所時，提高發現物資的機率。", category: "tool", rarity: "uncommon", icon: "lamp", board: "backpack", x: 0, y: 0, shape: [[1, 1], [1, 1], [1, 1], [1, 1]], rotation: 0, quantity: 1 },
    { id: "hard_biscuit", kind: "hard_biscuit", name: "軍用硬餅", effect: "只能在藏匿處食用，恢復 10 點生命。", category: "food", rarity: "common", icon: "biscuit", board: "backpack", x: 3, y: 0, shape: [[1]], rotation: 0, quantity: 2 },
    { id: "canned_food_pack", kind: "canned_food", name: "密封罐頭", effect: "只能在藏匿處食用，恢復 18 點生命。", category: "food", rarity: "common", icon: "can", board: "backpack", x: 6, y: 0, shape: [[1]], rotation: 0, quantity: 1 }
  ];

  let drag = null;
  let statusTimer = 0;
  let splitCounter = 0;

  function shapeWidth(shape) { return shape[0].length; }
  function shapeHeight(shape) { return shape.length; }
  function occupiedCells(shape) { return shape.flat().filter(Boolean).length; }

  function rotateShape(shape) {
    return shape[0].map((_, column) => shape.map(row => row[column]).reverse());
  }

  function stackInitialLoot() {
    const stacks = new Map();
    [...items].forEach(item => {
      if (item.board !== "loot") return;
      const existing = stacks.get(item.kind);
      if (!existing) {
        stacks.set(item.kind, item);
        return;
      }
      existing.quantity += item.quantity;
      items.splice(items.indexOf(item), 1);
    });
  }

  function makeItemElement(item, { ghost = false, tray = false } = {}) {
    const element = document.createElement("div");
    element.className = `item${ghost ? " drag-ghost" : ""}${tray ? " tray-item" : ""}`;
    element.dataset.item = item.id;
    element.dataset.kind = item.kind;
    element.dataset.category = item.category;
    element.dataset.rarity = item.rarity;
    element.setAttribute("aria-label", `${item.name}，數量 ${item.quantity}，佔用 ${occupiedCells(item.shape)} 格`);

    const shape = document.createElement("div");
    shape.className = "item-shape";
    fillShapeElement(shape, item.shape);
    element.append(shape);

    const art = document.createElement("span");
    art.className = "item-art";
    const image = document.createElement("img");
    image.src = itemImages[item.icon];
    image.alt = "";
    image.draggable = false;
    art.append(image);
    element.append(art);
    updateArtLayout(element, item, tray);

    if (item.quantity > 1) {
      const quantity = document.createElement("span");
      quantity.className = "item-quantity";
      quantity.textContent = `×${item.quantity}`;
      element.append(quantity);
    }
    return element;
  }

  function updateArtLayout(element, item, tray = false) {
    const art = element.querySelector(".item-art");
    const image = art.querySelector("img");
    const longestSide = Math.max(shapeWidth(item.shape), shapeHeight(item.shape));
    const scale = item.artScale ?? 1;
    art.style.width = tray ? `${86 * scale}%` : `${longestSide / shapeWidth(item.shape) * 88 * scale}%`;
    art.style.height = tray ? `${86 * scale}%` : `${longestSide / shapeHeight(item.shape) * 88 * scale}%`;
    image.style.transform = `rotate(${item.rotation ?? 0}deg)`;
  }

  function fillShapeElement(element, shape) {
    element.style.gridTemplateColumns = `repeat(${shapeWidth(shape)}, 1fr)`;
    element.style.gridTemplateRows = `repeat(${shapeHeight(shape)}, 1fr)`;
    element.replaceChildren(...shape.flat().map(value => {
      const cell = document.createElement("span");
      cell.className = value ? "item-cell" : "item-cell is-empty";
      return cell;
    }));
  }

  function positionBackpackItem(element, item) {
    element.style.left = `${item.x / backpack.cols * 100}%`;
    element.style.top = `${item.y / backpack.rows * 100}%`;
    element.style.width = `${shapeWidth(item.shape) / backpack.cols * 100}%`;
    element.style.height = `${shapeHeight(item.shape) / backpack.rows * 100}%`;
  }

  function render() {
    backpack.element.replaceChildren();
    lootTray.replaceChildren();
    items.forEach(item => {
      const isLoot = item.board === "loot";
      const element = makeItemElement(item, { tray: isLoot });
      if (isLoot) lootTray.append(element);
      else {
        positionBackpackItem(element, item);
        backpack.element.append(element);
      }
      element.addEventListener("pointerdown", event => beginDrag(event, item, element));
      element.addEventListener("pointerenter", event => showTooltip(event, item));
      element.addEventListener("pointermove", moveTooltip);
      element.addEventListener("pointerleave", hideTooltip);
    });
    updateCounters();
  }

  function updateCounters() {
    const lootStacks = items.filter(item => item.board === "loot").length;
    const used = items.filter(item => item.board === "backpack").reduce((sum, item) => sum + occupiedCells(item.shape), 0);
    const total = backpack.cols * backpack.rows;
    document.querySelector("#lootCount").textContent = `${lootStacks} 組`;
    document.querySelector("#capacityText").textContent = `${used} / ${total}`;
    document.querySelector("#capacityFill").style.width = `${used / total * 100}%`;
  }

  function showTooltip(event, item) {
    if (drag) return;
    const title = document.createElement("strong");
    title.textContent = item.name;
    const category = document.createElement("span");
    category.className = "tooltip-category";
    category.textContent = categoryLabels[item.category] ?? "道具";
    const effect = document.createElement("p");
    effect.textContent = item.effect;
    const meta = document.createElement("small");
    meta.textContent = `數量 ×${item.quantity}　佔用 ${occupiedCells(item.shape)} 格`;
    const splitHint = document.createElement("em");
    splitHint.textContent = item.quantity > 1 ? "SHIFT＋拖曳：拆分一半" : "";
    itemTooltip.replaceChildren(title, category, effect, meta, splitHint);
    itemTooltip.classList.add("visible");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (drag || !itemTooltip.classList.contains("visible")) return;
    const gap = 16;
    const bounds = itemTooltip.getBoundingClientRect();
    itemTooltip.style.left = `${Math.min(event.clientX + gap, window.innerWidth - bounds.width - 8)}px`;
    itemTooltip.style.top = `${Math.min(event.clientY + gap, window.innerHeight - bounds.height - 8)}px`;
  }

  function hideTooltip() {
    itemTooltip.classList.remove("visible");
  }

  function boardCellAt(clientX, clientY) {
    const rect = backpack.element.getBoundingClientRect();
    return {
      x: Math.floor((clientX - rect.left) / (rect.width / backpack.cols)),
      y: Math.floor((clientY - rect.top) / (rect.height / backpack.rows))
    };
  }

  function canPlace(item, x, y, shape = item.shape) {
    for (let row = 0; row < shapeHeight(shape); row += 1) {
      for (let column = 0; column < shapeWidth(shape); column += 1) {
        if (!shape[row][column]) continue;
        const cellX = x + column;
        const cellY = y + row;
        if (cellX < 0 || cellY < 0 || cellX >= backpack.cols || cellY >= backpack.rows) return false;
        const collision = items.some(other => {
          if (other.id === item.id || other.board !== "backpack") return false;
          return other.shape.some((otherRow, otherY) => otherRow.some((occupied, otherX) => (
            occupied && other.x + otherX === cellX && other.y + otherY === cellY
          )));
        });
        if (collision) return false;
      }
    }
    return true;
  }

  function findOverlaps(item, x, y, shape = item.shape) {
    return items.filter(other => {
      if (other.id === item.id || other.board !== "backpack") return false;
      return shape.some((row, rowY) => row.some((occupied, rowX) => occupied &&
        other.shape.some((otherRow, otherY) => otherRow.some((otherOccupied, otherX) => otherOccupied &&
          x + rowX === other.x + otherX && y + rowY === other.y + otherY))));
    });
  }

  function beginDrag(event, item, element) {
    if (event.button !== 0 || drag) return;
    event.preventDefault();
    const splitSource = event.shiftKey && item.quantity > 1 ? item : null;
    const draggedItem = splitSource ? {
      ...item,
      id: `${item.kind}_split_${++splitCounter}`,
      shape: item.shape.map(row => [...row]),
      quantity: Math.floor(item.quantity / 2)
    } : item;
    const rect = element.getBoundingClientRect();
    const grabX = Math.min(shapeWidth(draggedItem.shape) - 1, Math.max(0, Math.floor((event.clientX - rect.left) / (rect.width / shapeWidth(draggedItem.shape)))));
    const grabY = Math.min(shapeHeight(draggedItem.shape) - 1, Math.max(0, Math.floor((event.clientY - rect.top) / (rect.height / shapeHeight(draggedItem.shape)))));
    if (!draggedItem.shape[grabY][grabX]) return;

    hideTooltip();
    const boardRect = backpack.element.getBoundingClientRect();
    const ghost = makeItemElement(draggedItem, { ghost: true });
    dragLayer.append(ghost);
    element.classList.add(splitSource ? "is-splitting" : "is-dragging");
    drag = {
      item: draggedItem,
      splitSource,
      sourceElement: element,
      ghost,
      grabX,
      grabY,
      pointerX: event.clientX,
      pointerY: event.clientY,
      candidate: null,
      original: { board: item.board, x: item.x, y: item.y, shape: item.shape.map(row => [...row]), rotation: item.rotation ?? 0 },
      cellWidth: boardRect.width / backpack.cols,
      cellHeight: boardRect.height / backpack.rows
    };
    updateGhostSize();
    updateDrag(event.clientX, event.clientY);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishDrag, { once: true });
    window.addEventListener("pointercancel", finishDrag, { once: true });
  }

  function updateGhostSize() {
    drag.ghost.style.width = `${drag.cellWidth * shapeWidth(drag.item.shape)}px`;
    drag.ghost.style.height = `${drag.cellHeight * shapeHeight(drag.item.shape)}px`;
    fillShapeElement(drag.ghost.querySelector(".item-shape"), drag.item.shape);
    updateArtLayout(drag.ghost, drag.item);
  }

  function onPointerMove(event) {
    if (!drag) return;
    event.preventDefault();
    updateDrag(event.clientX, event.clientY);
  }

  function updateDrag(clientX, clientY) {
    drag.pointerX = clientX;
    drag.pointerY = clientY;
    drag.ghost.style.left = `${clientX - drag.grabX * drag.cellWidth - drag.cellWidth / 2}px`;
    drag.ghost.style.top = `${clientY - drag.grabY * drag.cellHeight - drag.cellHeight / 2}px`;
    clearDropFeedback();

    const pointElement = document.elementFromPoint(clientX, clientY);
    const targetElement = pointElement?.closest(".item");
    const targetItem = targetElement ? items.find(item => item.id === targetElement.dataset.item) : null;
    if (targetItem && targetItem.id !== drag.item.id && targetItem.kind === drag.item.kind) {
      drag.candidate = { type: "merge", targetId: targetItem.id, valid: true };
      targetElement.classList.add("merge-target");
      return;
    }

    if (pointElement?.closest("#lootTray")) {
      drag.candidate = { type: "loot", valid: true };
      lootTray.classList.add("drop-active");
      return;
    }

    if (pointElement?.closest("#backpackBoard")) {
      const cell = boardCellAt(clientX, clientY);
      const x = cell.x - drag.grabX;
      const y = cell.y - drag.grabY;
      const overlaps = findOverlaps(drag.item, x, y);
      if (overlaps.length === 1 && overlaps[0].kind === drag.item.kind) {
        drag.candidate = { type: "merge", targetId: overlaps[0].id, valid: true };
        document.querySelector(`[data-item="${overlaps[0].id}"]`)?.classList.add("merge-target");
        return;
      }
      const valid = canPlace(drag.item, x, y);
      drag.candidate = { type: "backpack", x, y, valid };
      drawPlacementPreview(x, y, drag.item.shape, valid);
      return;
    }

    drag.candidate = null;
  }

  function drawPlacementPreview(x, y, shape, valid) {
    shape.forEach((row, rowIndex) => row.forEach((occupied, columnIndex) => {
      if (!occupied) return;
      const preview = document.createElement("span");
      preview.className = `placement-cell${valid ? "" : " invalid"}`;
      preview.style.left = `${(x + columnIndex) / backpack.cols * 100}%`;
      preview.style.top = `${(y + rowIndex) / backpack.rows * 100}%`;
      preview.style.width = `${100 / backpack.cols}%`;
      preview.style.height = `${100 / backpack.rows}%`;
      backpack.element.append(preview);
    }));
  }

  function clearDropFeedback() {
    document.querySelectorAll(".placement-cell").forEach(element => element.remove());
    document.querySelectorAll(".merge-target").forEach(element => element.classList.remove("merge-target"));
    lootTray.classList.remove("drop-active");
  }

  function finishDrag() {
    if (!drag) return;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", finishDrag);
    window.removeEventListener("pointercancel", finishDrag);
    clearDropFeedback();

    const { item, candidate, original, splitSource } = drag;
    const commitSplit = () => {
      if (splitSource) splitSource.quantity -= item.quantity;
    };
    if (candidate?.type === "merge") {
      const target = items.find(entry => entry.id === candidate.targetId);
      commitSplit();
      target.quantity += item.quantity;
      if (!splitSource) items.splice(items.indexOf(item), 1);
      setStatus(`${item.name}已合併，數量 ×${target.quantity}`, "success");
    } else if (candidate?.type === "backpack" && candidate.valid) {
      commitSplit();
      item.board = "backpack";
      item.x = candidate.x;
      item.y = candidate.y;
      if (splitSource) items.push(item);
      setStatus(`${item.name}${splitSource ? `已拆分 ×${item.quantity} 並` : "已"}放入背包`, "success");
    } else if (candidate?.type === "loot") {
      commitSplit();
      item.board = "loot";
      item.x = 0;
      item.y = 0;
      if (!splitSource) items.splice(items.indexOf(item), 1);
      items.push(item);
      setStatus(`${item.name}${splitSource ? `已拆分 ×${item.quantity} 並` : "已"}放到搜索所得末端`, "success");
    } else {
      if (!splitSource) {
        item.board = original.board;
        item.x = original.x;
        item.y = original.y;
        item.shape = original.shape;
        item.rotation = original.rotation;
      }
      setStatus(candidate ? "這裡沒有足夠空間" : "已取消移動", candidate ? "error" : "");
    }

    drag.ghost.remove();
    drag.sourceElement.classList.remove("is-dragging", "is-splitting");
    drag = null;
    render();
  }

  function rotateDraggedItem() {
    if (!drag) return;
    const oldHeight = shapeHeight(drag.item.shape);
    drag.item.shape = rotateShape(drag.item.shape);
    drag.item.rotation = ((drag.item.rotation ?? 0) + 90) % 360;
    const oldGrabX = drag.grabX;
    drag.grabX = oldHeight - 1 - drag.grabY;
    drag.grabY = oldGrabX;
    updateGhostSize();
    updateDrag(drag.pointerX, drag.pointerY);
    setStatus("已旋轉物資", "success");
  }

  function setStatus(message, type = "") {
    clearTimeout(statusTimer);
    statusText.textContent = message;
    statusText.className = type;
    statusTimer = window.setTimeout(() => {
      statusText.textContent = "選擇要帶走的物資";
      statusText.className = "";
    }, 1800);
  }

  window.addEventListener("keydown", event => {
    if (event.key.toLowerCase() !== "r" || !drag || event.repeat) return;
    event.preventDefault();
    rotateDraggedItem();
  });

  stackInitialLoot();
  render();
  window.inventoryPrototype = { items, boardDefs, rotateShape, canPlace };
})();
