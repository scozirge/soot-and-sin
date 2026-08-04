"use strict";

const PLAYER_MAX_HEALTH = 72;
const ALLY_MAX_HEALTH = 64;
const adventureSession = AdventureState.load();
const storyNode = AdventureState.currentNode(adventureSession);
const isPainPriestEncounter = Boolean(
  adventureSession.chapterStoryCombat && storyNode?.id === "pain_priest",
);
const encounter = isPainPriestEncounter
  ? {
      id: "pain-priest",
      name: "苦痛祭司",
      maxHealth: 90,
      art: "assets/pain-priest.png",
      aspect: "957 / 1643",
      viewBox: "0 0 957 1643",
      calloutFontSize: "58px",
      calloutStroke: "6px",
      calloutLineHeight: 68,
      calloutSafePadding: 24,
      intro: "你與 Morrow 在房間牆角遭到苦痛祭司襲擊。",
    }
  : {
      id: "soot-hound",
      name: "惡魔",
      maxHealth: 90,
      art: "assets/soot-hound.webp",
      aspect: "820 / 900",
      viewBox: "0 0 820 900",
      calloutFontSize: "35px",
      calloutStroke: "4px",
      calloutLineHeight: 42,
      calloutSafePadding: 24,
      intro: "你與 Morrow 對上惡魔。",
    };
const MONSTER_MAX_HEALTH = encounter.maxHealth;
function groupedInventory(category) {
  const grouped = new Map();
  adventureSession.inventory
    .filter((item) => item.category === category && item.quantity > 0)
    .forEach((item) => {
      const existing = grouped.get(item.id);
      if (existing) existing.quantity += item.quantity;
      else grouped.set(item.id, { ...item });
    });
  return [...grouped.values()];
}

const medicalActions = groupedInventory("medical")
  .map((item) => ({
    id: `medical_${item.id}`,
    inventoryId: item.id,
    type: "heal",
    name: item.name,
    image: "assets/action-bandage.svg",
    heal: item.heal,
    duration: 3,
    uses: item.quantity,
  }));
const weaponActions = groupedInventory("weapon")
  .map((item) => ({
    id: `weapon_${item.id}`,
    inventoryId: item.id,
    type: "attack",
    name: item.name,
    image: `assets/${item.combatImage || "action-axe.webp"}`,
    damage: item.damage,
    accuracy: item.accuracy,
    duration: item.duration,
    uses: item.quantity,
  }));
const inventoryActions = [...weaponActions, ...medicalActions];

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
  ...inventoryActions,
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

const demonLootItems = [
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
const lootItems = isPainPriestEncounter ? [] : demonLootItems;

const carriedLoot = { meat: 0, claw: 0, head: 0 };
let currentLootPool = [];

const monsterActions = isPainPriestEncounter
  ? [
      { id: "bite", type: "attack", name: "咬", icon: "!", damage: 32, accuracy: 55, duration: 30 },
      { id: "stab", type: "attack", name: "刺", icon: "†", damage: 30, accuracy: 90, duration: 24, requiresAll: ["right_hand"] },
      { id: "claw", type: "attack", name: "爪", icon: "≋", damage: 12, accuracy: 90, duration: 10, requiresAll: ["left_hand"] },
    ]
  : [
      { id: "claw", type: "attack", name: "爪襲", icon: "≋", damage: 12, accuracy: 100, duration: 14, requiresAny: ["left_limb", "right_limb"] },
      { id: "frenzy", type: "attack", name: "狂抓", icon: "✣", damage: 22, accuracy: 100, duration: 20, requiresAll: ["left_limb", "right_limb"] },
      { id: "bite", type: "attack", name: "啃咬", icon: "!", damage: 32, accuracy: 100, duration: 30 },
    ];

const regions = isPainPriestEncounter
  ? [
      {
        id: "head", name: "頭", accuracy: 55, multiplier: 200, durabilityPercent: 50,
        stunSeconds: 2, lethal: true,
        hitOverlayImage: "assets/hit-overlays/pain-priest-head.png",
      },
      {
        id: "right_hand", name: "右手（持刀）", accuracy: 72, multiplier: 145, durabilityPercent: 40,
        damageImage: "assets/damage-overlays/pain-priest-right_hand-destroyed.png",
        hitOverlayImage: "assets/hit-overlays/pain-priest-right_hand.png",
      },
      {
        id: "left_hand", name: "左手", accuracy: 78, multiplier: 135, durabilityPercent: 40,
        damageImage: "assets/damage-overlays/pain-priest-left_hand-destroyed.png",
        hitOverlayImage: "assets/hit-overlays/pain-priest-left_hand.png",
      },
      {
        id: "legs", name: "腳", accuracy: 86, multiplier: 120, durabilityPercent: 30,
        speedMultiplier: .7,
        damageImage: "assets/damage-overlays/pain-priest-legs-destroyed.png",
        hitOverlayImage: "assets/hit-overlays/pain-priest-legs.png",
      },
    ]
  : [
      {
        id: "head", name: "頭顱", accuracy: 50, multiplier: 260, durabilityPercent: 80,
        stunSeconds: 2, lethal: true,
        hitOverlayImage: "assets/hit-overlays/soot-hound-head.png",
      },
      {
        id: "left_limb", name: "左側前肢", accuracy: 75, multiplier: 160, durabilityPercent: 60,
        hitOverlayImage: "assets/hit-overlays/soot-hound-left_limb.png",
        damageImage: "assets/damage-overlays/soot-hound-left_limb-destroyed.png",
        damageElementId: "destroyedLeftLimb",
      },
      {
        id: "right_limb", name: "右側前肢", accuracy: 85, multiplier: 140, durabilityPercent: 60,
        hitOverlayImage: "assets/hit-overlays/soot-hound-right_limb.png",
        damageImage: "assets/damage-overlays/soot-hound-right_limb-destroyed.png",
        damageElementId: "destroyedRightLimb",
      },
    ];

const headHitPath = "M348 284C356 279 364 284 370 290C377 285 384 285 391 291C399 284 407 283 415 290C423 286 431 290 438 297C448 307 452 320 451 334C450 350 445 365 438 379C431 394 423 406 416 419C407 434 401 447 393 457C383 447 377 433 369 422C360 411 353 398 346 385C338 370 333 354 332 337C331 319 337 301 348 284Z";
const leftLimbHitPath = "M270 302C244 320 232 354 226 390C220 430 207 469 194 510C178 552 166 597 154 644C145 682 140 714 138 735C126 755 105 769 87 780L52 800C42 807 47 819 59 818L102 801L75 824C68 833 80 840 91 834L123 811L111 839C107 852 124 854 132 842L148 816L156 844C160 856 176 852 178 839L170 806C178 795 185 784 190 770C197 741 200 711 207 679C218 630 230 582 242 536C253 490 269 448 280 405C289 370 303 342 302 322C294 310 283 303 270 302Z";
const rightLimbHitPath = "M468 294C495 292 522 312 542 337C568 368 593 398 616 430C634 455 645 475 643 495C640 520 636 548 632 580L615 688C611 713 606 731 600 746C612 760 631 779 646 794C657 804 650 817 638 812L605 787L627 823C634 836 617 843 608 831L585 797L594 838C598 852 579 856 572 842L560 802L545 840C540 854 523 848 526 834L540 790C529 778 516 769 505 757C498 748 503 736 514 735C527 732 546 737 558 744C565 724 571 702 576 679L594 570C598 542 602 515 604 492C583 474 560 455 538 437C510 414 486 391 469 366C450 338 443 313 468 294Z";
const priestHeadHitPath = "M491 282L511 276L535 278L558 285L576 300L588 321L596 349L598 374L592 399L583 422L571 441L553 457L535 465L517 462L500 453L484 439L471 421L461 400L454 377L453 354L457 332L465 312L476 295Z M455 325L438 307L431 303L437 319L444 340L451 356L457 364L458 345Z M594 329L610 319L631 305L623 329L615 349L607 365L599 370L598 349Z";
const priestRightHandHitPath = "M292 158L313 151L337 156L352 163L356 176L366 178L370 184L366 190L358 195L357 204L352 213L343 220L333 218L321 209L312 205L306 211L301 229L293 247L283 261L273 266L263 260L258 251L262 240L271 222L278 202L283 181Z M333 207L346 207L346 222L332 222Z";
const priestLeftHandHitPath = "M641 665L649 647L667 638L687 640L702 652L710 670L709 690L700 704L684 711L665 704L650 694Z M649 613L657 614L664 623L664 637L659 651L653 664L646 662L643 651L646 637Z M675 633L683 628L692 632L699 641L700 653L695 667L688 674L681 668L682 654Z M704 644L713 638L721 644L722 655L718 670L712 683L705 689L700 683L703 669Z M650 668L636 677L619 685L605 693L594 701L590 710L594 717L603 718L615 711L629 704L645 699L659 691Z M710 674L720 675L727 685L730 700L726 715L718 732L711 743L704 742L702 734L706 719L709 702L706 689Z M720 683L731 675L740 679L746 688L745 699L739 712L731 725L724 736L717 742L712 735L718 719L725 703Z";
const priestLegsHitPath = "M486 1318L506 1317L526 1322L542 1332L548 1350L546 1375L548 1400L550 1423L555 1445L563 1460L566 1475L562 1486L554 1493L544 1492L538 1487L537 1494L530 1500L519 1498L514 1491L511 1497L505 1501L493 1498L487 1490L480 1496L465 1495L456 1488L453 1478L455 1465L462 1454L467 1434L470 1412L472 1388L475 1361L478 1337Z";

const hitZonePaths = isPainPriestEncounter
  ? {
      head: priestHeadHitPath,
      right_hand: priestRightHandHitPath,
      left_hand: priestLeftHandHitPath,
      legs: priestLegsHitPath,
    }
  : { head: headHitPath, left_limb: leftLimbHitPath, right_limb: rightLimbHitPath };

const calloutLayouts = isPainPriestEncounter
  ? {
      head: { path: "M535 350L650 450H920", anchor: [535, 350], x: 650, y: 350 },
      right_hand: { path: "M285 270L160 400H28", anchor: [285, 270], x: 34, y: 270 },
      left_hand: { path: "M690 650L790 730H920", anchor: [690, 650], x: 650, y: 600 },
      legs: { path: "M520 1360L210 1190H28", anchor: [520, 1360], x: 34, y: 1050 },
    }
  : {
      head: { path: "M392 330L540 175H805", anchor: [392, 330], x: 620, y: 108 },
      left_limb: { path: "M177 590L95 500H5", anchor: [177, 590], x: 12, y: 430 },
      right_limb: { path: "M604 570L700 490H815", anchor: [604, 570], x: 682, y: 420 },
    };

const hitFeedbackPositions = isPainPriestEncounter
  ? { head: [55, 25], right_hand: [32, 15], left_hand: [72, 42], legs: [54, 88] }
  : { head: [48, 38], left_limb: [22, 66], right_limb: [73, 66] };

const partKeys = isPainPriestEncounter
  ? { head: "Q", right_hand: "W", left_hand: "E", legs: "R" }
  : { head: "Q", left_limb: "W", right_limb: "E" };

const elements = {
  round: document.querySelector("#roundNumber"),
  roundActionLabel: document.querySelector("#roundActionLabel"),
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
  monsterCanvas: document.querySelector("#monsterCanvas"),
  monsterArt: document.querySelector("#monsterArt"),
  monsterFigure: document.querySelector("#monsterFigure"),
  monsterName: document.querySelector("#monsterName"),
  timelineTitle: document.querySelector("#timelineTitle"),
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
  lootEyebrow: document.querySelector("#lootEyebrow"),
  lootSummary: document.querySelector("#lootSummary"),
  lootContinue: document.querySelector("#lootContinue"),
};

let state;
let timerId;
let lootTimerId;
let lootDistributionUi;
let lootClaimTimers = [];
let ignoreTrayClick = false;

function configureEncounterView() {
  elements.roundActionLabel.textContent = `${encounter.name}行動`;
  elements.timelineTitle.textContent = `${encounter.name}行動時間軸`;
  elements.timelineEndLabel.textContent = `${encounter.name}行動`;
  elements.monsterName.textContent = encounter.name;
  elements.monsterFigure.src = encounter.art;
  elements.monsterFigure.alt = encounter.name;
  elements.monsterCanvas.style.setProperty("--monster-aspect", encounter.aspect);
  elements.monsterCanvas.style.setProperty("--callout-font-size", encounter.calloutFontSize);
  elements.monsterCanvas.style.setProperty("--callout-stroke", encounter.calloutStroke);
  elements.partGrid.setAttribute("viewBox", encounter.viewBox);
  elements.partCallouts.setAttribute("viewBox", encounter.viewBox);
  elements.intentDescription.textContent = `開始後會公開${encounter.name}的攻擊、命中率與發動時間。`;
  elements.lootEyebrow.textContent = `${encounter.name}戰利品`;
  if (isPainPriestEncounter) {
    elements.modalEyebrow.textContent = "劇本遭遇 · 部位戰鬥";
    elements.modalTitle.textContent = "牆角的人影撲了上來";
    elements.modalBody.textContent = "苦痛祭司會咬、持刀刺擊與用長指甲抓撓。命中頭部可使她暈眩；破壞雙手會封鎖對應招式，破壞雙腿則會降低行動速度。";
    elements.start.textContent = "迎戰苦痛祭司";
  }
}

function randomLootClaimDelay() { return 1000 + Math.random() * 4000; }
function lootKey(item) { return item.instanceId ?? item.claimId ?? item.id; }

function createParts() {
  return regions.map((region) => ({
    ...region,
    revealed: false,
    durability: Math.ceil(MONSTER_MAX_HEALTH * region.durabilityPercent / 100),
    damageTaken: 0,
    destroyed: false,
  }));
}

function resetState() {
  state = {
    active: false,
    monsterTurn: 0,
    actionCount: 0,
    allyActionCount: 0,
    playerHealth: Math.max(1, adventureSession.playerHealth),
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
    monsterActionDuration: 0,
    monsterSpeedMultiplier: 1,
    monsterStunnedUntil: 0,
    monsterPausedRemaining: 0,
    parts: createParts(),
    actionUses: Object.fromEntries(
      actions
        .filter((action) => action.uses !== undefined)
        .map((action) => [action.id, action.lootId ? carriedLoot[action.lootId] : action.uses]),
    ),
    lootActive: false,
    lootResolved: false,
    lootDeadline: 0,
    lootResults: null,
    logs: [],
  };
}

function startGame() {
  clearInterval(timerId);
  clearInterval(lootTimerId);
  lootClaimTimers.forEach(clearTimeout);
  lootClaimTimers = [];
  resetState();
  elements.modal.classList.remove("open");
  elements.lootModal.classList.remove("open");
  elements.log.replaceChildren();
  addLog(`<strong>遭遇開始。</strong>${encounter.intro}`);
  state.active = true;
  beginMonsterAction(performance.now());
  timerId = setInterval(tick, 50);
}

function getMonsterActionDuration(action) {
  return action.duration / state.monsterSpeedMultiplier;
}

function beginMonsterAction(now, replacement = false) {
  if (!state.active) return;
  if (!replacement) state.monsterTurn += 1;
  state.currentMonsterAction = chooseMonsterAction();
  state.monsterTarget = chooseMonsterTarget();
  state.previousMonsterAction = state.currentMonsterAction.id;
  state.allyActionsThisTurn = 0;
  state.monsterStartedAt = now;
  state.monsterActionDuration = getMonsterActionDuration(state.currentMonsterAction);
  state.monsterEndsAt = now + state.monsterActionDuration * 1000;
  state.monsterStunnedUntil = 0;
  state.monsterPausedRemaining = 0;

  const attack = state.currentMonsterAction;
  elements.intentCard.className = "intent-card danger";
  elements.intentIcon.textContent = attack.icon;
  elements.intentName.textContent = attack.name;
  elements.intentDescription.textContent = `傷害 ${attack.damage} · 命中 ${attack.accuracy}% · ${formatSeconds(state.monsterActionDuration)} 秒後發動`;
  elements.intentTarget.textContent = `目標：${state.monsterTarget === "player" ? "scozirge" : "Morrow"}`;
  renderMonsterTarget();
  if (!state.allyTask && !state.allyWaitingForMonster && state.allyHealth > 0) startAllyAction(now);
  updateView(now);
}

function chooseMonsterAction() {
  const available = monsterActions.filter(canMonsterUseAction);
  const fresh = available.filter((action) => action.id !== state.previousMonsterAction);
  const choices = fresh.length ? fresh : available;
  return choices[Math.floor(Math.random() * choices.length)];
}

function canMonsterUseAction(action) {
  const intact = (id) => !state.parts.find((part) => part.id === id)?.destroyed;
  if (action.requiresAll && !action.requiresAll.every(intact)) return false;
  if (action.requiresAny && !action.requiresAny.some(intact)) return false;
  return true;
}

function chooseMonsterTarget() {
  const targets = [];
  if (state.playerHealth > 0) targets.push("player");
  if (state.allyHealth > 0) targets.push("ally");
  return targets[Math.floor(Math.random() * targets.length)];
}

function stunMonster(seconds, now = performance.now()) {
  const duration = seconds * 1000;
  if (now < state.monsterStunnedUntil) {
    state.monsterStunnedUntil += duration;
    state.monsterEndsAt += duration;
    return;
  }
  state.monsterPausedRemaining = Math.max(0, state.monsterEndsAt - now);
  state.monsterStunnedUntil = now + duration;
  state.monsterEndsAt = state.monsterStunnedUntil + state.monsterPausedRemaining;
}

function reduceMonsterSpeed(multiplier, now = performance.now()) {
  if (!state.currentMonsterAction || multiplier >= state.monsterSpeedMultiplier) return;
  const previousMultiplier = state.monsterSpeedMultiplier;
  const remainingScale = previousMultiplier / multiplier;
  state.monsterSpeedMultiplier = multiplier;
  state.monsterActionDuration = getMonsterActionDuration(state.currentMonsterAction);
  if (now < state.monsterStunnedUntil) {
    state.monsterPausedRemaining *= remainingScale;
    state.monsterEndsAt = state.monsterStunnedUntil + state.monsterPausedRemaining;
  } else {
    const remaining = Math.max(0, state.monsterEndsAt - now) * remainingScale;
    state.monsterEndsAt = now + remaining;
  }
}

function replaceInvalidMonsterAction(now = performance.now()) {
  if (!state.currentMonsterAction || canMonsterUseAction(state.currentMonsterAction)) return;
  const canceled = state.currentMonsterAction.name;
  const stunRemaining = Math.max(0, state.monsterStunnedUntil - now);
  addLog(`<strong>${canceled}取消。</strong>必要部位已被破壞，${encounter.name}改用其他行動。`);
  beginMonsterAction(now, true);
  if (stunRemaining > 0) stunMonster(stunRemaining / 1000, now);
}

function cancelTasksForPart(part) {
  if (state.playerTask?.part?.id === part.id) {
    state.playerTask = null;
    addLog(`<strong>玩家行動取消。</strong>${part.name}已被破壞。`);
  }
  if (state.allyTask?.part?.id === part.id) {
    state.allyTask = null;
    elements.allyCard.classList.remove("acting");
    addLog(`<strong>Morrow 行動取消。</strong>${part.name}已被破壞。`);
  }
  if (state.selectedPart === part.id) state.selectedPart = null;
}

function applyPartDamage(part, damage, now = performance.now()) {
  if (part.destroyed) return { destroyed: false, stunned: false, effect: "目標部位已破壞" };
  state.monsterHealth = Math.max(0, state.monsterHealth - damage);
  part.damageTaken = Math.min(part.durability, part.damageTaken + damage);

  if (part.damageTaken >= part.durability) {
    part.destroyed = true;
    cancelTasksForPart(part);
    if (part.speedMultiplier) reduceMonsterSpeed(part.speedMultiplier, now);
    if (part.lethal) state.monsterHealth = 0;
    else if (state.monsterHealth > 0) replaceInvalidMonsterAction(now);
    return {
      destroyed: true,
      stunned: false,
      effect: part.lethal
        ? `${part.name}破壞，${encounter.name}死亡`
        : part.speedMultiplier
          ? `${part.name}破壞，行動速度降低 30%`
          : `${part.name}破壞`,
    };
  }

  if (part.stunSeconds) {
    stunMonster(part.stunSeconds, now);
    return { destroyed: false, stunned: true, effect: `頭部命中，暈眩 ${part.stunSeconds} 秒` };
  }
  return { destroyed: false, stunned: false, effect: "" };
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
  if (!state.parts.some((part) => part.id === id && !part.destroyed)) return;
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
    elements.preview.textContent = `${state.preparedDefense?.name ?? "防禦行動"}已準備，等待${encounter.name}出手`;
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
  if (!canUseAction(action) || (action.type === "attack" && (!part || part.destroyed))) return;

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
    elements.timelineEndLabel.textContent = `${encounter.name}行動`;
    return;
  }

  const stunned = now < state.monsterStunnedUntil;
  const total = state.monsterActionDuration * 1000;
  const remaining = stunned
    ? state.monsterPausedRemaining
    : Math.max(0, state.monsterEndsAt - now);
  const seconds = remaining / 1000;
  const stunSeconds = Math.max(0, state.monsterStunnedUntil - now) / 1000;
  const progress = Math.min(100, Math.max(0, (total - remaining) / total * 100));
  elements.timerText.textContent = seconds < 1 ? seconds.toFixed(1) : Math.ceil(seconds);
  elements.timerBar.style.width = `${progress}%`;
  elements.timelineCursor.style.left = `${progress}%`;
  elements.timelineEndLabel.textContent = action.name;
  elements.intentCard.classList.toggle("stunned", stunned);
  elements.intentDescription.textContent = stunned
    ? `暈眩中 · 倒數暫停 ${stunSeconds < 1 ? stunSeconds.toFixed(1) : Math.ceil(stunSeconds)} 秒`
    : `傷害 ${action.damage} · 命中 ${action.accuracy}% · ${formatSeconds(state.monsterActionDuration)} 秒後發動`;
  const danger = !stunned && seconds <= 3;
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
  const availableParts = state.parts.filter((part) => !part.destroyed);
  const part = action.type === "attack"
    ? availableParts[Math.floor(Math.random() * availableParts.length)]
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
      ? `${task.action.name}命中${task.part.name}，造成 ${attack.damage} 傷害${attack.effect ? `；${attack.effect}` : ""}`
      : `${task.action.name}攻擊${task.part.name}失誤`;
  } else {
    state.allyPreparedDefense = task.action;
    state.allyWaitingForMonster = true;
    elements.allyCard.classList.add("guarding");
    showActorEffect("ally", "防禦準備");
    result = `防禦已準備，${encounter.name}下一擊減少 ${task.action.defense} 傷害`;
  }

  addLog(`<strong>Morrow 行動 ${state.allyActionCount}</strong>　${result}。`);
  updateView(eventTime);
  if (!state.allyWaitingForMonster && state.monsterHealth > 0) startAllyAction(eventTime);
}

function performAllyAttack(action, part) {
  if (part.destroyed) return { hit: false, damage: 0, effect: "目標部位已破壞" };
  part.revealed = true;
  const hitChance = action.accuracy * part.accuracy / 100;
  const hit = Math.random() * 100 < hitChance;
  elements.allyCard.classList.add("ally-attack");
  setTimeout(() => elements.allyCard.classList.remove("ally-attack"), 420);

  if (!hit) {
    showDamage("失誤", part, { source: "隊友" });
    showActorEffect("ally", "失誤");
    return { hit, damage: 0 };
  }

  const damage = Math.round(action.damage * part.multiplier / 100);
  const outcome = applyPartDamage(part, damage);
  animateMonster("hit");
  showDamage(damage, part, { source: "隊友", effect: outcome.effect, destroyed: outcome.destroyed });
  showActorEffect("ally", "命中");
  return { hit, damage, effect: outcome.effect };
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
      ? `${task.action.name}命中${task.part.name}，造成 ${attack.damage} 傷害${attack.effect ? `；${attack.effect}` : ""}`
      : `${task.action.name}攻擊${task.part.name}失誤`;
  } else if (task.action.type === "heal") {
    state.actionUses[task.action.id] -= 1;
    if (task.action.lootId) carriedLoot[task.action.lootId] -= 1;
    if (task.action.inventoryId) {
      task.action.uses = state.actionUses[task.action.id];
      AdventureState.consume(AdventureState.load(), task.action.inventoryId);
    }
    const healed = Math.min(task.action.heal, PLAYER_MAX_HEALTH - state.playerHealth);
    state.playerHealth += healed;
    showActorEffect("player", `+${healed}`);
    result = `使用${task.action.name}，回復 ${healed} 生命`;
  } else {
    state.preparedDefense = task.action;
    result = task.action.type === "dodge"
      ? `閃避已準備，將避開${encounter.name}下一擊`
      : `防禦已準備，${encounter.name}下一擊減少 ${task.action.defense} 傷害`;
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
  if (part.destroyed) return { hit: false, damage: 0, effect: "目標部位已破壞" };
  if (action.uses !== undefined) {
    state.actionUses[action.id] -= 1;
    if (action.lootId) carriedLoot[action.lootId] -= 1;
    if (action.inventoryId) {
      action.uses = state.actionUses[action.id];
      AdventureState.consume(AdventureState.load(), action.inventoryId);
    }
  }
  part.revealed = true;
  const hitChance = action.accuracy * part.accuracy / 100;
  const hit = Math.random() * 100 < hitChance;
  if (!hit) {
    showDamage("失誤", part);
    return { hit, damage: 0 };
  }

  const damage = Math.round(action.damage * part.multiplier / 100);
  const outcome = applyPartDamage(part, damage);
  animateMonster("hit");
  showDamage(damage, part, { effect: outcome.effect, destroyed: outcome.destroyed });
  return { hit, damage, effect: outcome.effect };
}

function resolveMonsterAction() {
  const action = state.currentMonsterAction;
  const target = state.monsterTarget;
  const targetName = target === "player" ? "scozirge" : "Morrow";
  const defense = target === "player" ? state.preparedDefense : state.allyPreparedDefense;
  const hit = Math.random() * 100 < action.accuracy;
  let damage = hit ? action.damage : 0;
  let result = hit
    ? `${action.name}對${targetName}造成 ${damage} 傷害`
    : `${action.name}沒有命中${targetName}`;

  if (hit && defense?.type === "dodge") {
    damage = 0;
    result = `${targetName}閃避成功，完全避開${action.name}`;
  } else if (hit && defense?.type === "defend") {
    damage = Math.max(0, damage - defense.defense);
    result = `${targetName}防禦成功，${action.name}只造成 ${damage} 傷害`;
  }

  state.preparedDefense = null;
  state.allyPreparedDefense = null;
  state.waitingForMonster = false;
  state.allyWaitingForMonster = false;
  elements.allyCard.classList.remove("guarding");
  if (hit) {
    takeActorDamage(target, damage);
  } else {
    animateMonster("attack");
    showActorEffect(target, "落空");
  }
  addLog(`<strong>${encounter.name}行動 ${state.monsterTurn}</strong>　${result}。`);
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

  if (elements.monsterArt.classList.contains("hit")) {
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

function renderDamageOverlays() {
  elements.monsterArt.querySelectorAll(".damage-overlay").forEach((layer) => layer.remove());
  regions.filter((region) => region.damageImage).forEach((region) => {
    const part = state.parts.find((item) => item.id === region.id);
    const layer = document.createElement("img");
    layer.className = "damage-overlay";
    layer.src = region.damageImage;
    layer.alt = "";
    layer.dataset.part = region.id;
    if (region.damageElementId) layer.id = region.damageElementId;
    if (part?.destroyed) layer.classList.add("visible");
    elements.monsterArt.append(layer);
  });
}

function renderParts() {
  const action = actions.find((item) => item.id === state.selectedAction);
  const choosingAttack = action?.type === "attack";
  const interactive = choosingAttack && !state.playerTask;
  renderDamageOverlays();
  elements.partGrid.classList.toggle("locked", !interactive);
  elements.partOverlays.classList.toggle("locked", !choosingAttack);
  const overlays = [];
  const zones = state.parts.map((part) => {
    const overlay = document.createElement("img");
    overlay.className = "hit-overlay";
    overlay.dataset.part = part.id;
    overlay.src = part.hitOverlayImage ?? encounter.art;
    overlay.alt = "";
    if (part.hitOverlayClip) {
      overlay.style.clipPath = part.hitOverlayClip;
      overlay.classList.add("clipped");
    }
    if (state.selectedPart === part.id) overlay.classList.add("selected");
    if (part.destroyed) overlay.classList.add("destroyed");
    overlays.push(overlay);

    const zone = document.createElementNS("http://www.w3.org/2000/svg", "path");
    zone.classList.add("hit-zone");
    zone.dataset.part = part.id;
    zone.setAttribute("d", hitZonePaths[part.id]);
    zone.setAttribute("fill-rule", isPainPriestEncounter && part.id === "right_hand" ? "evenodd" : "nonzero");
    zone.setAttribute("role", "option");
    zone.setAttribute("tabindex", !interactive || !state.active || part.destroyed ? "-1" : "0");
    zone.setAttribute("aria-selected", String(state.selectedPart === part.id));
    zone.setAttribute("aria-disabled", String(part.destroyed));
    zone.setAttribute("aria-label", `${part.name}，快捷鍵 ${partKeys[part.id]}`);
    if (state.selectedPart === part.id) zone.classList.add("selected");
    if (part.revealed) zone.classList.add("revealed");
    if (part.destroyed) zone.classList.add("destroyed");
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
  appendPartCallout(part, part.destroyed);
}

function appendPartCallout(part, destroyed) {
  const layout = calloutLayouts[part.id];
  const accuracy = part.revealed ? `${part.accuracy}%` : "?";
  const multiplier = part.revealed ? `${part.multiplier}%` : "?";
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("part-callout");
  if (destroyed) group.classList.add("destroyed");
  group.innerHTML = destroyed
    ? `<path d="${layout.path}"></path><circle cx="${layout.anchor[0]}" cy="${layout.anchor[1]}" r="6"></circle><text x="${layout.x}" y="${layout.y}"><tspan x="${layout.x}">${part.name}：已破壞</tspan></text>`
    : `<path d="${layout.path}"></path><circle cx="${layout.anchor[0]}" cy="${layout.anchor[1]}" r="6"></circle><text x="${layout.x}" y="${layout.y}"><tspan x="${layout.x}">命中：${accuracy}</tspan><tspan x="${layout.x}" dy="${encounter.calloutLineHeight}">傷害：${multiplier}</tspan></text>`;
  elements.partCallouts.append(group);

  // Callout copy is dynamic, so use the rendered SVG bounds instead of
  // assuming that a hand-authored path or text position will always fit.
  const [viewX, viewY, viewWidth, viewHeight] = elements.partCallouts
    .getAttribute("viewBox").split(/\s+/).map(Number);
  const padding = encounter.calloutSafePadding ?? 24;
  const bounds = group.getBBox();
  let dx = 0;
  let dy = 0;
  if (bounds.x < viewX + padding) dx = viewX + padding - bounds.x;
  if (bounds.x + bounds.width + dx > viewX + viewWidth - padding) {
    dx += viewX + viewWidth - padding - (bounds.x + bounds.width + dx);
  }
  if (bounds.y < viewY + padding) dy = viewY + padding - bounds.y;
  if (bounds.y + bounds.height + dy > viewY + viewHeight - padding) {
    dy += viewY + viewHeight - padding - (bounds.y + bounds.height + dy);
  }
  group.dataset.safePadding = String(padding);
  group.dataset.boundsAdjusted = String(Boolean(dx || dy));
  group.dataset.bounds = [bounds.x + dx, bounds.y + dy, bounds.width, bounds.height].join(",");
  if (dx || dy) group.setAttribute("transform", `translate(${dx} ${dy})`);
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

function showDamage(value, part, { source = "", effect = "", destroyed = false } = {}) {
  const [x, y] = hitFeedbackPositions[part?.id] ?? [50, 45];
  const damage = document.createElement("strong");
  damage.textContent = typeof value === "number" ? `−${value}` : value;
  const details = document.createElement("span");
  details.textContent = destroyed ? "部位破壞" : effect;
  details.className = destroyed ? "part-break-label" : "damage-effect";
  elements.damageNumber.style.setProperty("--feedback-x", `${x}%`);
  elements.damageNumber.style.setProperty("--feedback-y", `${y}%`);
  elements.damageNumber.classList.remove("show", "destroyed");
  elements.damageNumber.replaceChildren(
    ...(source ? [Object.assign(document.createElement("small"), { textContent: source })] : []),
    damage,
    ...(details.textContent ? [details] : []),
  );
  elements.damageNumber.classList.toggle("destroyed", destroyed);
  void elements.damageNumber.offsetWidth;
  elements.damageNumber.classList.add("show");
}

function animateMonster(className) {
  elements.monsterArt.classList.remove("hit", "attack");
  void elements.monsterArt.offsetWidth;
  elements.monsterArt.classList.add(className);
  setTimeout(() => elements.monsterArt.classList.remove(className), 360);
}

function openLoot() {
  state.lootActive = true;
  state.lootResolved = false;
  state.lootResults = {};
  state.lootDeadline = performance.now() + 15000;
  elements.lootSummary.textContent = "把戰利品放進背包便立即取得。";
  elements.lootContinue.hidden = true;
  elements.lootModal.classList.add("open");
  lootDistributionUi ??= InventoryDistribution.create({
    root: elements.lootGrid,
    assetBase: "../shared-assets",
    rootPath: "..",
    playerPortrait: "assets/scozirge-portrait.webp",
    allyPortrait: "assets/survivor.webp",
    onPlayerClaim: (item) => registerLootClaim(item, "player"),
    onAllyClaim: (item) => registerLootClaim(item, "ally"),
    onPlayerOffer: registerLootOffer,
  });
  const adventure = AdventureState.load();
  currentLootPool = [
    ...adventure.pendingLoot.map((item) => ({ ...item, sourceType: "search" })),
    ...lootItems.map((item) => ({ ...item, quantity: 1, sourceType: "monster" })),
  ];
  lootDistributionUi.open({ loot: currentLootPool, inventory: adventure.inventory });
  lootClaimTimers.forEach(clearTimeout);
  lootClaimTimers = [];
  if (state.allyHealth > 0) {
    currentLootPool.forEach((item) => {
      if (Math.random() >= .6) return;
      lootClaimTimers.push(setTimeout(() => {
        if (state.lootActive && !state.lootResolved) lootDistributionUi.claimByAlly(lootKey(item));
      }, randomLootClaimDelay()));
    });
  }
  updateLootTimer();
  clearInterval(lootTimerId);
  lootTimerId = setInterval(updateLootTimer, 50);
}

function registerLootClaim(item, winner) {
  const key = lootKey(item);
  if (!state.lootActive || state.lootResolved) return;
  state.lootResults[key] = winner;
  if (carriedLoot[item.id] !== undefined) carriedLoot[item.id] = winner === "player" ? 1 : 0;
  const received = currentLootPool.filter((entry) => state.lootResults[lootKey(entry)] === "player");
  const takenByAlly = currentLootPool.filter((entry) => state.lootResults[lootKey(entry)] === "ally");
  elements.lootSummary.textContent = `你：${received.length ? received.map((entry) => entry.name).join("、") : "尚未取得"}　Morrow：${takenByAlly.length ? takenByAlly.map((entry) => entry.name).join("、") : "尚未取得"}`;
}

function registerLootOffer(item) {
  if (!state.lootActive || state.lootResolved) return;
  const key = lootKey(item);
  delete state.lootResults[key];
  if (!currentLootPool.some((entry) => lootKey(entry) === key)) {
    currentLootPool.push({ ...item });
  }
  if (state.allyHealth > 0 && Math.random() < .6) {
    lootClaimTimers.push(setTimeout(() => {
      if (state.lootActive && !state.lootResolved) lootDistributionUi.claimByAlly(key);
    }, randomLootClaimDelay()));
  }
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
  lootClaimTimers.forEach(clearTimeout);
  lootClaimTimers = [];
  lootDistributionUi.finish().forEach((item) => { state.lootResults[lootKey(item)] = null; });
  state.lootResolved = true;
  state.lootActive = false;

  const received = currentLootPool.filter((item) => state.lootResults[lootKey(item)] === "player");
  elements.lootTimerText.textContent = "0.0";
  elements.lootTimerBar.style.width = "0%";
  elements.lootSummary.textContent = received.length
    ? `你取得：${received.map((item) => item.name).join("、")}。`
    : "你沒有取得任何戰利品。";
  elements.lootContinue.hidden = false;
}

function finishAdventureCombat() {
  const adventure = AdventureState.load();
  adventure.playerHealth = state.playerHealth;
  if (lootDistributionUi) {
    adventure.inventory = lootDistributionUi.getInventory().map(normalizeBattleInventory);
  }
  adventure.pendingLoot = [];
  adventure.completedEvents += 1;
  adventure.eventCycle += 1;
  adventure.encounterTier = null;
  adventure.lastResult = `戰鬥勝利，生命剩餘 ${state.playerHealth}`;
  if (adventure.chapterSearchCombat) {
    adventure.chapterSearchCombat = false;
    const next = AdventureState.advanceNode(adventure);
    location.href = AdventureState.eventPath(next.currentEvent, true);
  } else if (adventure.chapterStoryCombat) {
    adventure.chapterStoryCombat = false;
    const next = AdventureState.advanceNode(adventure);
    location.href = AdventureState.eventPath(next.currentEvent, true);
  } else if (AdventureState.currentNode(adventure)?.type === "monster") {
    const next = AdventureState.advanceNode(adventure);
    location.href = AdventureState.eventPath(next.currentEvent, true);
  } else {
    adventure.currentEvent = "safezone";
    adventure.hideoutRestClaimed = false;
    adventure.hideoutTradeCompleted = false;
    adventure.safeZoneChoice = null;
    adventure.safeZoneEndsAt = null;
    AdventureState.save(adventure);
    location.href = "../index.html";
  }
}

function normalizeBattleInventory(item) {
  if (item.id === "meat") return {
    id: "monster_meat", name: item.name, quantity: item.quantity, rarity: "uncommon",
    category: "food", heal: 24, usableIn: ["rest"], stat: item.stat,
  };
  if (item.id === "claw") return {
    id: "demon_claw", name: item.name, quantity: item.quantity, rarity: "uncommon",
    category: "weapon", damage: 42, accuracy: 75, duration: 5,
    combatImage: "loot-demon-claw.svg", usableIn: ["combat"], stat: item.stat,
  };
  if (item.id === "head") return {
    id: "demon_head", name: item.name, quantity: item.quantity, rarity: "rare",
    category: "valuable", stat: item.stat,
  };
  return item;
}

function finishGame(victory) {
  state.active = false;
  clearInterval(timerId);
  if (victory) {
    const adventure = AdventureState.load();
    const hasLoot = lootItems.length > 0 || adventure.pendingLoot.length > 0;
    setTimeout(hasLoot ? openLoot : finishAdventureCombat, 450);
    return;
  }
  const known = state.parts.filter((part) => part.revealed).length;
  elements.modalEyebrow.textContent = "遠征失敗";
  elements.modalTitle.textContent = "情報沒能救下你";
  elements.modalBody.textContent = `你撐過 ${state.monsterTurn} 次${encounter.name}行動，與 Morrow 識破 ${known}/${state.parts.length} 個部位。`;
  elements.start.textContent = `再次挑戰${encounter.name}`;
  setTimeout(() => elements.modal.classList.add("open"), 650);
}

elements.start.addEventListener("click", startGame);
elements.lootContinue.addEventListener("click", finishAdventureCombat);
enableActionTray();
document.addEventListener("keydown", (event) => {
  if (elements.modal.classList.contains("open") && event.key === "Enter") {
    startGame();
    return;
  }

  const actionIndex = Number(event.key) - 1;
  if (actionIndex >= 0 && actionIndex < actions.length) selectAction(actions[actionIndex].id);
  const partId = Object.entries(partKeys)
    .find(([, key]) => key.toLowerCase() === event.key.toLowerCase())?.[0];
  if (partId && state.parts.some((part) => part.id === partId)) selectPart(partId);
});

configureEncounterView();
resetState();
updateView();
