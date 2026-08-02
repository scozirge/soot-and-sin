(() => {
  "use strict";

  const VOTE_DURATION = 5000;
  const REST_DURATION = 30000;
  const elements = {
    voteModal: document.querySelector("#safeVoteModal"),
    voteTimer: document.querySelector("#safeVoteTimer"),
    voteBar: document.querySelector("#safeVoteBar"),
    playerVote: document.querySelector("#safePlayerVote"),
    allyVote: document.querySelector("#safeAllyVote"),
    voteButtons: [...document.querySelectorAll("[data-safe-vote]")],
    title: document.querySelector("#safeZoneTitle"),
    description: document.querySelector("#safeZoneDescription"),
    invite: document.querySelector("#tradeInviteButton"),
    restControls: document.querySelector("#restControls"),
    restCountdown: document.querySelector("#restCountdown"),
    playerEnd: document.querySelector("#playerEndRest"),
    allyEnd: document.querySelector("#allyEndRest"),
    tradeEvent: document.querySelector("#tradeEvent"),
    requestModal: document.querySelector("#tradeRequestModal"),
    requestStatus: document.querySelector("#tradeRequestStatus"),
    search: document.querySelector("#startSearch"),
  };
  let playerVote = null;
  let allyVote = null;
  let voteTimerId;
  let restTimerId;
  let allyEndTimerId;
  let tradeRequestTimerId;
  let restEnded = { player: false, ally: false };

  function label(choice) { return choice === "rest" ? "休息" : "搜索"; }

  function beginVote() {
    const deadline = performance.now() + VOTE_DURATION;
    elements.voteModal.hidden = false;
    elements.title.textContent = "等待隊伍投票";
    elements.description.textContent = "5 秒內決定要休息，還是搜索安全區。";
    setTimeout(() => {
      allyVote = Math.random() < .5 ? "rest" : "search";
      elements.allyVote.textContent = label(allyVote);
    }, 1000 + Math.random() * 1800);
    voteTimerId = setInterval(() => {
      const remaining = Math.max(0, deadline - performance.now());
      elements.voteTimer.textContent = String(Math.ceil(remaining / 1000));
      elements.voteBar.style.transform = `scaleX(${remaining / VOTE_DURATION})`;
      if (!remaining) resolveVote();
    }, 50);
  }

  function chooseVote(choice) {
    if (playerVote) return;
    playerVote = choice;
    elements.playerVote.textContent = label(choice);
    elements.voteButtons.forEach((button) => {
      button.disabled = true;
      button.classList.toggle("selected", button.dataset.safeVote === choice);
    });
  }

  function resolveVote() {
    clearInterval(voteTimerId);
    allyVote ||= Math.random() < .5 ? "rest" : "search";
    const votes = [playerVote, allyVote].filter(Boolean);
    const restVotes = votes.filter((vote) => vote === "rest").length;
    const searchVotes = votes.filter((vote) => vote === "search").length;
    const result = restVotes === searchVotes ? (Math.random() < .5 ? "rest" : "search") : restVotes > searchVotes ? "rest" : "search";
    elements.allyVote.textContent = label(allyVote);
    elements.voteModal.hidden = true;
    const session = AdventureState.load();
    session.safeZoneChoice = result;
    if (result === "rest") {
      session.safeZoneEndsAt = Date.now() + REST_DURATION;
      AdventureState.save(session);
      startRest();
    } else {
      session.currentEvent = "search";
      AdventureState.save(session);
      location.href = "search/index.html";
    }
  }

  function startRest() {
    const session = AdventureState.load();
    if (!session.hideoutRestClaimed) {
      const healed = Math.min(Math.round(session.maxHealth * .1), session.maxHealth - session.playerHealth);
      session.playerHealth += healed;
      session.hideoutRestClaimed = true;
      session.lastResult = `抵達安全區，恢復 ${healed} 生命`;
    }
    session.safeZoneEndsAt ||= Date.now() + REST_DURATION;
    AdventureState.save(session);
    dispatchEvent(new CustomEvent("hideout-inventory-changed"));
    elements.title.textContent = "隊伍正在休息";
    elements.description.textContent = "恢復 10% 生命；可邀請隊友交易，或全員提前結束休息。";
    elements.invite.disabled = false;
    elements.restControls.hidden = false;
    allyEndTimerId = setTimeout(() => endRest("ally", true), 2500 + Math.random() * 7500);
    tickRest();
    restTimerId = setInterval(tickRest, 100);
  }

  function tickRest() {
    const remaining = Math.max(0, (AdventureState.load().safeZoneEndsAt || 0) - Date.now());
    elements.restCountdown.textContent = String(Math.ceil(remaining / 1000));
    if (!remaining) finishRest();
  }

  function endRest(owner, value = !restEnded[owner]) {
    restEnded[owner] = value;
    const button = elements[`${owner}End`];
    button.setAttribute("aria-pressed", String(restEnded[owner]));
    button.textContent = restEnded[owner]
      ? `${owner === "player" ? "我方" : "Morrow"}等待結束`
      : `${owner === "player" ? "我方結束休息" : "Morrow 尚未結束"}`;
    if (restEnded.player && restEnded.ally) finishRest();
  }

  function finishRest() {
    clearInterval(restTimerId);
    clearTimeout(allyEndTimerId);
    const session = AdventureState.load();
    session.safeZoneEndsAt = null;
    session.lastResult = "隊伍結束安全區休息";
    const node = AdventureState.currentNode(session);
    if (node?.type === "safezone") {
      session.completedEvents += 1;
      const next = AdventureState.advanceNode(session);
      location.href = AdventureState.eventPath(next.currentEvent);
    } else {
      session.currentEvent = "combat";
      AdventureState.save(session);
      location.href = "battle/index.html";
    }
  }

  function openTradeRequest() {
    if (elements.invite.disabled) return;
    elements.invite.disabled = true;
    elements.requestStatus.textContent = "等待對方回覆……";
    elements.requestModal.hidden = false;
    tradeRequestTimerId = setTimeout(acceptTrade, 650 + Math.random() * 650);
  }
  function acceptTrade() {
    clearTimeout(tradeRequestTimerId);
    elements.requestStatus.textContent = "Morrow 已接受交易";
    elements.requestModal.hidden = true;
    elements.tradeEvent.hidden = false;
    elements.tradeEvent.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  elements.voteButtons.forEach((button) => button.addEventListener("click", () => chooseVote(button.dataset.safeVote)));
  elements.playerEnd.addEventListener("click", () => endRest("player"));
  elements.invite.addEventListener("click", openTradeRequest);
  addEventListener("hideout-trade-cancelled", () => {
    elements.tradeEvent.hidden = true;
    elements.invite.disabled = false;
  });

  const session = AdventureState.load();
  if (session.safeZoneChoice === "rest") {
    elements.voteModal.hidden = true;
    startRest();
  } else if (session.currentEvent !== "search" && session.currentEvent !== "combat") {
    beginVote();
  }
})();
