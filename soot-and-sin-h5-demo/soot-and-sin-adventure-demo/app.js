"use strict";

let adventure = AdventureState.load();
const healthText = document.querySelector("#healthText");
const healthBar = document.querySelector("#healthBar");
const inventoryGrid = document.querySelector("#inventoryGrid");
const lastResult = document.querySelector("#lastResult");
const restButton = document.querySelector("#restButton");
const restResult = document.querySelector("#restResult");

function render() {
  healthText.textContent = `${adventure.playerHealth} / ${adventure.maxHealth}`;
  healthBar.style.width = `${adventure.playerHealth / adventure.maxHealth * 100}%`;
  lastResult.textContent = adventure.lastResult;
  inventoryGrid.innerHTML = adventure.inventory.length
    ? adventure.inventory.map((item) => {
      const usable = item.usableIn?.includes("rest") && adventure.playerHealth < adventure.maxHealth;
      const phase = item.category === "food"
        ? "僅限安全區"
        : item.category === "medical"
          ? "戰鬥／安全區"
          : item.category === "weapon" ? "戰鬥武器" : "攜帶物";
      return `
        <article class="item-card rarity-${item.rarity || "common"}">
          <div><small>${phase}</small><h3>${item.name}</h3><p>${item.stat || ""}</p></div>
          <strong>×${item.quantity}</strong>
          ${item.usableIn?.includes("rest") ? `<button data-use="${item.id}" ${usable ? "" : "disabled"}>使用</button>` : ""}
        </article>
      `;
    }).join("")
    : '<p class="empty-inventory">沒有攜帶任何物資。</p>';
  const fullHealth = adventure.playerHealth >= adventure.maxHealth;
  restButton.disabled = adventure.hideoutRestClaimed || fullHealth;
  restButton.textContent = adventure.hideoutRestClaimed
    ? "本次已休息"
    : fullHealth ? "生命已滿" : "休息 · 恢復 10%";
}

function useItem(id) {
  const item = adventure.inventory.find((entry) => entry.id === id);
  if (!item?.usableIn?.includes("rest") || adventure.playerHealth >= adventure.maxHealth) return;
  const healed = Math.min(item.heal, adventure.maxHealth - adventure.playerHealth);
  if (!AdventureState.consume(adventure, id)) return;
  adventure.playerHealth += healed;
  adventure.lastResult = `使用${item.name}，恢復 ${healed} 生命`;
  AdventureState.save(adventure);
  render();
  window.dispatchEvent(new CustomEvent("hideout-trade-reset"));
}

inventoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-use]");
  if (button) useItem(button.dataset.use);
});
restButton.addEventListener("click", () => {
  if (adventure.hideoutRestClaimed || adventure.playerHealth >= adventure.maxHealth) return;
  const healed = Math.min(
    Math.round(adventure.maxHealth * .1),
    adventure.maxHealth - adventure.playerHealth,
  );
  adventure.playerHealth += healed;
  adventure.hideoutRestClaimed = true;
  adventure.lastResult = `在安全區休息，恢復 ${healed} 生命`;
  AdventureState.save(adventure);
  restResult.textContent = `+${healed}`;
  render();
});
document.querySelector("#startSearch").addEventListener("click", () => {
  adventure.currentEvent = "search";
  adventure.safeZoneChoice = "search";
  AdventureState.save(adventure);
  location.href = "search/index.html";
});
document.querySelector("#resetAdventure").addEventListener("click", () => {
  adventure = AdventureState.reset();
  location.href = AdventureState.eventPath(adventure.currentEvent);
});

window.addEventListener("hideout-inventory-changed", () => {
  adventure = AdventureState.load();
  render();
});

if (adventure.currentEvent === "search") location.replace("search/index.html");
else if (adventure.currentEvent === "combat") location.replace("battle/index.html");
else if (adventure.currentEvent === "story" || adventure.currentEvent === "complete") location.replace("story/index.html");
else render();
