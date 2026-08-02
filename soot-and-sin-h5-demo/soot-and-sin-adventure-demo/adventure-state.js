"use strict";

window.AdventureState = (() => {
  const PREFIX = "SOOT_AND_SIN_ADVENTURE:";
  const MAX_HEALTH = 72;
  const CHAPTER_NODES = [
    { id: "pain_priest", type: "story-major", name: "苦痛祭司" },
    { id: "mist_hound", type: "monster", name: "黑霧獵犬" },
    { id: "silent_tram", type: "story-minor", name: "無聲電車" },
    { id: "boiler_shelter", type: "safezone", name: "鍋爐藏身處" },
    { id: "borrowed_face", type: "story-minor", name: "借來的臉" },
    { id: "iron_crawler", type: "monster", name: "鐵骨爬行者" },
    { id: "bell_toll", type: "story-minor", name: "收鐘人" },
    { id: "choir_beast", type: "monster", name: "合唱獸" },
    { id: "chapel_shelter", type: "safezone", name: "封鎖禮拜堂" },
    { id: "ash_trial", type: "story-minor", name: "煤灰審判" },
    { id: "family_ledger", type: "story-major", name: "家族名冊" },
    { id: "apostle", type: "monster", name: "無面使徒" },
  ];

  const starterItems = [
    {
      id: "bandage",
      name: "乾淨繃帶",
      category: "medical",
      heal: 12,
      usableIn: ["combat", "rest"],
      quantity: 2,
      rarity: "common",
      stat: "醫療 · 恢復 12 生命",
    },
    {
      id: "canned_food",
      name: "密封罐頭",
      category: "food",
      heal: 18,
      usableIn: ["rest"],
      quantity: 1,
      rarity: "common",
      stat: "食物 · 休息時恢復 18 生命",
    },
  ];

  function fresh() {
    return {
      version: 2,
      maxHealth: MAX_HEALTH,
      playerHealth: MAX_HEALTH,
      sanity: 100,
      inventory: starterItems.map((item) => ({ ...item })),
      pendingLoot: [],
      completedEvents: 0,
      currentEvent: "story",
      currentNodeIndex: 0,
      scoutingAbility: 72,
      eventCycle: 1,
      hideoutRestClaimed: false,
      hideoutTradeCompleted: false,
      safeZoneChoice: null,
      safeZoneEndsAt: null,
      chapterSearchCombat: false,
      chapterStoryCombat: false,
      lastResult: "遠征準備完成",
    };
  }

  function load() {
    if (!window.name.startsWith(PREFIX)) return fresh();
    try {
      const saved = JSON.parse(window.name.slice(PREFIX.length));
      return saved.version === 2 ? { ...fresh(), ...saved } : fresh();
    } catch {
      return fresh();
    }
  }

  function save(state) {
    window.name = PREFIX + JSON.stringify(state);
    return state;
  }

  function mergeItems(state, items) {
    items.forEach((item) => {
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const { instanceId, winner, depth, sourceType, claimId, offeredByPlayer, ...storedItem } = item;
      state.inventory.push({ ...storedItem, quantity });
    });
    return save(state);
  }

  function consume(state, id, quantity = 1) {
    const item = state.inventory.find((entry) => entry.id === id);
    if (!item || item.quantity < quantity) return false;
    item.quantity -= quantity;
    state.inventory = state.inventory.filter((entry) => entry.quantity > 0);
    save(state);
    return true;
  }

  function setPending(state, items) {
    state.pendingLoot = items.map((item) => ({ ...item }));
    return save(state);
  }

  function claimPending(state) {
    const pending = state.pendingLoot.map((item) => ({ ...item }));
    state.pendingLoot = [];
    mergeItems(state, pending);
    return pending;
  }

  function reset() {
    return save(fresh());
  }

  function chapterNodes() { return CHAPTER_NODES.map((node) => ({ ...node })); }

  function currentNode(state) {
    return CHAPTER_NODES[state.currentNodeIndex] || null;
  }

  function eventForNode(node) {
    if (!node) return "complete";
    if (node.type === "monster") return "combat";
    if (node.type === "safezone") return "safezone";
    return "story";
  }

  function advanceNode(state) {
    state.currentNodeIndex += 1;
    state.currentEvent = eventForNode(currentNode(state));
    state.safeZoneChoice = null;
    state.safeZoneEndsAt = null;
    state.hideoutRestClaimed = false;
    state.hideoutTradeCompleted = false;
    state.chapterSearchCombat = false;
    state.chapterStoryCombat = false;
    return save(state);
  }

  function eventPath(event, fromNested = false) {
    const root = fromNested ? "../" : "";
    if (event === "combat") return `${root}battle/index.html`;
    if (event === "story" || event === "complete") return `${root}story/index.html`;
    return `${root}index.html`;
  }

  return { load, save, mergeItems, consume, setPending, claimPending, reset, chapterNodes, currentNode, advanceNode, eventPath };
})();
