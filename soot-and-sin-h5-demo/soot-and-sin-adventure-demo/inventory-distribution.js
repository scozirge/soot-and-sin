"use strict";

window.InventoryDistribution = (() => {
  const BOARD = { cols: 8, rows: 6 };
  const shapeMap = {
    canned_food: [[1]], bandage: [[1]], hardtack: [[1]], concentrated_ration: [[1]],
    medical_alcohol: [[1], [1]], adrenaline: [[1], [1]],
    rusted_knife: [[1], [1]], old_revolver: [[1, 1], [1, 1]], silver_sabre: [[1], [1], [1]],
    monster_meat: [[1]], meat: [[1]], claw: [[1, 1], [1, 1]], demon_claw: [[1, 1], [1, 1]],
    head: [[1, 1], [1, 1]], demon_head: [[1, 1], [1, 1]],
    iron_key: [[1, 1]], oil_lamp: [[1, 1], [1, 1], [1, 1], [1, 1]],
  };
  const artScaleMap = { iron_key: .72 };

  function cloneShape(shape) { return shape.map((row) => [...row]); }
  function widthOf(shape) { return shape[0].length; }
  function heightOf(shape) { return shape.length; }
  function stackId(item) { return item.id === "meat" ? "monster_meat" : item.id; }
  function rotateShape(shape) {
    return shape[0].map((_, column) => shape.map((row) => row[column]).reverse());
  }

  function itemShape(item) {
    if (item.shape) return cloneShape(item.shape);
    if (shapeMap[item.id]) return cloneShape(shapeMap[item.id]);
    if (item.category === "food" || item.category === "medical") return [[1]];
    if (item.category === "weapon" || item.category === "tool") return [[1, 1]];
    return [[1, 1], [1, 1]];
  }

  function itemImage(item, assetBase, rootPath) {
    if (item.image) return item.image;
    const formal = {
      canned_food: "item-can.webp", hardtack: "item-biscuit.webp", concentrated_ration: "item-biscuit.webp",
      bandage: "item-bandage.webp", medical_alcohol: "item-spirit.webp", adrenaline: "item-spirit.webp",
      iron_key: "item-key.webp", oil_lamp: "item-lamp.webp", precision_parts: "item-parts.webp",
    }[item.id];
    if (formal) return `${assetBase}/${formal}`;
    if (["rusted_knife", "silver_sabre"].includes(item.id)) return `${rootPath}/battle/assets/action-axe.webp`;
    if (item.id === "old_revolver") return `${rootPath}/battle/assets/action-pistol.webp`;
    if (item.id === "monster_meat") return `${rootPath}/battle/assets/loot-monster-meat.svg`;
    if (item.id === "demon_claw") return `${rootPath}/battle/assets/loot-demon-claw.svg`;
    if (item.id === "demon_head") return `${rootPath}/battle/assets/loot-demon-head.svg`;
    return `${assetBase}/item-reliquary.webp`;
  }

  function create(options) {
    const { root, assetBase, rootPath = "..", playerPortrait, allyPortrait, playerName = "scozirge", allyName = "Morrow" } = options;
    let publicItems = [];
    let bagItems = [];
    let frozen = false;
    let drag = null;
    let tooltipItem = null;
    let dragMoved = false;
    let startPoint = null;
    let finalizedInventory = [];

    root.classList.add("inventory-distribution");
    root.innerHTML = `
      <section class="claim-public">
        <header><span>公共物資</span><small>先拿先贏 · 可投入自己的物資</small></header>
        <div class="claim-public-tray" data-claim-tray></div>
      </section>
      <section class="claim-lower">
        <div class="claim-rival">
          <img src="${allyPortrait}" alt="${allyName}">
          <span>正在搜刮</span><strong>${allyName}</strong>
          <p data-rival-status>尋找想要的物資……</p>
        </div>
        <div class="claim-bag-panel">
          <header><img src="${playerPortrait}" alt="${playerName}"><div><small>你的背包</small><strong>${playerName}</strong></div><span data-capacity></span></header>
          <div class="claim-board-frame"><div class="claim-board" data-claim-board></div></div>
        </div>
      </section>
      <p class="claim-help"><b>拖曳</b>放入背包　<b>R</b> 旋轉　<span data-claim-status>物品被拿走後便無法爭奪</span></p>
      <div class="claim-tooltip" data-claim-tooltip></div>
    `;
    const tray = root.querySelector("[data-claim-tray]");
    const board = root.querySelector("[data-claim-board]");
    const capacity = root.querySelector("[data-capacity]");
    const status = root.querySelector("[data-claim-status]");
    const rivalStatus = root.querySelector("[data-rival-status]");
    const tooltip = root.querySelector("[data-claim-tooltip]");

    function occupied(shape) { return shape.flat().filter(Boolean).length; }
    function modelFrom(source, uiId, isPublic) {
      return {
        uiId,
        source,
        claimId: source.instanceId ?? source.claimId ?? source.id,
        shape: itemShape(source),
        rotation: source.rotation ?? 0,
        artScale: source.artScale ?? artScaleMap[source.id] ?? 1,
        image: itemImage(source, assetBase, rootPath),
        x: 0,
        y: 0,
        isPublic,
      };
    }

    function overlaps(model, x, y, shape = model.shape, ignore = model.uiId) {
      return bagItems.filter((other) => {
        if (other.uiId === ignore) return false;
        return shape.some((row, rowY) => row.some((cell, rowX) => cell &&
          other.shape.some((otherRow, otherY) => otherRow.some((otherCell, otherX) => otherCell &&
            x + rowX === other.x + otherX && y + rowY === other.y + otherY))));
      });
    }

    function placement(model, x, y, shape = model.shape) {
      for (let row = 0; row < heightOf(shape); row += 1) {
        for (let column = 0; column < widthOf(shape); column += 1) {
          if (!shape[row][column]) continue;
          const cellX = x + column;
          const cellY = y + row;
          if (cellX < 0 || cellY < 0 || cellX >= BOARD.cols || cellY >= BOARD.rows) return { valid: false, stack: null };
        }
      }
      const collisions = overlaps(model, x, y, shape);
      if (!collisions.length) return { valid: true, stack: null };
      const stack = collisions.length === 1 && stackId(collisions[0].source) === stackId(model.source) ? collisions[0] : null;
      return { valid: Boolean(stack), stack };
    }

    function canPlace(model, x, y, shape = model.shape) {
      const result = placement(model, x, y, shape);
      return result.valid && !result.stack;
    }

    function firstFit(model) {
      for (let y = 0; y <= BOARD.rows - heightOf(model.shape); y += 1) {
        for (let x = 0; x <= BOARD.cols - widthOf(model.shape); x += 1) {
          if (canPlace(model, x, y)) return { x, y };
        }
      }
      return null;
    }

    function makeItem(model, trayItem = false, ghost = false) {
      const element = document.createElement(trayItem ? "button" : "div");
      if (trayItem) element.type = "button";
      element.className = `claim-item${trayItem ? " tray-item" : ""}${ghost ? " claim-ghost" : ""}`;
      element.dataset.uiId = model.uiId;
      element.innerHTML = `<span class="claim-shape"></span><span class="claim-art"><img src="${model.image}" alt="" draggable="false"></span>${model.source.quantity > 1 ? `<b>×${model.source.quantity}</b>` : ""}${trayItem && model.source.offeredByPlayer ? "<em>你投入</em>" : ""}`;
      fillShape(element.querySelector(".claim-shape"), model.shape);
      layoutArt(element, model, trayItem);
      if (!ghost) {
        element.addEventListener("pointerdown", (event) => beginDrag(event, model, element));
        element.addEventListener("pointerenter", (event) => showTooltip(event, model));
        element.addEventListener("pointermove", moveTooltip);
        element.addEventListener("pointerleave", hideTooltip);
      }
      return element;
    }

    function fillShape(element, shape) {
      element.style.gridTemplateColumns = `repeat(${widthOf(shape)}, 1fr)`;
      element.style.gridTemplateRows = `repeat(${heightOf(shape)}, 1fr)`;
      element.replaceChildren(...shape.flat().map((cell) => {
        const part = document.createElement("i");
        if (!cell) part.className = "empty";
        return part;
      }));
    }

    function layoutArt(element, model, trayItem = false) {
      const art = element.querySelector(".claim-art");
      const longest = Math.max(widthOf(model.shape), heightOf(model.shape));
      art.style.width = trayItem ? `${82 * model.artScale}%` : `${longest / widthOf(model.shape) * 88 * model.artScale}%`;
      art.style.height = trayItem ? `${82 * model.artScale}%` : `${longest / heightOf(model.shape) * 88 * model.artScale}%`;
      art.querySelector("img").style.transform = `rotate(${model.rotation}deg)`;
    }

    function placeElement(element, model) {
      element.style.left = `${model.x / BOARD.cols * 100}%`;
      element.style.top = `${model.y / BOARD.rows * 100}%`;
      element.style.width = `${widthOf(model.shape) / BOARD.cols * 100}%`;
      element.style.height = `${heightOf(model.shape) / BOARD.rows * 100}%`;
    }

    function render() {
      tray.replaceChildren(...publicItems.map((model) => makeItem(model, true)));
      board.replaceChildren(...bagItems.map((model) => {
        const element = makeItem(model);
        placeElement(element, model);
        return element;
      }));
      const used = bagItems.reduce((sum, model) => sum + occupied(model.shape), 0);
      capacity.textContent = `${used} / ${BOARD.cols * BOARD.rows}`;
      tray.classList.toggle("empty", publicItems.length === 0);
    }

    function open({ loot, inventory }) {
      cancelDrag();
      frozen = false;
      finalizedInventory = [];
      publicItems = loot.map((source, index) => {
        const copy = { ...source, quantity: Number(source.quantity) || 1 };
        return modelFrom(copy, `public_${copy.instanceId ?? copy.claimId ?? copy.id}_${index}`, true);
      });
      bagItems = [];
      inventory.forEach((source, index) => {
        const copy = { ...source, sourceType: "inventory", claimId: `inventory_${source.id}_${index}` };
        const model = modelFrom(copy, `bag_${source.id}_${index}`, false);
        const fit = firstFit(model);
        if (fit) {
          model.x = fit.x;
          model.y = fit.y;
          bagItems.push(model);
        }
      });
      status.textContent = "物品被拿走後便無法爭奪";
      rivalStatus.textContent = "尋找想要的物資……";
      render();
    }

    function showTooltip(event, model) {
      if (drag) return;
      tooltipItem = model;
      tooltip.innerHTML = `<strong>${model.source.name}</strong><span>${model.source.stat ?? model.source.description ?? "可帶離現場的物資"}</span><small>數量 ×${model.source.quantity}　佔用 ${occupied(model.shape)} 格</small>`;
      tooltip.classList.add("visible");
      moveTooltip(event);
    }

    function moveTooltip(event) {
      if (!tooltipItem || drag) return;
      const rect = tooltip.getBoundingClientRect();
      tooltip.style.left = `${Math.min(event.clientX + 14, innerWidth - rect.width - 8)}px`;
      tooltip.style.top = `${Math.min(event.clientY + 14, innerHeight - rect.height - 8)}px`;
    }

    function hideTooltip() {
      tooltipItem = null;
      tooltip.classList.remove("visible");
    }

    function beginDrag(event, model, sourceElement) {
      if (frozen || event.button !== 0 || drag) return;
      event.preventDefault();
      hideTooltip();
      const working = { ...model, shape: cloneShape(model.shape) };
      const rect = sourceElement.getBoundingClientRect();
      const grabX = Math.min(widthOf(working.shape) - 1, Math.max(0, Math.floor((event.clientX - rect.left) / (rect.width / widthOf(working.shape)))));
      const grabY = Math.min(heightOf(working.shape) - 1, Math.max(0, Math.floor((event.clientY - rect.top) / (rect.height / heightOf(working.shape)))));
      const boardRect = board.getBoundingClientRect();
      const ghost = makeItem(working, false, true);
      document.body.append(ghost);
      sourceElement.classList.add("dragging");
      drag = { model, working, sourceElement, ghost, grabX, grabY, clientX: event.clientX, clientY: event.clientY, candidate: null, cellWidth: boardRect.width / BOARD.cols, cellHeight: boardRect.height / BOARD.rows };
      startPoint = { x: event.clientX, y: event.clientY };
      dragMoved = false;
      updateGhost();
      updateDrag(event.clientX, event.clientY);
      addEventListener("pointermove", onMove);
      addEventListener("pointerup", finishDrag, { once: true });
      addEventListener("pointercancel", cancelDrag, { once: true });
    }

    function updateGhost() {
      drag.ghost.style.width = `${drag.cellWidth * widthOf(drag.working.shape)}px`;
      drag.ghost.style.height = `${drag.cellHeight * heightOf(drag.working.shape)}px`;
      fillShape(drag.ghost.querySelector(".claim-shape"), drag.working.shape);
      layoutArt(drag.ghost, drag.working);
    }

    function onMove(event) {
      if (!drag) return;
      if (Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 5) dragMoved = true;
      updateDrag(event.clientX, event.clientY);
    }

    function clearPreview() {
      board.querySelectorAll(".claim-preview").forEach((element) => element.remove());
      tray.classList.remove("drop-active");
    }

    function updateDrag(clientX, clientY) {
      drag.clientX = clientX;
      drag.clientY = clientY;
      drag.ghost.style.left = `${clientX - drag.grabX * drag.cellWidth - drag.cellWidth / 2}px`;
      drag.ghost.style.top = `${clientY - drag.grabY * drag.cellHeight - drag.cellHeight / 2}px`;
      clearPreview();
      const trayRect = tray.getBoundingClientRect();
      if (!drag.model.isPublic && clientX >= trayRect.left && clientY >= trayRect.top && clientX < trayRect.right && clientY < trayRect.bottom) {
        drag.candidate = { type: "tray", valid: true };
        tray.classList.add("drop-active");
        return;
      }
      const rect = board.getBoundingClientRect();
      if (clientX < rect.left || clientY < rect.top || clientX >= rect.right || clientY >= rect.bottom) {
        drag.candidate = null;
        return;
      }
      const cellX = Math.floor((clientX - rect.left) / drag.cellWidth);
      const cellY = Math.floor((clientY - rect.top) / drag.cellHeight);
      const x = cellX - drag.grabX;
      const y = cellY - drag.grabY;
      const result = placement(drag.working, x, y, drag.working.shape);
      drag.candidate = { type: "board", x, y, ...result };
      drag.working.shape.forEach((row, rowY) => row.forEach((cell, rowX) => {
        if (!cell) return;
        const preview = document.createElement("i");
        preview.className = `claim-preview${result.valid ? "" : " invalid"}`;
        preview.style.left = `${(x + rowX) / BOARD.cols * 100}%`;
        preview.style.top = `${(y + rowY) / BOARD.rows * 100}%`;
        preview.style.width = `${100 / BOARD.cols}%`;
        preview.style.height = `${100 / BOARD.rows}%`;
        board.append(preview);
      }));
    }

    function finishDrag() {
      if (!drag) return;
      const current = drag;
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", finishDrag);
      removeEventListener("pointercancel", cancelDrag);
      clearPreview();
      current.ghost.remove();
      current.sourceElement.classList.remove("dragging");
      drag = null;
      if (!current.model.isPublic && current.candidate?.type === "tray") {
        offerPlayerItem(current.model);
        return;
      }
      if (current.model.isPublic && !dragMoved) {
        const fit = firstFit(current.working);
        if (fit) claimPlayer(current.model.claimId, fit, current.working);
        else status.textContent = "背包沒有足夠空間";
        return;
      }
      if (!current.candidate?.valid) return;
      if (current.model.isPublic) claimPlayer(current.model.claimId, current.candidate, current.working);
      else if (current.candidate.stack) {
        current.candidate.stack.source.quantity += Number(current.model.source.quantity) || 1;
        bagItems.splice(bagItems.indexOf(current.model), 1);
        status.textContent = `已將「${current.model.source.name}」合併堆疊`;
        render();
      } else {
        current.model.x = current.candidate.x;
        current.model.y = current.candidate.y;
        current.model.shape = cloneShape(current.working.shape);
        current.model.rotation = current.working.rotation;
        render();
      }
    }

    function offerPlayerItem(model) {
      const index = bagItems.findIndex((item) => item.uiId === model.uiId);
      if (index < 0 || frozen) return false;
      const [offered] = bagItems.splice(index, 1);
      offered.isPublic = true;
      offered.source.offeredByPlayer = true;
      publicItems.push(offered);
      status.textContent = `你將「${offered.source.name}」放入公共物資`;
      options.onPlayerOffer?.(offered.source);
      render();
      return true;
    }

    function cancelDrag() {
      if (!drag) return;
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", finishDrag);
      clearPreview();
      drag.ghost.remove();
      drag.sourceElement.classList.remove("dragging");
      drag = null;
    }

    function claimPlayer(claimId, placement, working) {
      const index = publicItems.findIndex((model) => model.claimId === claimId);
      if (index < 0 || frozen) return false;
      const model = publicItems[index];
      const stack = placement?.stack;
      if (stack) {
        stack.source.quantity = (Number(stack.source.quantity) || 1) + (Number(model.source.quantity) || 1);
        publicItems.splice(index, 1);
        status.textContent = `你先拿到了「${model.source.name}」`;
        options.onPlayerClaim?.(model.source);
        render();
        return true;
      }
      const bagModel = { ...model, uiId: `claimed_${model.uiId}`, isPublic: false, x: placement.x, y: placement.y, shape: cloneShape(working.shape), rotation: working.rotation };
      if (!canPlace(bagModel, bagModel.x, bagModel.y, bagModel.shape)) return false;
      publicItems.splice(index, 1);
      bagItems.push(bagModel);
      status.textContent = `你先拿到了「${model.source.name}」`;
      options.onPlayerClaim?.(model.source);
      render();
      return true;
    }

    function claimByAlly(identifier) {
      if (frozen) return false;
      const index = identifier == null
        ? (publicItems.length ? 0 : -1)
        : publicItems.findIndex((model) => model.claimId === identifier || model.source.id === identifier);
      if (index < 0) return false;
      const [model] = publicItems.splice(index, 1);
      if (drag?.model.uiId === model.uiId) cancelDrag();
      status.textContent = `${allyName} 先拿走了「${model.source.name}」`;
      rivalStatus.textContent = `已取得：${model.source.name}`;
      options.onAllyClaim?.(model.source);
      render();
      return true;
    }

    function finish() {
      frozen = true;
      cancelDrag();
      const returned = publicItems.filter((model) => model.source.sourceType === "inventory");
      const unclaimed = publicItems.filter((model) => model.source.sourceType !== "inventory").map((model) => model.source);
      finalizedInventory = [...bagItems.map((model) => model.source), ...returned.map((model) => model.source)]
        .map(cleanInventoryItem);
      returned.forEach((model) => options.onPlayerClaim?.(model.source));
      publicItems = [];
      status.textContent = unclaimed.length ? `${unclaimed.length} 組物資遭到放棄` : "公共物資已分配完畢";
      render();
      return unclaimed;
    }

    function cleanInventoryItem(source) {
      const { sourceType, claimId, instanceId, winner, depth, offeredByPlayer, ...item } = source;
      return { ...item, quantity: Number(item.quantity) || 1 };
    }

    function getInventory() {
      const sources = frozen
        ? finalizedInventory
        : [...bagItems.map((model) => model.source), ...publicItems.filter((model) => model.source.sourceType === "inventory").map((model) => model.source)];
      return sources.map((source) => ({ ...cleanInventoryItem(source) }));
    }

    addEventListener("keydown", (event) => {
      if (!drag || event.repeat || event.key.toLowerCase() !== "r") return;
      event.preventDefault();
      const oldHeight = heightOf(drag.working.shape);
      drag.working.shape = rotateShape(drag.working.shape);
      drag.working.rotation = (drag.working.rotation + 90) % 360;
      const oldGrabX = drag.grabX;
      drag.grabX = oldHeight - 1 - drag.grabY;
      drag.grabY = oldGrabX;
      updateGhost();
      updateDrag(drag.clientX, drag.clientY);
    });

    return { open, claimByAlly, finish, getInventory };
  }

  return { create };
})();
