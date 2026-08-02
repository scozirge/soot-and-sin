const slides = [
  {
    id: "monster",
    name: "怪物",
    tier: "危險遭遇",
    code: "THREAT · I",
    image: "assets/slides/monster-silhouette-v3.png",
  },
  {
    id: "powerful",
    name: "強大怪物",
    tier: "高危遭遇",
    code: "THREAT · II",
    image: "assets/slides/powerful-silhouette-v3.png",
  },
  {
    id: "apostle",
    name: "使徒",
    tier: "災厄遭遇",
    code: "APOSTLE · III",
    image: "assets/slides/apostle-silhouette-v5.png",
  },
  {
    id: "supplies",
    name: "物資",
    tier: "普通收穫",
    code: "CACHE · I",
    image: "assets/slides/supplies-ambiguous-v2.png",
  },
  {
    id: "premium",
    name: "精品",
    tier: "稀有收穫",
    code: "CACHE · II",
    image: "assets/slides/premium-ambiguous-v2.png",
  },
  {
    id: "artifact",
    name: "神器",
    tier: "奇蹟收穫",
    code: "RELIC · Ω",
    image: "assets/slides/artifact-ambiguous-v2.png",
  },
];

const profiles = {
  low: {
    name: "低探索",
    summary: "危險與普通物資占多數，神器只留下極少數底片。",
    weights: { monster: 30, powerful: 15, apostle: 5, supplies: 43, premium: 6, artifact: 1 },
  },
  mid: {
    name: "中探索",
    summary: "精品開始出現在膠卷中，仍可能照見黑霧裡的怪物。",
    weights: { monster: 25, powerful: 13, apostle: 5, supplies: 42, premium: 13, artifact: 2 },
  },
  high: {
    name: "高探索",
    summary: "更多精品與神器被裝入膠卷，但危險從未完全消失。",
    weights: { monster: 19, powerful: 10, apostle: 4, supplies: 39, premium: 23, artifact: 5 },
  },
};

const elements = {
  exploreOptions: document.querySelector("#exploreOptions"),
  resultMode: document.querySelector("#resultMode"),
  playButton: document.querySelector("#playButton"),
  oddsStrip: document.querySelector("#oddsStrip"),
  profileSummary: document.querySelector("#profileSummary"),
  stage: document.querySelector("#stage"),
  ambientTrack: document.querySelector("#ambientTrack"),
  focusTrack: document.querySelector("#focusTrack"),
  phaseText: document.querySelector("#phaseText"),
  resultReveal: document.querySelector("#resultReveal"),
  resultTier: document.querySelector("#resultTier"),
  resultName: document.querySelector("#resultName"),
  resultNote: document.querySelector("#resultNote"),
};

const FILM_LENGTH = 38;
const START_INDEX = 3;
const TARGET_INDEX = 32;
const FULL_DURATION = 3200;

let selectedProfile = "mid";
let animations = [];
let timers = [];
let runId = 0;

function shuffle(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [output[index], output[target]] = [output[target], output[index]];
  }
  return output;
}

function chooseWeighted(weights) {
  const roll = Math.random() * 100;
  let cursor = 0;
  for (const slide of slides) {
    cursor += weights[slide.id];
    if (roll < cursor) return slide.id;
  }
  return slides.at(-1).id;
}

function exactCounts(weights, length) {
  const entries = slides.map((slide) => {
    const raw = (weights[slide.id] / 100) * length;
    return {
      id: slide.id,
      count: Math.max(1, Math.floor(raw)),
      remainder: raw - Math.floor(raw),
    };
  });

  let total = entries.reduce((sum, entry) => sum + entry.count, 0);
  const byRemainder = [...entries].sort((a, b) => b.remainder - a.remainder);
  let cursor = 0;

  while (total < length) {
    byRemainder[cursor % byRemainder.length].count += 1;
    total += 1;
    cursor += 1;
  }

  while (total > length) {
    const removable = [...entries]
      .filter((entry) => entry.count > 1)
      .sort((a, b) => b.count - a.count)[0];
    removable.count -= 1;
    total -= 1;
  }

  return Object.fromEntries(entries.map((entry) => [entry.id, entry.count]));
}

function makeDeck(weights, selectedId) {
  const counts = exactCounts(weights, FILM_LENGTH);
  const deck = shuffle(slides.flatMap((slide) =>
    Array.from({ length: counts[slide.id] }, () => slide.id)
  ));
  const selectedIndex = deck.findIndex((id) => id === selectedId);

  if (selectedIndex === -1) {
    deck[TARGET_INDEX] = selectedId;
  } else {
    [deck[selectedIndex], deck[TARGET_INDEX]] = [deck[TARGET_INDEX], deck[selectedIndex]];
  }

  return { deck, counts };
}

function cardMarkup(slideId, index) {
  const slide = slides.find((entry) => entry.id === slideId);
  const serial = String(index + 1).padStart(2, "0");
  return `
    <article class="film-card" data-index="${index}" data-slide="${slide.id}">
      <img src="${slide.image}" alt="${slide.name}" draggable="false">
      <span class="card-shade"></span>
      <div class="card-meta">
        <span>
          <small>${slide.code}</small>
          <b>${slide.name}</b>
        </span>
        <i>${serial}</i>
      </div>
    </article>
  `;
}

function renderFilm(deck) {
  const markup = deck.map(cardMarkup).join("");
  elements.ambientTrack.innerHTML = markup;
  elements.focusTrack.innerHTML = markup;
}

function renderOdds(profile) {
  elements.profileSummary.textContent = profile.summary;
  elements.oddsStrip.innerHTML = slides.map((slide) => {
    const value = profile.weights[slide.id];
    const showLabel = value >= 5;
    return `
      <span class="odds-segment ${slide.id}" style="width:${value}%"
        title="${slide.name} ${value}%">
        ${showLabel ? `<span>${slide.name} ${value}%</span>` : ""}
      </span>
    `;
  }).join("");
}

function clearRun() {
  runId += 1;
  animations.forEach((animation) => animation.cancel());
  timers.forEach(clearTimeout);
  animations = [];
  timers = [];
}

function later(callback, delay) {
  const timer = setTimeout(callback, delay);
  timers.push(timer);
  return timer;
}

function setPhase(text) {
  elements.phaseText.textContent = text;
}

function trackOffset(track, index) {
  const card = track.querySelector(`[data-index="${index}"]`);
  const railWidth = track.parentElement.clientWidth;
  return (railWidth / 2) - (card.offsetLeft + card.offsetWidth / 2);
}

function movementFrames(startX, endX) {
  const distance = endX - startX;
  const at = (progress) => `translate3d(${startX + distance * progress}px, 0, 0)`;
  return [
    {
      transform: at(0),
      offset: 0,
      easing: "linear",
    },
    {
      transform: at(.32),
      offset: .5 / 3.2,
      easing: "cubic-bezier(.16, .41, .18, 1)",
    },
    {
      transform: at(1),
      offset: 1,
    },
  ];
}

function revealResult(slideId) {
  const slide = slides.find((entry) => entry.id === slideId);
  elements.focusTrack.querySelector(`[data-index="${TARGET_INDEX}"]`)?.classList.add("is-result");
  elements.resultTier.textContent = slide.tier;
  elements.resultName.textContent = slide.name;
  elements.resultNote.textContent = "中央幻燈片已鎖定";
  elements.resultReveal.hidden = false;
  requestAnimationFrame(() => elements.resultReveal.classList.add("visible"));
  elements.stage.classList.remove("stage-running");
  elements.stage.classList.add("stage-settled");
  setPhase("膠卷停止 · 判定完成");
  elements.playButton.disabled = false;
  elements.playButton.querySelector("small").textContent = "再次轉動";
  elements.playButton.querySelector("b").textContent = "重新判定";
}

async function playFilm() {
  clearRun();
  const currentRun = runId;
  const profile = profiles[selectedProfile];
  const forced = elements.resultMode.value;
  const selectedId = forced === "random" ? chooseWeighted(profile.weights) : forced;
  const { deck } = makeDeck(profile.weights, selectedId);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 1200 : FULL_DURATION;

  elements.playButton.disabled = true;
  elements.resultReveal.classList.remove("visible");
  elements.resultReveal.hidden = true;
  elements.stage.classList.remove("stage-settled");
  elements.stage.classList.add("stage-running");
  setPhase("膠卷高速轉動");
  renderFilm(deck);

  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (currentRun !== runId) return;

  const startX = trackOffset(elements.focusTrack, START_INDEX);
  const endX = trackOffset(elements.focusTrack, TARGET_INDEX);
  const frames = movementFrames(startX, endX);
  elements.ambientTrack.style.transform = `translate3d(${startX}px, 0, 0)`;
  elements.focusTrack.style.transform = `translate3d(${startX}px, 0, 0)`;

  animations = [elements.ambientTrack, elements.focusTrack].map((track) =>
    track.animate(frames, {
      duration,
      fill: "forwards",
      easing: "linear",
    })
  );

  if (!reducedMotion) {
    later(() => setPhase("切斷動力 · 膠卷開始減速"), 500);
    later(() => setPhase("中央觀景窗正在鎖定"), 2250);
  }

  try {
    await Promise.all(animations.map((animation) => animation.finished));
  } catch {
    return;
  }
  if (currentRun !== runId) return;
  revealResult(selectedId);
}

function selectProfile(profileId) {
  if (!profiles[profileId]) return;
  selectedProfile = profileId;
  elements.exploreOptions.querySelectorAll("[data-profile]").forEach((button) => {
    button.classList.toggle("active", button.dataset.profile === profileId);
  });
  renderOdds(profiles[profileId]);
  playFilm();
}

slides.forEach((slide) => {
  const image = new Image();
  image.src = slide.image;
});

elements.exploreOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile]");
  if (button) selectProfile(button.dataset.profile);
});
elements.resultMode.addEventListener("change", playFilm);
elements.playButton.addEventListener("click", playFilm);
window.addEventListener("resize", () => {
  if (!elements.playButton.disabled) playFilm();
});

renderOdds(profiles[selectedProfile]);
playFilm();
