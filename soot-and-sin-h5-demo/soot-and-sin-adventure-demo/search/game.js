"use strict";

const ENTRY_DURATION = 2700;
const SEARCH_DURATION = 3200;
const DISTRIBUTION_DURATION = 15000;
const TEAM_EXPLORATION = 118;
const FILM_LENGTH = 38;
const FILM_START_INDEX = 3;
const FILM_TARGET_INDEX = 32;
const SAFE_ZONE_SEARCH = AdventureState.load().safeZoneChoice === "search";

if (SAFE_ZONE_SEARCH) {
  document.title = "煤灰與惡 — 安全區搜索";
  document.querySelector(".topbar .eyebrow").textContent = "安全區 · 搜索階段";
  document.querySelector(".event-mark span").textContent = "本次行動";
}

const actors = {
  player: {
    id: "player",
    name: "scozirge",
    exploration: 72,
    portrait: "assets/scozirge-portrait.webp",
  },
  ally: {
    id: "ally",
    name: "Morrow",
    exploration: 46,
    portrait: "assets/survivor.webp",
  },
};

const searchSlides = [
  { id: "monster", name: "怪物", image: "assets/slides/monster.png" },
  { id: "powerful", name: "強大怪物", image: "assets/slides/powerful.png" },
  { id: "apostle", name: "使徒", image: "assets/slides/apostle.png" },
  { id: "supplies", name: "物資", image: "assets/slides/supplies.png" },
  { id: "premium", name: "精品", image: "assets/slides/premium.png" },
  { id: "artifact", name: "神器", image: "assets/slides/artifact.png" },
];

const lootCatalog = [
  { id: "canned_food", name: "密封罐頭", icon: "can", rarity: "common", category: "food", heal: 18, usableIn: ["rest"], stat: "食物 · 休息時恢復 18 生命" },
  { id: "bandage", name: "乾淨繃帶", icon: "bandage", rarity: "common", category: "medical", heal: 12, usableIn: ["combat", "rest"], stat: "醫療 · 恢復 12 生命" },
  { id: "rusted_knife", name: "鏽蝕短刀", icon: "knife", rarity: "common", category: "weapon", damage: 16, accuracy: 88, duration: 3, combatImage: "action-axe.webp", usableIn: ["combat"], stat: "武器 · 傷害 16 · 命中 88%" },
  { id: "hardtack", name: "軍用硬餅", icon: "can", rarity: "uncommon", category: "food", heal: 28, usableIn: ["rest"], stat: "食物 · 休息時恢復 28 生命" },
  { id: "medical_alcohol", name: "醫療酒精", icon: "alcohol", rarity: "uncommon", category: "medical", heal: 18, usableIn: ["combat", "rest"], stat: "醫療 · 恢復 18 生命" },
  { id: "old_revolver", name: "老舊左輪", icon: "pistol", rarity: "uncommon", category: "weapon", damage: 26, accuracy: 82, duration: 4, combatImage: "action-pistol.webp", usableIn: ["combat"], stat: "武器 · 傷害 26 · 命中 82%" },
  { id: "concentrated_ration", name: "濃縮口糧", icon: "can", rarity: "rare", category: "food", heal: 42, usableIn: ["rest"], stat: "食物 · 休息時恢復 42 生命" },
  { id: "adrenaline", name: "腎上腺素針", icon: "syringe", rarity: "rare", category: "medical", heal: 28, usableIn: ["combat", "rest"], stat: "醫療 · 恢復 28 生命" },
  { id: "silver_sabre", name: "銀柄軍刀", icon: "knife", rarity: "rare", category: "weapon", damage: 38, accuracy: 90, duration: 5, combatImage: "action-axe.webp", usableIn: ["combat"], stat: "武器 · 傷害 38 · 命中 90%" },
];

const rarityNames = {
  common: "普通",
  uncommon: "優良",
  rare: "稀有",
};

const elements = {
  eventNumber: document.querySelector("#eventNumber"),
  phaseLabel: document.querySelector("#phaseLabel"),
  roomBoard: document.querySelector("#roomBoard"),
  depthNumber: document.querySelector("#depthNumber"),
  rewardCount: document.querySelector("#rewardCount"),
  successCount: document.querySelector("#successCount"),
  rewardCache: document.querySelector("#rewardCache"),
  entrySequence: document.querySelector("#entrySequence"),
  searchSequence: document.querySelector("#searchSequence"),
  ambientTrack: document.querySelector("#ambientTrack"),
  focusTrack: document.querySelector("#focusTrack"),
  playerCard: document.querySelector("#playerCard"),
  allyCard: document.querySelector("#allyCard"),
  playerStatus: document.querySelector("#playerStatus"),
  allyStatus: document.querySelector("#allyStatus"),
  commandTitle: document.querySelector("#commandTitle"),
  commandDetail: document.querySelector("#commandDetail"),
  voteButton: document.querySelector("#voteButton"),
  successChance: document.querySelector("#successChance"),
  combatChance: document.querySelector("#combatChance"),
  successChanceBar: document.querySelector("#successChanceBar"),
  combatChanceBar: document.querySelector("#combatChanceBar"),
  eventLog: document.querySelector("#eventLog"),
  introModal: document.querySelector("#introModal"),
  introButton: document.querySelector("#introButton"),
  voteModal: document.querySelector("#voteModal"),
  voteTitle: document.querySelector("#voteTitle"),
  voteDepth: document.querySelector("#voteDepth"),
  voteSuccessChance: document.querySelector("#voteSuccessChance"),
  voteCombatChance: document.querySelector("#voteCombatChance"),
  voteSuccessBar: document.querySelector("#voteSuccessBar"),
  voteCombatBar: document.querySelector("#voteCombatBar"),
  voteRiskText: document.querySelector("#voteRiskText"),
  playerBallot: document.querySelector("#playerBallot"),
  allyBallot: document.querySelector("#allyBallot"),
  playerVote: document.querySelector("#playerVote"),
  allyVote: document.querySelector("#allyVote"),
  voteResult: document.querySelector("#voteResult"),
  voteChoices: [...document.querySelectorAll("[data-vote]")],
  continueVoteButton: document.querySelector('[data-vote="continue"]'),
  stopVoteButton: document.querySelector('[data-vote="stop"]'),
  resultModal: document.querySelector("#resultModal"),
  resultCard: document.querySelector("#resultCard"),
  resultEyebrow: document.querySelector("#resultEyebrow"),
  resultIcon: document.querySelector("#resultIcon"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDescription: document.querySelector("#resultDescription"),
  foundItems: document.querySelector("#foundItems"),
  resultCountdown: document.querySelector("#resultCountdown"),
  resultContinueButton: document.querySelector("#resultContinueButton"),
  lootModal: document.querySelector("#lootModal"),
  lootTimerText: document.querySelector("#lootTimerText"),
  lootTimerBar: document.querySelector("#lootTimerBar"),
  lootGrid: document.querySelector("#lootGrid"),
  lootSummary: document.querySelector("#lootSummary"),
  lockButton: document.querySelector("#lockButton"),
  continueButton: document.querySelector("#continueButton"),
  battleModal: document.querySelector("#battleModal"),
  pendingLoot: document.querySelector("#pendingLoot"),
  battleReplayButton: document.querySelector("#battleReplayButton"),
  eventComplete: document.querySelector("#eventComplete"),
  completeTitle: document.querySelector("#completeTitle"),
  completeSummary: document.querySelector("#completeSummary"),
  replayButton: document.querySelector("#replayButton"),
};

let eventIndex = 1;
let state;
let lootInterval;
let distributionUi;
let searchAnimations = [];
let scheduled = [];
let completionPath = "../battle/index.html";

function createState() {
  return {
    phase: "ready",
    depth: 0,
    successes: 0,
    loot: [],
    lastOutcome: null,
    playerVote: null,
    allyVote: null,
    results: [],
    allyReady: false,
    lastSearchSlide: null,
  };
}

function schedule(callback, delay) {
  const id = setTimeout(callback, delay);
  scheduled.push(id);
  return id;
}

function randomClaimDelay() { return 1000 + Math.random() * 4000; }

function clearScheduled() {
  scheduled.forEach(clearTimeout);
  scheduled = [];
  clearInterval(lootInterval);
  searchAnimations.forEach((animation) => animation.cancel());
  searchAnimations = [];
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getChances(depth = state.depth + 1) {
  const combat = Math.round(clamp(
    10 - TEAM_EXPLORATION * .025 + (depth - 1) * 5,
    7,
    45,
  ));
  return { success: 100 - combat, combat };
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function chooseWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  let roll = Math.random() * total;
  for (const [id, value] of entries) {
    roll -= value;
    if (roll < 0) return id;
  }
  return entries.at(-1)[0];
}

function getRewardMix(depth) {
  const artifact = clamp(3 + (depth - 1) * 1.5, 3, 12);
  const premium = clamp(22 + (depth - 1) * 4, 22, 38);
  return { supplies: 100 - premium - artifact, premium, artifact };
}

function getThreatMix(depth) {
  const apostle = clamp(4 + (depth - 1) * 3, 4, 18);
  const powerful = clamp(24 + (depth - 1) * 7, 24, 52);
  return { monster: 100 - powerful - apostle, powerful, apostle };
}

function getFilmWeights(chances, depth) {
  const rewards = getRewardMix(depth);
  const threats = getThreatMix(depth);
  return {
    monster: chances.combat * threats.monster / 100,
    powerful: chances.combat * threats.powerful / 100,
    apostle: chances.combat * threats.apostle / 100,
    supplies: chances.success * rewards.supplies / 100,
    premium: chances.success * rewards.premium / 100,
    artifact: chances.success * rewards.artifact / 100,
  };
}

function selectSearchResult(chances) {
  const outcome = chooseWeighted(chances);
  if (outcome === "success") {
    return { outcome, slideId: chooseWeighted(getRewardMix(state.depth)) };
  }
  if (outcome === "combat") {
    return { outcome, slideId: chooseWeighted(getThreatMix(state.depth)) };
  }
  return { outcome: "success", slideId: chooseWeighted(getRewardMix(state.depth)) };
}

function exactFilmCounts(weights) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const entries = searchSlides.map((slide) => {
    const raw = weights[slide.id] / totalWeight * FILM_LENGTH;
    return {
      id: slide.id,
      count: weights[slide.id] > 0 ? Math.max(1, Math.floor(raw)) : 0,
      remainder: raw - Math.floor(raw),
    };
  });
  let total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const additions = [...entries].sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;
  while (total < FILM_LENGTH) {
    additions[cursor % additions.length].count += 1;
    total += 1;
    cursor += 1;
  }
  while (total > FILM_LENGTH) {
    const removable = [...entries]
      .filter((entry) => entry.count > 1)
      .sort((a, b) => b.count - a.count)[0];
    removable.count -= 1;
    total -= 1;
  }
  return Object.fromEntries(entries.map((entry) => [entry.id, entry.count]));
}

function makeFilmDeck(weights, selectedId) {
  const counts = exactFilmCounts(weights);
  const deck = shuffle(searchSlides.flatMap((slide) =>
    Array.from({ length: counts[slide.id] }, () => slide.id)
  ));
  const selectedIndex = deck.findIndex((id) => id === selectedId);
  [deck[selectedIndex], deck[FILM_TARGET_INDEX]] = [
    deck[FILM_TARGET_INDEX],
    deck[selectedIndex],
  ];
  return deck;
}

function filmCardMarkup(slideId, index) {
  const slide = searchSlides.find((entry) => entry.id === slideId);
  return `
    <article class="search-film-card" data-index="${index}" data-slide="${slide.id}">
      <img src="${slide.image}" alt="" draggable="false">
      <span class="film-shade"></span><strong>${slide.name}</strong>
    </article>
  `;
}

function renderSearchFilm(deck) {
  const markup = deck.map(filmCardMarkup).join("");
  elements.ambientTrack.innerHTML = markup;
  elements.focusTrack.innerHTML = markup;
}

function filmTrackOffset(track, index) {
  const card = track.querySelector(`[data-index="${index}"]`);
  return track.parentElement.clientWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
}

function filmMovementFrames(startX, endX) {
  const distance = endX - startX;
  const at = (progress) => `translate3d(${startX + distance * progress}px, 0, 0)`;
  return [
    { transform: at(0), offset: 0, easing: "linear" },
    {
      transform: at(.32),
      offset: .5 / 3.2,
      easing: "cubic-bezier(.16, .41, .18, 1)",
    },
    { transform: at(1), offset: 1 },
  ];
}

async function startSearchFilm(selectedId, chances) {
  const deck = makeFilmDeck(getFilmWeights(chances, state.depth), selectedId);
  renderSearchFilm(deck);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const startX = filmTrackOffset(elements.focusTrack, FILM_START_INDEX);
  const endX = filmTrackOffset(elements.focusTrack, FILM_TARGET_INDEX);
  const frames = filmMovementFrames(startX, endX);
  elements.ambientTrack.style.transform = `translate3d(${startX}px, 0, 0)`;
  elements.focusTrack.style.transform = `translate3d(${startX}px, 0, 0)`;
  const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 1100
    : SEARCH_DURATION;
  searchAnimations = [elements.ambientTrack, elements.focusTrack].map((track) =>
    track.animate(frames, { duration, fill: "forwards", easing: "linear" })
  );
  let fallbackTimer;
  const animationDone = Promise.all(searchAnimations.map((animation) => animation.finished))
    .catch(() => new Promise(() => {}));
  await Promise.race([
    animationDone,
    new Promise((resolve) => { fallbackTimer = setTimeout(resolve, duration + 400); }),
  ]);
  clearTimeout(fallbackTimer);
  if (state.phase !== "searching") return false;
  searchAnimations.forEach((animation) => {
    try { animation.finish(); } catch { /* 演出失效時仍繼續結算。 */ }
  });
  elements.focusTrack
    .querySelector(`[data-index="${FILM_TARGET_INDEX}"]`)
    ?.classList.add("is-result");
  elements.searchSequence.classList.add("settled");
  elements.searchSequence.dataset.result = selectedId;
  return true;
}

function resetEvent({ openVote = false } = {}) {
  clearScheduled();
  state = createState();
  elements.eventNumber.textContent = String(eventIndex).padStart(2, "0");
  elements.depthNumber.textContent = "0";
  elements.rewardCount.textContent = "0";
  elements.successCount.textContent = "成功 0 次";
  elements.phaseLabel.textContent = "等待投票";
  elements.playerStatus.textContent = "探索 72 · 等待隊伍決定";
  elements.allyStatus.textContent = "探索 46 · 正在評估風險";
  elements.commandTitle.textContent = "決定是否搜索這個房間";
  elements.commandDetail.textContent = `兩人的探索合計為 ${TEAM_EXPLORATION}。`;
  elements.voteButton.disabled = false;
  elements.voteButton.textContent = "進行投票";
  elements.playerCard.className = "actor-card panel";
  elements.allyCard.className = "actor-card panel";
  elements.roomBoard.classList.remove("entering", "searching");
  elements.rewardCache.classList.remove("active");
  elements.entrySequence.hidden = true;
  elements.searchSequence.hidden = true;
  elements.searchSequence.className = "search-sequence";
  delete elements.searchSequence.dataset.result;
  elements.eventComplete.hidden = true;
  elements.lootModal.classList.remove("open");
  elements.voteModal.classList.remove("open");
  elements.resultModal.classList.remove("open");
  elements.resultCountdown.hidden = true;
  elements.resultCountdown.classList.remove("running");
  elements.resultContinueButton.hidden = false;
  elements.battleModal.classList.remove("open");
  elements.continueButton.hidden = true;
  elements.lockButton.hidden = false;
  elements.eventLog.innerHTML = '<li class="quiet">進入一間幾乎被搜刮乾淨的藥房。</li>';
  updateChanceDisplay();
  if (SAFE_ZONE_SEARCH) {
    elements.introModal.classList.remove("open");
    schedule(playEntrance, 250);
  } else if (openVote) schedule(playEntrance, 250);
}

function updateChanceDisplay() {
  const chances = getChances();
  setChanceValues(chances, {
    success: elements.successChance,
    combat: elements.combatChance,
    successBar: elements.successChanceBar,
    combatBar: elements.combatChanceBar,
  });
}

function setChanceValues(chances, targets) {
  targets.success.textContent = `${chances.success}%`;
  targets.combat.textContent = `${chances.combat}%`;
  targets.successBar.style.width = `${chances.success}%`;
  targets.combatBar.style.width = `${chances.combat}%`;
}

function playEntrance() {
  state.phase = "entering";
  elements.phaseLabel.textContent = "進入地點";
  elements.commandTitle.textContent = "隊伍正在進入封鎖藥房";
  elements.commandDetail.textContent = "先確認環境，再決定是否冒險搜索。";
  elements.voteButton.disabled = true;
  elements.voteButton.textContent = "進入中";
  elements.playerStatus.textContent = "走進封鎖區";
  elements.allyStatus.textContent = "守住後方入口";
  elements.playerCard.classList.add("searching");
  elements.allyCard.classList.add("searching");
  elements.roomBoard.classList.add("entering");
  elements.entrySequence.hidden = false;
  addLog("隊伍走進封鎖藥房，入口在身後闔上。");
  schedule(() => {
    elements.entrySequence.hidden = true;
    elements.roomBoard.classList.remove("entering");
    elements.playerCard.classList.remove("searching");
    elements.allyCard.classList.remove("searching");
    elements.playerStatus.textContent = "探索 72 · 等待隊伍決定";
    elements.allyStatus.textContent = "探索 46 · 正在評估風險";
    elements.commandTitle.textContent = "是否搜索這個房間？";
    elements.commandDetail.textContent = "先投票，通過後才會開始搜索。";
    elements.voteButton.disabled = false;
    elements.voteButton.textContent = "進行投票";
    state.phase = "ready";
    if (SAFE_ZONE_SEARCH) beginSearch();
    else openVoteModal();
  }, ENTRY_DURATION);
}

function openVoteModal() {
  if (state.phase !== "ready") return;
  state.phase = "voting";
  const firstSearch = state.depth === 0;
  elements.phaseLabel.textContent = state.depth
    ? `深入 ${state.depth + 1} · 搜索決議`
    : "首次搜索決議";
  elements.voteTitle.textContent = firstSearch
    ? "要進行搜索嗎？"
    : "要繼續深入搜索嗎？";
  elements.continueVoteButton.textContent = firstSearch ? "進行搜索" : "繼續搜索";
  elements.stopVoteButton.textContent = firstSearch ? "離開" : "就此收手";
  state.playerVote = null;
  state.allyVote = null;
  const depth = state.depth + 1;
  const chances = getChances(depth);
  elements.voteDepth.textContent = depth;
  setChanceValues(chances, {
    success: elements.voteSuccessChance,
    combat: elements.voteCombatChance,
    successBar: elements.voteSuccessBar,
    combatBar: elements.voteCombatBar,
  });
  elements.voteRiskText.textContent = state.loot.length
    ? `目前已累積 ${state.loot.length} 組物資；遭遇怪物仍會保留，但必須先完成戰鬥。`
    : "每次都會找到物資或遭遇怪物；越深入，戰鬥機率越高。";
  elements.playerVote.textContent = "等待選擇";
  elements.allyVote.textContent = "尚未投票";
  elements.playerBallot.className = "ballot";
  elements.allyBallot.className = "ballot";
  elements.voteResult.className = "vote-result";
  elements.voteResult.textContent = "";
  elements.voteChoices.forEach((button) => {
    button.disabled = false;
    button.classList.remove("selected");
  });
  elements.voteModal.classList.add("open");
}

function chooseVote(choice) {
  if (state.phase !== "voting" || state.playerVote) return;
  state.playerVote = choice;
  elements.playerVote.textContent = voteText(choice);
  elements.playerBallot.classList.add("revealed", choice);
  elements.voteChoices.forEach((button) => {
    button.disabled = true;
    button.classList.toggle("selected", button.dataset.vote === choice);
  });
  elements.allyVote.textContent = "思考中…";
  elements.allyBallot.classList.add("thinking");
  schedule(revealAllyVote, 700);
}

function revealAllyVote() {
  const chances = getChances();
  const continueChance = clamp(
    .86 - chances.combat * .009 - state.successes * .075 - state.depth * .025,
    .18,
    .8,
  );
  state.allyVote = Math.random() < continueChance ? "continue" : "stop";
  elements.allyVote.textContent = voteText(state.allyVote);
  elements.allyBallot.className = `ballot revealed ${state.allyVote}`;
  schedule(resolveVote, 550);
}

function resolveVote() {
  const continueVotes = [state.playerVote, state.allyVote]
    .filter((vote) => vote === "continue").length;
  let shouldContinue;
  let resultText;
  const firstSearch = state.depth === 0;
  const continueText = firstSearch ? "進行搜索" : "繼續搜索";
  const stopText = firstSearch ? "離開" : "就此收手";
  if (continueVotes === 2) {
    shouldContinue = true;
    resultText = `2：0　隊伍決定${continueText}`;
  } else if (continueVotes === 0) {
    shouldContinue = false;
    resultText = `0：2　隊伍決定${stopText}`;
  } else {
    shouldContinue = Math.random() < .5;
    resultText = `1：1　平票隨機結果：${shouldContinue ? continueText : stopText}`;
  }
  elements.voteResult.className = `vote-result visible ${shouldContinue ? "continue" : "stop"}`;
  elements.voteResult.textContent = resultText;
  addLog(resultText.replace("　", "，"));
  schedule(() => {
    elements.voteModal.classList.remove("open");
    if (shouldContinue) beginSearch();
    else stopSearching();
  }, 1100);
}

function voteText(choice) {
  if (state.depth === 0) return choice === "continue" ? "進行搜索" : "離開";
  return choice === "continue" ? "繼續搜索" : "就此收手";
}

function beginSearch() {
  const chances = getChances();
  state.phase = "searching";
  state.depth += 1;
  const selection = selectSearchResult(chances);
  state.lastSearchSlide = selection.slideId;
  elements.depthNumber.textContent = state.depth;
  elements.phaseLabel.textContent = `深入 ${state.depth}`;
  elements.commandTitle.textContent = "隊伍正在深入搜索";
  elements.commandDetail.textContent = "";
  elements.voteButton.disabled = true;
  elements.voteButton.textContent = "搜索中";
  elements.playerStatus.textContent = "搜索中";
  elements.allyStatus.textContent = "警戒中";
  elements.playerCard.classList.add("searching");
  elements.allyCard.classList.add("searching");
  elements.roomBoard.classList.add("searching");
  elements.searchSequence.hidden = false;
  elements.searchSequence.className = "search-sequence";
  delete elements.searchSequence.dataset.result;
  addLog(`開始第 <strong>${state.depth}</strong> 次深入搜索。`);
  startSearchFilm(selection.slideId, chances).then((finished) => {
    if (finished && state.phase === "searching") resolveSearch(selection);
  });
}

function resolveSearch(selection) {
  schedule(() => {
    elements.searchSequence.hidden = true;
    elements.searchSequence.className = "search-sequence";
    elements.roomBoard.classList.remove("searching");
    elements.playerCard.classList.remove("searching");
    elements.allyCard.classList.remove("searching");
    if (selection.outcome === "success") handleSuccess(selection.slideId);
    else handleCombat(selection.slideId);
  }, 620);
}

function handleSuccess(rewardTier) {
  const rewards = generateRewards(rewardTier);
  const rewardName = searchSlides.find((slide) => slide.id === rewardTier)?.name || "物資";
  state.loot.push(...rewards);
  const totalQuantity = getLootQuantity(state.loot);
  state.successes += 1;
  state.lastOutcome = "success";
  elements.rewardCount.textContent = totalQuantity;
  elements.successCount.textContent = `成功 ${state.successes} 次`;
  elements.rewardCache.classList.add("active");
  elements.phaseLabel.textContent = "結果確認 · 成功";
  elements.commandTitle.textContent = `發現${rewardName}`;
  elements.commandDetail.textContent = "";
  elements.playerStatus.textContent = `累積 ${totalQuantity} 件物資`;
  elements.allyStatus.textContent = "確認收穫";
  addLog(`發現<strong>${rewardName}</strong>，累積至 ${totalQuantity} 件物資。`);
  state.phase = "result";
  schedule(() => showResultModal("success", rewards), 650);
}

function handleCombat(encounterTier) {
  const encounterName = searchSlides.find((slide) => slide.id === encounterTier)?.name || "怪物";
  state.lastOutcome = "combat";
  state.phase = "result";
  elements.phaseLabel.textContent = `遭遇${encounterName}`;
  elements.commandTitle.textContent = "搜索被迫中止";
  elements.commandDetail.textContent = "";
  elements.voteButton.disabled = true;
  elements.voteButton.textContent = "強制戰鬥";
  elements.playerStatus.textContent = "準備迎戰";
  elements.allyStatus.textContent = `發現${encounterName}`;
  elements.playerCard.classList.add("danger");
  elements.allyCard.classList.add("danger");
  addLog(`<strong>${encounterName}出現</strong>，搜索強制中止。`);
  schedule(() => showResultModal("combat"), 650);
}

function prepareNextVote() {
  elements.resultModal.classList.remove("open");
  state.phase = "ready";
  elements.phaseLabel.textContent = "搜索成功";
  elements.commandTitle.textContent = "物資已累積，要繼續深入嗎？";
  elements.commandDetail.textContent = "下一次搜索的戰鬥機率將提高。";
  elements.voteButton.disabled = false;
  elements.voteButton.textContent = "進行投票";
  updateChanceDisplay();
  schedule(openVoteModal, 250);
}

function showResultModal(type, rewards = []) {
  const slideName = searchSlides.find((slide) => slide.id === state.lastSearchSlide)?.name;
  const content = {
    success: {
      eyebrow: `深入 ${state.depth} · 搜索成功`,
      icon: "◆",
      title: `發現${slideName || "物資"}`,
      description: "",
    },
    combat: {
      eyebrow: `深入 ${state.depth} · 強制事件`,
      icon: "!",
      title: `遭遇${slideName || "怪物"}`,
      description: "搜刮立即中止，已累積的物資會保留到戰鬥勝利後。",
      button: "顯示怪物戰鬥事件",
    },
  }[type];
  elements.resultCard.className = `modal-card result-card ${type}`;
  elements.resultEyebrow.textContent = content.eyebrow;
  elements.resultIcon.textContent = content.icon;
  elements.resultTitle.textContent = content.title;
  elements.resultDescription.textContent = content.description;
  elements.foundItems.innerHTML = rewards.map((item, index) => `
    <article class="found-item rarity-${item.rarity}" style="--delay:${index * .14}s">
      <span class="loot-art">
        <svg aria-hidden="true"><use href="#icon-${item.icon}"></use></svg>
      </span>
      <div>
        <small>${rarityNames[item.rarity]} · 深入 ${item.depth}</small>
        <strong>${item.name}</strong>
        <span>${item.stat} · ×${item.quantity}</span>
      </div>
    </article>
  `).join("");
  const autoAdvance = type !== "combat";
  elements.resultCountdown.hidden = !autoAdvance;
  elements.resultContinueButton.hidden = autoAdvance;
  if (!autoAdvance) {
    elements.resultContinueButton.textContent = content.button;
  }
  elements.resultModal.classList.add("open");
  if (autoAdvance) startResultCountdown();
}

function startResultCountdown() {
  elements.resultCountdown.classList.remove("running");
  void elements.resultCountdown.offsetWidth;
  elements.resultCountdown.classList.add("running");
  schedule(() => {
    if (state.phase !== "result") return;
    prepareNextVote();
  }, 3000);
}

function getLootQuantity(items) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

function generateRewards(rewardTier = "supplies") {
  const tierBonus = rewardTier === "artifact" ? 72 : rewardTier === "premium" ? 34 : 0;
  const extraChance = clamp(
    (TEAM_EXPLORATION - 80) * .005 + state.depth * .04 + tierBonus * .003,
    .12,
    .82,
  );
  const minimumCount = rewardTier === "artifact" ? 2 : 1;
  const count = Math.max(minimumCount, Math.random() < extraChance ? 2 : 1);
  return Array.from({ length: count }, (_, index) => {
    const score = Math.random() * 100 + TEAM_EXPLORATION * .28 + state.depth * 10 + tierBonus;
    const rarity = score >= 135 ? "rare" : score >= 88 ? "uncommon" : "common";
    const pool = lootCatalog.filter((item) => item.rarity === rarity);
    const item = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...item,
      instanceId: `depth-${state.depth}-${index}-${Date.now()}`,
      quantity: 1,
      depth: state.depth,
    };
  });
}

function stopSearching() {
  elements.resultModal.classList.remove("open");
  elements.phaseLabel.textContent = "隊伍收手";
  elements.commandTitle.textContent = "搜索已安全結束";
  elements.commandDetail.textContent = state.loot.length
    ? "分配已經找到的物資。"
    : "隊伍沒有帶走任何物資。";
  elements.voteButton.disabled = true;
  elements.voteButton.textContent = "已停止";
  if (state.loot.length) {
    openDistribution();
  } else {
    completeWithoutLoot();
  }
}

function continueFromResult() {
  if (state.phase !== "result") return;
  elements.resultModal.classList.remove("open");
  if (state.lastOutcome === "combat") {
    state.phase = "combat";
    openBattleEvent();
  } else {
    prepareNextVote();
  }
}

function openBattleEvent() {
  const detail = {
    eventType: "combat",
    sourceEvent: "scavenge",
    encounterTier: state.lastSearchSlide,
    depth: state.depth,
    successes: state.successes,
    pendingLoot: state.loot.map((item) => ({ ...item })),
  };
  window.pendingScavengeCombat = detail;
  window.dispatchEvent(new CustomEvent("battle-event-requested", { detail }));
  const adventure = AdventureState.load();
  adventure.lastResult = `搜索深入 ${state.depth} 次，遭遇${searchSlides.find((slide) => slide.id === state.lastSearchSlide)?.name || "怪物"}`;
  adventure.encounterTier = state.lastSearchSlide;
  adventure.currentEvent = "combat";
  adventure.chapterSearchCombat = AdventureState.currentNode(adventure)?.type === "safezone";
  AdventureState.setPending(adventure, detail.pendingLoot);
  elements.pendingLoot.textContent = state.loot.length
    ? summarizeItems(state.loot)
    : "尚未找到物資";
  elements.battleModal.classList.add("open");
}

function openDistribution() {
  state.phase = "distribution";
  state.results = [];
  elements.lootModal.classList.add("open");
  elements.lockButton.hidden = false;
  elements.lockButton.disabled = false;
  elements.lockButton.textContent = "結束搜刮";
  elements.continueButton.hidden = true;
  elements.lootSummary.className = "loot-summary visible";
  elements.lootSummary.textContent = "尚未有人取得物資。";
  elements.lootTimerText.textContent = "15";
  elements.lootTimerBar.style.transform = "scaleX(1)";

  distributionUi ??= InventoryDistribution.create({
    root: elements.lootGrid,
    assetBase: "../shared-assets",
    rootPath: "..",
    playerPortrait: actors.player.portrait,
    allyPortrait: actors.ally.portrait,
    playerName: actors.player.name,
    allyName: actors.ally.name,
    onPlayerClaim: (item) => registerImmediateClaim(item, "player"),
    onAllyClaim: (item) => registerImmediateClaim(item, "ally"),
    onPlayerOffer: registerDistributionOffer,
  });
  distributionUi.open({
    loot: state.loot,
    inventory: AdventureState.load().inventory,
  });

  state.loot.forEach((item) => {
    if (Math.random() >= .6) return;
    schedule(() => {
      if (state.phase === "distribution") distributionUi.claimByAlly(item.instanceId ?? item.id);
    }, randomClaimDelay());
  });
  const deadline = performance.now() + DISTRIBUTION_DURATION;
  lootInterval = setInterval(() => {
    const remaining = Math.max(0, deadline - performance.now());
    elements.lootTimerText.textContent = String(Math.ceil(remaining / 1000));
    elements.lootTimerBar.style.transform = `scaleX(${remaining / DISTRIBUTION_DURATION})`;
    if (remaining <= 0) resolveDistribution();
  }, 50);
}

function registerImmediateClaim(item, winner) {
  if (state.phase !== "distribution") return;
  const claimId = item.instanceId ?? item.claimId ?? item.id;
  const existing = state.results.find((entry) => (entry.instanceId ?? entry.claimId ?? entry.id) === claimId);
  if (existing) existing.winner = winner;
  else state.results.push({ ...item, winner });
  const playerLoot = state.results.filter((entry) => entry.winner === "player");
  const allyLoot = state.results.filter((entry) => entry.winner === "ally");
  elements.lootSummary.className = "loot-summary visible";
  elements.lootSummary.innerHTML = `<strong>scozirge</strong>：${summarizeItems(playerLoot)}　 <strong>Morrow</strong>：${summarizeItems(allyLoot)}`;
}

function registerDistributionOffer(item) {
  if (state.phase !== "distribution") return;
  const claimId = item.instanceId ?? item.claimId ?? item.id;
  const existing = state.results.find((entry) => (entry.instanceId ?? entry.claimId ?? entry.id) === claimId);
  if (existing) existing.winner = null;
  else state.results.push({ ...item, winner: null });
  if (Math.random() < .6) {
    schedule(() => {
      if (state.phase === "distribution") distributionUi.claimByAlly(claimId);
    }, randomClaimDelay());
  }
}

function resolveDistribution() {
  if (state.phase !== "distribution") return;
  clearInterval(lootInterval);
  elements.lootTimerText.textContent = "0";
  elements.lootTimerBar.style.transform = "scaleX(0)";
  const discarded = distributionUi.finish();
  state.phase = "resolved";
  state.results.push(...discarded.map((item) => ({ ...item, winner: null })));
  const playerLoot = state.results.filter((item) => item.winner === "player");
  const allyLoot = state.results.filter((item) => item.winner === "ally");
  elements.lootSummary.className = "loot-summary visible";
  elements.lootSummary.innerHTML = `
    <strong>scozirge</strong>：${summarizeItems(playerLoot)}<br>
    <strong>Morrow</strong>：${summarizeItems(allyLoot)}
    ${discarded.length ? `<br>放棄：${summarizeItems(discarded)}` : ""}
  `;
  elements.lockButton.hidden = true;
  elements.continueButton.hidden = false;
}

function summarizeItems(items) {
  if (!items.length) return "沒有取得物資";
  const totals = new Map();
  items.forEach((item) => {
    totals.set(item.name, (totals.get(item.name) || 0) + item.quantity);
  });
  return [...totals].map(([name, quantity]) => `${name} ×${quantity}`).join("、");
}

function continueEvent() {
  const detail = {
    eventType: "scavenge",
    location: "封鎖藥房",
    depth: state.depth,
    successes: state.successes,
    playerLoot: state.results.filter((item) => item.winner === "player" && item.sourceType !== "inventory"),
    allyLoot: state.results.filter((item) => item.winner === "ally"),
    discarded: state.results.filter((item) => !item.winner),
  };
  window.scavengeEventResult = detail;
  window.dispatchEvent(new CustomEvent("scavenge-complete", { detail }));
  const adventure = AdventureState.load();
  if (distributionUi) adventure.inventory = distributionUi.getInventory();
  else AdventureState.mergeItems(adventure, detail.playerLoot);
  adventure.completedEvents += 1;
  adventure.lastResult = `搜索完成，帶回 ${getLootQuantity(detail.playerLoot)} 件物資`;
  if (AdventureState.currentNode(adventure)?.type === "safezone") {
    const next = AdventureState.advanceNode(adventure);
    completionPath = AdventureState.eventPath(next.currentEvent, true);
  } else {
    adventure.currentEvent = "combat";
    AdventureState.save(adventure);
  }
  elements.lootModal.classList.remove("open");
  showCompletion(
    "物資已帶離現場",
    `scozirge 帶走：${summarizeItems(detail.playerLoot)}`,
  );
}

function completeWithoutLoot() {
  const detail = {
    eventType: "scavenge",
    location: "封鎖藥房",
    depth: state.depth,
    successes: 0,
    playerLoot: [],
    allyLoot: [],
    discarded: [],
  };
  window.scavengeEventResult = detail;
  window.dispatchEvent(new CustomEvent("scavenge-complete", { detail }));
  const adventure = AdventureState.load();
  adventure.completedEvents += 1;
  adventure.lastResult = "離開藥房，沒有進行搜索";
  if (AdventureState.currentNode(adventure)?.type === "safezone") {
    const next = AdventureState.advanceNode(adventure);
    completionPath = AdventureState.eventPath(next.currentEvent, true);
  } else {
    adventure.currentEvent = "combat";
    AdventureState.save(adventure);
  }
  showCompletion("隊伍離開藥房", "沒有進行搜索，也沒有取得物資。");
}

function showCompletion(title, summary) {
  state.phase = "complete";
  elements.completeTitle.textContent = title;
  elements.completeSummary.textContent = summary;
  elements.eventComplete.hidden = false;
  elements.phaseLabel.textContent = "事件完成";
  elements.commandTitle.textContent = "搜刮事件已結算";
  elements.commandDetail.textContent = "已產生可傳給下一事件的結果資料。";
  elements.voteButton.disabled = true;
  elements.voteButton.textContent = "已完成";
  elements.replayButton.textContent = completionPath === "../battle/index.html" ? "前往戰鬥事件" : "前往下一個節點";
}

function addLog(message) {
  const item = document.createElement("li");
  item.innerHTML = message;
  elements.eventLog.prepend(item);
  while (elements.eventLog.children.length > 7) {
    elements.eventLog.lastElementChild.remove();
  }
}

elements.introButton.addEventListener("click", () => {
  elements.introModal.classList.remove("open");
  playEntrance();
});
elements.voteButton.addEventListener("click", openVoteModal);
elements.voteChoices.forEach((button) => {
  button.addEventListener("click", () => chooseVote(button.dataset.vote));
});
elements.resultContinueButton.addEventListener("click", continueFromResult);
elements.lockButton.addEventListener("click", resolveDistribution);
elements.continueButton.addEventListener("click", continueEvent);
elements.replayButton.addEventListener("click", () => { location.href = completionPath; });
elements.battleReplayButton.addEventListener("click", () => { location.href = "../battle/index.html"; });

resetEvent();
