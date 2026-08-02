(() => {
  "use strict";

  const state = AdventureState.load();
  const nodes = AdventureState.chapterNodes();
  const current = Math.min(state.currentNodeIndex || 0, nodes.length);
  const scouting = Number(state.scoutingAbility) || 0;
  const visibleAhead = Math.min(5, 2 + Math.floor(Math.max(0, scouting - 80) / 20));
  const labels = {
    "story-major": ["關鍵事件", "◆", "關鍵事件"],
    "story-minor": ["事件", "◇", "事件"],
    monster: ["怪物", "✦", "怪物"],
    safezone: ["安全區", "▰", "搜索或休息"],
  };
  const route = document.createElement("section");
  route.className = "chapter-route";
  route.setAttribute("aria-label", "本節劇本路線");
  route.innerHTML = `
    <header>
      <div><small>CHAPTER ROUTE</small><strong>第一節 · 黑霧來客</strong></div>
      <span>搜查能力 ${scouting} · 可預見後續 ${visibleAhead} 個節點</span>
    </header>
    <div class="chapter-route-scroll"><ol></ol></div>
    <footer><span>◆ 關鍵事件</span><span>◇ 事件</span><span>✦ 怪物</span><span>▰ 安全區</span></footer>
  `;
  const list = route.querySelector("ol");
  nodes.forEach((node, index) => {
    const hidden = current < nodes.length && index > current + visibleAhead;
    const completed = index < current;
    const active = index === current;
    const [label, icon, detail] = labels[node.type];
    const item = document.createElement("li");
    item.className = `${hidden ? "unknown" : node.type}${completed ? " completed" : ""}${active ? " active" : ""}`;
    item.setAttribute("aria-current", active ? "step" : "false");
    item.innerHTML = hidden
      ? `<i>?</i><strong>?</strong><span>尚未探明</span>`
      : `<i>${completed ? "✓" : icon}</i><strong>${label}</strong><span>${completed ? "已完成" : detail}</span>`;
    list.append(item);
  });
  const main = document.querySelector("main");
  const header = main?.querySelector(":scope > header");
  if (main) header ? header.after(route) : main.prepend(route);
  requestAnimationFrame(() => {
    const scroll = route.querySelector(".chapter-route-scroll");
    const active = route.querySelector(".active");
    if (scroll && active) scroll.scrollLeft = active.offsetLeft - scroll.clientWidth / 2 + active.clientWidth / 2;
  });
})();
