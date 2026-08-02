"use strict";

const PLAYER_MAX_HEALTH = 72;
const ALLY_MAX_HEALTH = 64;
const MONSTER_MAX_HEALTH = 90;

const actions = [
  {
    id: "axe",
    type: "attack",
    name: "短柄斧",
    image: "assets/action-axe.webp",
    damage: 28,
    accuracy: 80,
    duration: 6,
    uses: 3,
  },
  {
    id: "pistol",
    type: "attack",
    name: "燧發手槍",
    image: "assets/action-pistol.webp",
    damage: 20,
    accuracy: 95,
    duration: 3,
    uses: 1,
  },
  {
    id: "claw_weapon",
    type: "attack",
    name: "利爪",
    image: "assets/loot-demon-claw.svg",
    damage: 42,
    accuracy: 75,
    duration: 5,
    uses: 1,
    lootId: "claw",
  },
  {
    id: "melee",
    type: "attack",
    name: "肉搏",
    image: "assets/action-melee.svg",
    damage: 8,
    accuracy: 90,
    duration: 4,
  },
  {
    id: "field_bandage",
    type: "heal",
    name: "乾淨繃帶",
    image: "assets/action-bandage.svg",
    heal: 16,
    duration: 3,
    uses: 2,
  },
  {
    id: "dodge",
    type: "dodge",
    name: "閃避",
    image: "assets/action-dodge.webp",
    duration: 4,
  },
  {
    id: "defend",
    type: "defend",
    name: "防禦",
    image: "assets/action-defend.webp",
    duration: 2,
    defense: 20,
  },
];

const allyActions = {
  attack: {
    id: "ally_axe",
    type: "attack",
    name: "短柄斧",
    image: "assets/action-axe.webp",
    damage: 10,
    accuracy: 78,
    duration: 7,
  },
  defend: {
    id: "ally_defend",
    type: "defend",
    name: "防禦",
    image: "assets/action-defend.webp",
    defense: 18,
    duration: 2,
  },
};

const lootItems = [
  {
    id: "meat",
    name: "怪物肉",
    image: "assets/loot-monster-meat.svg",
    stat: "休息時回復 24 生命",
    description: "食物只能在休息階段使用，不會出現在戰鬥行動列。",
  },
  {
    id: "claw",
    name: "利爪",
    image: "assets/loot-demon-claw.svg",
    stat: "傷害 42 · 使用 1 次",
    description: "命中不穩，但能造成極高傷害。",
    actionId: "claw_weapon",
  },
  {
    id: "head",
    name: "怪物首級",
    image: "assets/loot-demon-head.svg",
    stat: "可出售",
    description: "不會出現在行動列。",
  },
];

const carriedLoot = { meat: 0, claw: 0, head: 0 };

const monsterActions = [
  { id: "claw", type: "attack", name: "迅捷撕抓", icon: "≋", damage: 12, duration: 14 },
  { id: "bite", type: "attack", name: "撲身咬殺", icon: "!", damage: 20, duration: 20 },
  { id: "crush", type: "attack", name: "沉重碾擊", icon: "◆", damage: 32, duration: 30 },
];

const regions = [
  { id: "head", name: "頭顱", accuracy: 50, multiplier: 260 },
  { id: "left_limb", name: "左側前肢", accuracy: 75, multiplier: 160 },
  { id: "right_limb", name: "右側前肢", accuracy: 85, multiplier: 140 },
];

const headHitPath = "M348 284C356 279 364 284 370 290C377 285 384 285 391 291C399 284 407 283 415 290C423 286 431 290 438 297C448 307 452 320 451 334C450 350 445 365 438 379C431 394 423 406 416 419C407 434 401 447 393 457C383 447 377 433 369 422C360 411 353 398 346 385C338 370 333 354 332 337C331 319 337 301 348 284Z";
const leftLimbHitPath = "M270 302C244 320 232 354 226 390C220 430 207 469 194 510C178 552 166 597 154 644C145 682 140 714 138 735C126 755 105 769 87 780L52 800C42 807 47 819 59 818L102 801L75 824C68 833 80 840 91 834L123 811L111 839C107 852 124 854 132 842L148 816L156 844C160 856 176 852 178 839L170 806C178 795 185 784 190 770C197 741 200 711 207 679C218 630 230 582 242 536C253 490 269 448 280 405C289 370 303 342 302 322C294 310 283 303 270 302Z";
const rightLimbHitPath = "M468 294C495 292 522 312 542 337C568 368 593 398 616 430C634 455 645 475 643 495C640 520 636 548 632 580L615 688C611 713 606 731 600 746C612 760 631 779 646 794C657 804 650 817 638 812L605 787L627 823C634 836 617 843 608 831L585 797L594 838C598 852 579 856 572 842L560 802L545 840C540 854 523 848 526 834L540 790C529 778 516 769 505 757C498 748 503 736 514 735C527 732 546 737 558 744C565 724 571 702 576 679L594 570C598 542 602 515 604 492C583 474 560 455 538 437C510 414 486 391 469 366C450 338 443 313 468 294Z";

const hitZonePaths = {
  head: headHitPath,
  left_limb: leftLimbHitPath,
  right_limb: rightLimbHitPath,
};

const calloutLayouts = {
  head: { path: "M392 330L540 175H805", anchor: [392, 330], x: 620, y: 108 },
  left_limb: { path: "M177 590L95 500H5", anchor: [177, 590], x: 12, y: 430 },
  right_limb: { path: "M604 570L700 490H815", anchor: [604, 570], x: 682, y: 420 },
};

const partKeys = { head: "Q", left_limb: "W", right_limb: "E" };

const elements = {
  round: document.querySelector("#roundNumber"),
  timer: document.querySelector("#timer"),
  timerText: document.querySelector("#timerText"),
  timerBar: document.querySelector("#timerBar"),
  timelineCursor: document.querySelector("#timelineCursor"),
  timelineEndLabel: document.querySelector("#timelineEndLabel"),
  playerCast: document.querySelector("#playerCast"),
  playerCastName: document.querySelector("#playerCastName"),
  playerCastTime: document.querySelector("#playerCastTime"),
  playerCastBar: document.querySelector("#playerCastBar"),
  preview: document.querySelector("#decisionPreview"),
  actionGrid: document.querySelector("#actionGrid"),
  partGrid: document.querySelector("#partGrid"),
  partOverlays: document.querySelector("#partOverlays"),
  partCallouts: document.querySelector("#partCallouts"),
  intentCard: document.querySelector("#intentCard"),
  intentIcon: document.querySelector("#intentIcon"),
  intentName: document.querySelector("#intentName"),
  intentDescription: document.querySelector("#intentDescription"),
  intentTarget: document.querySelector("#intentTarget"),
  playerCard: document.querySelector("#playerCard"),
  playerHealthText: document.querySelector("#playerHealthText"),
  playerHealthBar: document.querySelector("#playerHealthBar"),
  playerEffect: document.querySelector("#playerEffect"),
  allyCard: document.querySelector("#allyCard"),
  allyHealthText: document.querySelector("#allyHealthText"),
  allyHealthBar: document.querySelector("#allyHealthBar"),
  allyAction: document.querySelector("#allyAction"),
  allyActionIcon: document.querySelector("#allyActionIcon"),
  allyActionName: document.querySelector("#allyActionName"),
  allyActionTime: document.querySelector("#allyActionTime"),
  allyActionBar: document.querySelector("#allyActionBar"),
  allyEffect: document.querySelector("#allyEffect"),
  monsterHealthText: document.querySelector("#monsterHealthText"),
  monsterHealthBar: document.querySelector("#monsterHealthBar"),
  monsterFigure: document.querySelector("#monsterFigure"),
  damageNumber: document.querySelector("#damageNumber"),
  log: document.querySelector("#combatLog"),
  modal: document.querySelector("#modal"),
  modalEyebrow: document.querySelector("#modalEyebrow"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  start: document.querySelector("#startButton"),
  lootModal: document.querySelector("#lootModal"),
  lootTimer: document.querySelector("#lootTimer"),
  lootTimerText: document.querySelector("#lootTimerText"),
  lootTimerBar: document.querySelector("#lootTimerBar"),
  lootGrid: document.querySelector("#lootGrid"),
  lootSummary: document.querySelector("#lootSummary"),
  lootContinue: document.querySelector("#lootContinue"),
};

let state;
let timerId;
let lootTimerId;
let ignoreTrayClick = false;

function createParts() {
  return regions.map((region) => ({
    ...region,
    revealed: false,
  }));
}

function resetState() {
  state = {
    active: false,
    monsterTurn: 0,
    actionCount: 0,
    allyActionCount: 0,
    playerHealth: PLAYER_MAX_HEALTH,
    allyHealth: ALLY_MAX_HEALTH,
    monsterHealth: MONSTER_MAX_HEALTH,
    selectedAction: actions[0].id,
    selectedPart: null,
    playerTask: null,
    allyTask: null,
    preparedDefense: null,
    allyPreparedDefense: null,
    waitingForMonster: false,
    allyWaitingForMonster: false,
    allyActionsThisTurn: 0,
    currentMonsterAction: null,
    monsterTarget: null,
    previousMonsterAction: null,
    monsterStartedAt: 0,
    monsterEndsAt: 0,
    parts: createParts(),
    actionUses: Object.fromEntries(
      actions
        .filter((action) => action.uses !== undefined)
        .map((action) => [action.id, action.lootId ? carriedLoot[action.lootId] : action.uses]),
    ),
    lootActive: false,
    lootResolved: false,
    lootDeadline: 0,
    playerLootSelections: new Set(),
    allyLootSelections: new Set(),
    lootResults: null,
    logs: [],
  };
}

function startGame() {
  clearInterval(timerId);
  clearInterval(lootTimerId);
  resetState();
  elements.modal.classList.remove("open");
  elements.lootModal.classList.remove("open");
  elements.log.replaceChildren();
  addLog("<strong>遭遇開始。</strong>你與 Morrow 對上惡魔。");
  state.active = true;
  beginMonsterAction(performance.now());
  timerId = setInterval(tick, 50);
}

function beginMonsterAction(now) {
  if (!state.active) return;
  state.monsterTurn += 1;
  state.currentMonsterAction = chooseMonsterAction();
  state.monsterTarget = chooseMonsterTarget();
  state.previousMonsterAction = state.currentMonsterAction.id;
  state.allyActionsThisTurn = 0;
  state.monsterStartedAt = now;
  state.monsterEndsAt = now + state.currentMonsterAction.duration * 1000;

  const attack = state.currentMonsterAction;
  elements.intentCard.className = "intent-card danger";
  elements.intentIcon.textContent = attack.icon;
  elements.intentName.textContent = attack.name;
  elements.intentDescription.textContent = `傷害 ${attack.damage} · ${formatSeconds(attack.duration)} 秒後發動`;
  elements.intentTarget.textContent = `目標：${state.monsterTarget === "player" ? "scozirge" : "Morrow"}`;
  renderMonsterTarget();
  if (!state.allyTask && !state.allyWaitingForMonster && state.allyHealth > 0) startAllyAction(now);
  updateView(now);
}

function chooseMonsterAction() {
  const choices = monsterActions.filter((action) => action.id !== state.previousMonsterAction);
  return choices[Math.floor(Math.random() * choices.length)];
}

function chooseMonsterTarget() {
  const targets = [];
  if (state.playerHealth > 0) targets.push("player");
  if (state.allyHealth > 0) targets.push("ally");
  return targets[Math.floor(Math.random() * targets.length)];
}

function renderMonsterTarget() {
  elements.playerCard.classList.toggle("targeted", state.active && state.monsterTarget === "player");
  elements.allyCard.classList.toggle("targeted", state.active && state.monsterTarget === "ally");
}

function selectAction(id) {
  const action = actions.find((item) => item.id === id);
  if (!action || !canUseAction(action)) return;

  state.selectedAction = id;
  state.selectedPart = null;

  if (action.type !== "attack") {
    startPlayerAction();
    return;
  }
  updateDecision();
}

function selectPart(id) {
  const action = actions.find((item) => item.id === state.selectedAction);
  if (!canUseAction(action) || action?.type !== "attack") return;
  if (!state.parts.some((part) => part.id === id)) return;
  state.selectedPart = id;
  startPlayerAction();
}

function updateDecision(now = performance.now()) {
  renderActions(now);
  renderParts();
  const action = actions.find((item) => item.id === state.selectedAction);
  const part = state.parts.find((item) => item.id === state.selectedPart);

  if (state.playerTask) {
    elements.preview.textContent = `${state.playerTask.action.name}執行中`;
    updatePlayerCast(now);
    return;
  }

  if (state.waitingForMonster) {
    elements.preview.textContent = `${state.preparedDefense?.name ?? "防禦行動"}已準備，等待惡魔出手`;
    updatePlayerCast(now);
    return;
  }

  if (!action) {
    elements.preview.textContent = state.preparedDefense
      ? `已準備：${state.preparedDefense.name}`
      : "拖曳瀏覽行動，點擊一張牌";
    updatePlayerCast(now);
    return;
  }

  if (action.type === "attack" && !part) {
    elements.preview.textContent = "點擊怪物部位，立即出牌";
    updatePlayerCast(now);
    return;
  }

  if (action.type === "attack") {
    const hitChance = action.accuracy * part.accuracy / 100;
    const damage = Math.round(action.damage * part.multiplier / 100);
    elements.preview.textContent = part.revealed
      ? `點擊部位出牌 · 命中 ${formatPercent(hitChance)} · 傷害 ${damage}`
      : "點擊怪物部位，立即出牌";
  }
  updatePlayerCast(now);
}

function startPlayerAction() {
  const action = actions.find((item) => item.id === state.selectedAction);
  const part = state.parts.find((item) => item.id === state.selectedPart);
  if (!canUseAction(action) || (action.type === "attack" && !part)) return;

  const now = performance.now();
  state.waitingForMonster = action.type === "dodge" || action.type === "defend";
  state.playerTask = {
    action,
    part,
    startedAt: now,
    endsAt: now + action.duration * 1000,
  };
  updateView(now);
}

function tick() {
  if (!state.active) return;
  const now = performance.now();

  while (state.active) {
    const playerEndsAt = state.playerTask?.endsAt ?? Infinity;
    const allyEndsAt = state.allyTask?.endsAt ?? Infinity;
    const nextEventAt = Math.min(playerEndsAt, allyEndsAt, state.monsterEndsAt);
    if (nextEventAt > now) break;

    if (playerEndsAt <= allyEndsAt && playerEndsAt <= state.monsterEndsAt) {
      finishPlayerAction();
      if (state.monsterHealth <= 0) {
        finishGame(true);
        return;
      }
    } else if (allyEndsAt <= state.monsterEndsAt) {
      finishAllyAction(allyEndsAt);
      if (state.monsterHealth <= 0) {
        finishGame(true);
        return;
      }
    } else {
      resolveMonsterAction();
      if (state.playerHealth <= 0) {
        finishGame(false);
        return;
      }
      beginMonsterAction(state.monsterEndsAt);
    }
  }

  updateTimeline(now);
  updatePlayerCast(now);
  updateAllyCast(now);
  updateActionAvailability(now);
}

function updateTimeline(now = performance.now()) {
  const action = state.currentMonsterAction;
  if (!action) {
    elements.timerText.textContent = "—";
    elements.timerBar.style.width = "0%";
    elements.timelineCursor.style.left = "0%";
    elements.timelineEndLabel.textContent = "惡魔行動";
    return;
  }

  const total = action.duration * 1000;
  const remaining = Math.max(0, state.monsterEndsAt - now);
  const seconds = remaining / 1000;
  const progress = Math.min(100, Math.max(0, (total - remaining) / total * 100));
  elements.timerText.textContent = seconds < 1 ? seconds.toFixed(1) : Math.ceil(seconds);
  elements.timerBar.style.width = `${progress}%`;
  elements.timelineCursor.style.left = `${progress}%`;
  elements.timelineEndLabel.textContent = action.name;
  const danger = seconds <= 3;
  elements.timer.classList.toggle("danger", danger);
  elements.timerBar.classList.toggle("danger", danger);
  elements.timelineCursor.classList.toggle("danger", danger);
}

function updatePlayerCast(now = performance.now()) {
  const task = state.playerTask;
  elements.playerCast.classList.toggle("active", Boolean(task));
  if (!task) {
    elements.playerCastName.textContent = "行動待命";
    elements.playerCastTime.textContent = "—";
    elements.playerCastBar.style.width = "0%";
    return;
  }

  const total = task.action.duration * 1000;
  const remaining = Math.max(0, task.endsAt - now);
  const progress = Math.min(100, (total - remaining) / total * 100);
  elements.playerCastName.textContent = task.part
    ? `${task.action.name} · ${task.part.name}`
    : task.action.name;
  elements.playerCastTime.textContent = `${(remaining / 1000).toFixed(1)} 秒`;
  elements.playerCastBar.style.width = `${progress}%`;
}

function startAllyAction(now = performance.now()) {
  if (!state.active || state.allyHealth <= 0 || state.allyTask || state.allyWaitingForMonster) return;
  const remaining = (state.monsterEndsAt - now) / 1000;
  const shouldDefend = state.monsterTarget === "ally"
    && state.currentMonsterAction?.type === "attack"
    && (state.allyActionsThisTurn > 0 || remaining <= 8)
    && remaining >= allyActions.defend.duration + .8;
  const action = shouldDefend ? allyActions.defend : allyActions.attack;
  const part = action.type === "attack"
    ? state.parts[Math.floor(Math.random() * state.parts.length)]
    : null;
  const reaction = 800;

  state.allyTask = {
    action,
    part,
    startedAt: now,
    endsAt: now + reaction + action.duration * 1000,
  };
  elements.allyCard.classList.add("acting");
  updateAllyCast(now);
}

function updateAllyCast(now = performance.now()) {
  if (state.allyHealth <= 0) {
    elements.allyActionName.textContent = "倒下";
    elements.allyActionTime.textContent = "—";
    elements.allyActionBar.style.width = "0%";
    elements.allyAction.classList.remove("active");
    return;
  }

  const task = state.allyTask;
  if (!task) {
    elements.allyActionIcon.src = state.allyPreparedDefense?.image ?? allyActions.attack.image;
    elements.allyActionName.textContent = state.allyWaitingForMonster
      ? `${state.allyPreparedDefense?.name ?? "防禦"}已準備`
      : state.active ? "判斷中" : "等待開始";
    elements.allyActionTime.textContent = state.allyWaitingForMonster ? "等待" : "—";
    elements.allyActionBar.style.width = state.allyWaitingForMonster ? "100%" : "0%";
    elements.allyAction.classList.toggle("active", state.allyWaitingForMonster);
    return;
  }

  const total = task.endsAt - task.startedAt;
  const remaining = Math.max(0, task.endsAt - now);
  const progress = Math.min(100, (total - remaining) / total * 100);
  elements.allyAction.classList.add("active");
  elements.allyActionIcon.src = task.action.image;
  elements.allyActionName.textContent = task.part
    ? `${task.action.name} · ${task.part.name}`
    : task.action.name;
  elements.allyActionTime.textContent = `${(remaining / 1000).toFixed(1)} 秒`;
  elements.allyActionBar.style.width = `${progress}%`;
}

function finishAllyAction(eventTime) {
  const task = state.allyTask;
  if (!task) return;
  state.allyTask = null;
  state.allyActionCount += 1;
  elements.allyCard.classList.remove("acting");

  let result;
  if (task.action.type === "attack") {
    state.allyActionsThisTurn += 1;
    const attack = performAllyAttack(task.action, task.part);
    result = attack.hit
      ? `${task.action.name}命中${task.part.name}，造成 ${attack.damage} 傷害`
      : `${task.action.name}攻擊${task.part.name}失誤`;
  } else {
    state.allyPreparedDefense = task.action;
    state.allyWaitingForMonster = true;
    elements.allyCard.classList.add("guarding");
    showActorEffect("ally", "防禦準備");
    result = `防禦已準備，惡魔下一擊減少 ${task.action.defense} 傷害`;
  }

  addLog(`<strong>Morrow 行動 ${state.allyActionCount}</strong>　${result}。`);
  updateView(eventTime);
  if (!state.allyWaitingForMonster && state.monsterHealth > 0) startAllyAction(eventTime);
}

function performAllyAttack(action, part) {
  part.revealed = true;
  const hitChance = action.accuracy * part.accuracy / 100;
  const hit = Math.random() * 100 < hitChance;
  elements.allyCard.classList.add("ally-attack");
  setTimeout(() => elements.allyCard.classList.remove("ally-attack"), 420);

  if (!hit) {
    showDamage("隊友失誤");
    showActorEffect("ally", "失誤");
    return { hit, damage: 0 };
  }

  const damage = Math.round(action.damage * part.multiplier / 100);
  state.monsterHealth = Math.max(0, state.monsterHealth - damage);
  animateMonster("hit");
  showDamage(damage, "隊友");
  showActorEffect("ally", "命中");
  return { hit, damage };
}

function finishPlayerAction() {
  const task = state.playerTask;
  if (!task) return;
  state.playerTask = null;
  state.actionCount += 1;

  let result;
  if (task.action.type === "attack") {
    const attack = performAttack(task.action, task.part);
    result = attack.hit
      ? `${task.action.name}命中${task.part.name}，造成 ${attack.damage} 傷害`
      : `${task.action.name}攻擊${task.part.name}失誤`;
  } else if (task.action.type === "heal") {
    state.actionUses[task.action.id] -= 1;
    if (task.action.lootId) carriedLoot[task.action.lootId] -= 1;
    const healed = Math.min(task.action.heal, PLAYER_MAX_HEALTH - state.playerHealth);
    state.playerHealth += healed;
    showActorEffect("player", `+${healed}`);
    result = `使用${task.action.name}，回復 ${healed} 生命`;
  } else {
    state.preparedDefense = task.action;
    result = task.action.type === "dodge"
      ? "閃避已準備，將避開惡魔下一擊"
      : `防禦已準備，惡魔下一擊減少 ${task.action.defense} 傷害`;
  }

  state.selectedPart = null;
  const persists = task.action.type === "attack" || task.action.type === "heal";
  state.selectedAction = persists && !isActionDepleted(task.action)
    ? task.action.id
    : persists ? getDefaultActionId() : null;
  addLog(`<strong>玩家行動 ${state.actionCount}</strong>　${result}。`);
  updateView();
}

function performAttack(action, part) {
  if (action.uses !== undefined) {
    state.actionUses[action.id] -= 1;
    if (action.lootId) carriedLoot[action.lootId] -= 1;
  }
  part.revealed = true;
  const hitChance = action.accuracy * part.accuracy / 100;
  const hit = Math.random() * 100 < hitChance;
  if (!hit) {
    showDamage("失誤");
    return { hit, damage: 0 };
  }

  const damage = Math.round(action.damage * part.multiplier / 100);
  state.monsterHealth = Math.max(0, state.monsterHealth - damage);
  animateMonster("hit");
  showDamage(damage);
  return { hit, damage };
}

function resolveMonsterAction() {
  const action = state.currentMonsterAction;
  const target = state.monsterTarget;
  const targetName = target === "player" ? "scozirge" : "Morrow";
  const defense = target === "player" ? state.preparedDefense : state.allyPreparedDefense;
  let damage = action.damage;
  let result = `${action.name}對${targetName}造成 ${damage} 傷害`;

  if (defense?.type === "dodge") {
    damage = 0;
    result = `${targetName}閃避成功，完全避開${action.name}`;
  } else if (defense?.type === "defend") {
    damage = Math.max(0, damage - defense.defense);
    result = `${targetName}防禦成功，${action.name}只造成 ${damage} 傷害`;
  }

  state.preparedDefense = null;
  state.allyPreparedDefense = null;
  state.waitingForMonster = false;
  state.allyWaitingForMonster = false;
  elements.allyCard.classList.remove("guarding");
  takeActorDamage(target, damage);
  addLog(`<strong>惡魔行動 ${state.monsterTurn}</strong>　${result}。`);
  updateView();
}

function takeActorDamage(target, damage) {
  if (target === "player") {
    state.playerHealth = Math.max(0, state.playerHealth - damage);
  } else {
    state.allyHealth = Math.max(0, state.allyHealth - damage);
    if (state.allyHealth === 0) {
      state.allyTask = null;
      state.allyWaitingForMonster = false;
      elements.allyCard.classList.remove("acting", "guarding");
    }
  }

  if (elements.monsterFigure.classList.contains("hit")) {
    setTimeout(() => animateMonster("attack"), 380);
  } else {
    animateMonster("attack");
  }
  animateActor(target, "hit");
  showActorEffect(target, damage ? `−${damage}` : "無傷");
  return damage;
}

function animateActor(target, className) {
  const card = target === "player" ? elements.playerCard : elements.allyCard;
  card.classList.remove("hit", "ally-attack");
  void card.offsetWidth;
  card.classList.add(className);
  setTimeout(() => card.classList.remove(className), 420);
}

function showActorEffect(target, text) {
  const effect = target === "player" ? elements.playerEffect : elements.allyEffect;
  effect.textContent = text;
  effect.classList.remove("show");
  void effect.offsetWidth;
  effect.classList.add("show");
}

function formatPercent(value) {
  return `${Math.round(value * 10) / 10}%`;
}

function formatSeconds(value) {
  return Number.isInteger(value) ? value : value.toFixed(1);
}

function isActionDepleted(action) {
  return Boolean(action?.uses !== undefined && state.actionUses[action.id] <= 0);
}

function getDefaultActionId() {
  return actions.find((action) => action.type === "attack" && !isActionDepleted(action))?.id ?? null;
}

function canUseAction(action, now = performance.now()) {
  if (!action || !state.active || state.playerTask || state.waitingForMonster || isActionDepleted(action)) {
    return false;
  }
  if (action.type === "attack") return true;
  if (action.type === "heal") return state.playerHealth < PLAYER_MAX_HEALTH;
  return state.currentMonsterAction?.type === "attack"
    && state.monsterTarget === "player"
    && state.monsterEndsAt - now >= action.duration * 1000;
}

function updateActionAvailability(now = performance.now()) {
  elements.actionGrid.querySelectorAll(".action-card").forEach((button) => {
    const action = actions.find((item) => item.id === button.dataset.actionId);
    button.disabled = !canUseAction(action, now);
  });
}

function renderActions(now = performance.now()) {
  const visibleActions = actions.filter((action) => !isActionDepleted(action));
  elements.actionGrid.replaceChildren(...visibleActions.map((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "action-card";
    button.dataset.actionId = action.id;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(state.selectedAction === action.id));
    button.disabled = !canUseAction(action, now);
    if (state.selectedAction === action.id) button.classList.add("selected");

    const resource = action.uses !== undefined ? `<b class="action-resource">${state.actionUses[action.id]}</b>` : "";
    const stats = action.type === "attack"
      ? `<span><b>${action.accuracy}%</b><small>命中</small></span><span><b>${action.damage}</b><small>傷害</small></span><span><b>${formatSeconds(action.duration)}</b><small>耗時</small></span>`
      : action.type === "heal"
        ? `<span><b>${action.heal}</b><small>回復</small></span><span><b>${formatSeconds(action.duration)}</b><small>耗時</small></span>`
      : action.type === "dodge"
        ? `<span><b>100%</b><small>閃避</small></span><span><b>${formatSeconds(action.duration)}</b><small>耗時</small></span>`
        : `<span><b>${action.defense}</b><small>減傷</small></span><span><b>${formatSeconds(action.duration)}</b><small>耗時</small></span>`;

    button.innerHTML = `
      <img class="action-icon" src="${action.image}" alt="" draggable="false">
      <span class="action-name"><strong>${action.name}</strong>${resource}</span>
      <span class="action-stats">${stats}</span>
    `;
    button.addEventListener("click", () => {
      if (!ignoreTrayClick) selectAction(action.id);
    });
    return button;
  }));
}

function enableActionTray() {
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let moved = false;

  elements.actionGrid.addEventListener("dragstart", (event) => event.preventDefault());

  elements.actionGrid.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    startX = event.clientX;
    startScroll = elements.actionGrid.scrollLeft;
    moved = false;
  });

  elements.actionGrid.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const distance = event.clientX - startX;
    if (Math.abs(distance) > 6) {
      moved = true;
      if (!elements.actionGrid.hasPointerCapture(pointerId)) {
        elements.actionGrid.setPointerCapture(pointerId);
      }
      elements.actionGrid.classList.add("dragging");
      elements.actionGrid.scrollLeft = startScroll - distance;
    }
  });

  const stopDragging = (event) => {
    if (event.pointerId !== pointerId) return;
    if (elements.actionGrid.hasPointerCapture(pointerId)) {
      elements.actionGrid.releasePointerCapture(pointerId);
    }
    pointerId = null;
    elements.actionGrid.classList.remove("dragging");
    if (moved) {
      ignoreTrayClick = true;
      setTimeout(() => {
        ignoreTrayClick = false;
      });
    }
  };

  elements.actionGrid.addEventListener("pointerup", stopDragging);
  elements.actionGrid.addEventListener("pointercancel", stopDragging);
  elements.actionGrid.addEventListener("wheel", (event) => {
    if (elements.actionGrid.scrollWidth <= elements.actionGrid.clientWidth) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    elements.actionGrid.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

function renderParts() {
  const action = actions.find((item) => item.id === state.selectedAction);
  const choosingAttack = action?.type === "attack";
  const interactive = choosingAttack && !state.playerTask;
  elements.partGrid.classList.toggle("locked", !interactive);
  elements.partOverlays.classList.toggle("locked", !choosingAttack);
  const overlays = [];
  const zones = state.parts.map((part) => {
    const overlay = document.createElement("img");
    overlay.className = "hit-overlay";
    overlay.dataset.part = part.id;
    overlay.src = `assets/hit-overlays/soot-hound-${part.id}.png`;
    overlay.alt = "";
    if (state.selectedPart === part.id) overlay.classList.add("selected");
    overlays.push(overlay);

    const zone = document.createElementNS("http://www.w3.org/2000/svg", "path");
    zone.classList.add("hit-zone");
    zone.dataset.part = part.id;
    zone.setAttribute("d", hitZonePaths[part.id]);
    zone.setAttribute("fill-rule", "evenodd");
    zone.setAttribute("role", "option");
    zone.setAttribute("tabindex", !interactive || !state.active ? "-1" : "0");
    zone.setAttribute("aria-selected", String(state.selectedPart === part.id));
    zone.setAttribute("aria-label", `${part.name}，快捷鍵 ${partKeys[part.id]}`);
    if (state.selectedPart === part.id) zone.classList.add("selected");
    if (part.revealed) zone.classList.add("revealed");
    zone.addEventListener("click", () => selectPart(part.id));
    zone.addEventListener("pointerenter", () => {
      if (interactive) {
        overlay.classList.add("hovered");
        renderPartCallout(part);
      }
    });
    zone.addEventListener("pointerleave", () => {
      overlay.classList.remove("hovered");
      renderPartCallout(state.parts.find((item) => item.id === state.selectedPart));
    });
    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPart(part.id);
      }
    });
    return zone;
  });
  elements.partOverlays.replaceChildren(...overlays);
  elements.partGrid.replaceChildren(...zones);
  renderPartCallout(choosingAttack ? state.parts.find((part) => part.id === state.selectedPart) : null);
}

function renderPartCallout(part) {
  elements.partCallouts.replaceChildren();
  if (!part) return;

  const layout = calloutLayouts[part.id];
  const accuracy = part.revealed ? `${part.accuracy}%` : "?";
  const multiplier = part.revealed ? `${part.multiplier}%` : "?";
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("part-callout");
  group.innerHTML = `
    <path d="${layout.path}"></path>
    <circle cx="${layout.anchor[0]}" cy="${layout.anchor[1]}" r="6"></circle>
    <text x="${layout.x}" y="${layout.y}">
      <tspan x="${layout.x}">命中：${accuracy}</tspan>
      <tspan x="${layout.x}" dy="42">傷害：${multiplier}</tspan>
    </text>
  `;
  elements.partCallouts.append(group);
}

function updateView(now = performance.now()) {
  elements.round.textContent = state.monsterTurn || "—";
  elements.playerHealthText.textContent = `${state.playerHealth} / ${PLAYER_MAX_HEALTH}`;
  elements.playerHealthBar.style.width = `${state.playerHealth / PLAYER_MAX_HEALTH * 100}%`;
  elements.allyHealthText.textContent = `${state.allyHealth} / ${ALLY_MAX_HEALTH}`;
  elements.allyHealthBar.style.width = `${state.allyHealth / ALLY_MAX_HEALTH * 100}%`;
  elements.monsterHealthText.textContent = `${state.monsterHealth} / ${MONSTER_MAX_HEALTH}`;
  elements.monsterHealthBar.style.width = `${state.monsterHealth / MONSTER_MAX_HEALTH * 100}%`;
  elements.allyCard.classList.toggle("down", state.allyHealth <= 0);
  renderMonsterTarget();
  updateTimeline(now);
  updateAllyCast(now);
  updateDecision(now);
}

function addLog(html) {
  state.logs.unshift(html);
  state.logs = state.logs.slice(0, 8);
  elements.log.replaceChildren(...state.logs.map((entry) => {
    const item = document.createElement("li");
    item.innerHTML = entry;
    return item;
  }));
}

function showDamage(value, source = "") {
  const damage = typeof value === "number" ? `−${value}` : value;
  elements.damageNumber.textContent = source ? `${source} ${damage}` : damage;
  elements.damageNumber.classList.remove("show");
  void elements.damageNumber.offsetWidth;
  elements.damageNumber.classList.add("show");
}

function animateMonster(className) {
  elements.monsterFigure.classList.remove("hit", "attack");
  void elements.monsterFigure.offsetWidth;
  elements.monsterFigure.classList.add(className);
  setTimeout(() => elements.monsterFigure.classList.remove(className), 360);
}

function openLoot() {
  state.lootActive = true;
  state.lootResolved = false;
  state.playerLootSelections.clear();
  state.allyLootSelections = chooseAllyLoot();
  state.lootResults = null;
  state.lootDeadline = performance.now() + 15000;
  elements.lootSummary.textContent = "Morrow 已做出選擇，你可以選擇任意數量。";
  elements.lootContinue.hidden = true;
  elements.lootModal.classList.add("open");
  renderLoot();
  updateLootTimer();
  clearInterval(lootTimerId);
  lootTimerId = setInterval(updateLootTimer, 50);
}

function chooseAllyLoot() {
  if (state.allyHealth <= 0) return new Set();
  const pool = [...lootItems];
  const selected = new Set();
  const count = Math.floor(Math.random() * 4);
  for (let index = 0; index < count && pool.length; index += 1) {
    const choice = Math.floor(Math.random() * pool.length);
    selected.add(pool.splice(choice, 1)[0].id);
  }
  return selected;
}

function toggleLootSelection(id) {
  if (!state.lootActive || state.lootResolved) return;
  if (state.playerLootSelections.has(id)) {
    state.playerLootSelections.delete(id);
  } else {
    state.playerLootSelections.add(id);
  }
  renderLoot();
}

function renderLoot() {
  elements.lootGrid.replaceChildren(...lootItems.map((item) => {
    const playerSelected = state.playerLootSelections.has(item.id);
    const allySelected = state.allyLootSelections.has(item.id);
    const owner = state.lootResults?.[item.id] ?? undefined;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "loot-item";
    button.setAttribute("aria-pressed", String(playerSelected));
    button.disabled = state.lootResolved;
    if (playerSelected) button.classList.add("selected");
    if (state.lootResolved) {
      button.classList.add("resolved");
      button.classList.add(owner ? `awarded-${owner}` : "abandoned");
    }

    const pickers = [
      playerSelected
        ? `<span class="looter player" title="scozirge 選擇"><img src="assets/scozirge-portrait.webp" alt="scozirge"></span>`
        : "",
      allySelected
        ? `<span class="looter ally" title="Morrow 選擇"><img src="assets/survivor.webp" alt="Morrow"></span>`
        : "",
    ].join("");
    const result = state.lootResolved
      ? `<span class="loot-result">${owner === "player" ? "你取得" : owner === "ally" ? "Morrow 取得" : "無人選擇"}</span>`
      : "";

    button.innerHTML = `
      <img class="loot-item-icon" src="${item.image}" alt="" draggable="false">
      <span class="loot-item-copy">
        <strong>${item.name}</strong>
        <span>${item.stat}</span>
        <p>${item.description}</p>
      </span>
      <span class="looter-stack">${pickers}</span>
      ${result}
    `;
    button.addEventListener("click", () => toggleLootSelection(item.id));
    return button;
  }));
}

function updateLootTimer() {
  if (!state.lootActive || state.lootResolved) return;
  const remaining = Math.max(0, state.lootDeadline - performance.now());
  const seconds = remaining / 1000;
  elements.lootTimerText.textContent = seconds < 1 ? seconds.toFixed(1) : Math.ceil(seconds);
  elements.lootTimerBar.style.width = `${remaining / 15000 * 100}%`;
  elements.lootTimer.classList.toggle("danger", seconds <= 3);
  if (remaining === 0) resolveLoot();
}

function resolveLoot() {
  if (state.lootResolved) return;
  clearInterval(lootTimerId);
  state.lootResolved = true;
  state.lootActive = false;
  state.lootResults = {};

  lootItems.forEach((item) => {
    const candidates = [];
    if (state.playerLootSelections.has(item.id)) candidates.push("player");
    if (state.allyLootSelections.has(item.id)) candidates.push("ally");
    const owner = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : null;
    state.lootResults[item.id] = owner;
    if (owner === "player") carriedLoot[item.id] += 1;
  });

  const received = lootItems.filter((item) => state.lootResults[item.id] === "player");
  elements.lootTimerText.textContent = "0.0";
  elements.lootTimerBar.style.width = "0%";
  elements.lootSummary.textContent = received.length
    ? `你取得：${received.map((item) => item.name).join("、")}。`
    : "你沒有取得任何戰利品。";
  elements.lootContinue.hidden = false;
  renderLoot();
}

function finishGame(victory) {
  state.active = false;
  clearInterval(timerId);
  if (victory) {
    setTimeout(openLoot, 450);
    return;
  }
  const known = state.parts.filter((part) => part.revealed).length;
  elements.modalEyebrow.textContent = "遠征失敗";
  elements.modalTitle.textContent = "情報沒能救下你";
  elements.modalBody.textContent = `你撐過 ${state.monsterTurn} 次惡魔行動，與 Morrow 識破 ${known}/${state.parts.length} 個部位。`;
  elements.start.textContent = "再次挑戰惡魔";
  setTimeout(() => elements.modal.classList.add("open"), 650);
}

elements.start.addEventListener("click", startGame);
elements.lootContinue.addEventListener("click", startGame);
enableActionTray();
document.addEventListener("keydown", (event) => {
  if (elements.modal.classList.contains("open") && event.key === "Enter") {
    startGame();
    return;
  }

  const actionIndex = Number(event.key) - 1;
  if (actionIndex >= 0 && actionIndex < actions.length) selectAction(actions[actionIndex].id);
  const partId = { q: "head", w: "left_limb", e: "right_limb" }[event.key.toLowerCase()];
  if (partId && state.parts.some((part) => part.id === partId)) selectPart(partId);
});

resetState();
updateView();
