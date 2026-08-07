(() => {
  "use strict";

  const ASSET_ROOT = "../../soot-and-sin-adventure-demo";
  const assets = {
    portrait: `${ASSET_ROOT}/battle/assets/scozirge-portrait.webp`,
    ally: `${ASSET_ROOT}/search/assets/survivor.webp`,
    station: "./assets/coal-ash-station-handdrawn.png",
    street: `${ASSET_ROOT}/battle/assets/victorian-street.webp`,
    room: `${ASSET_ROOT}/story/assets/pain-priest-room.png`,
    reveal: `${ASSET_ROOT}/story/assets/pain-priest-reveal.png`,
  };

  const protagonist = {
    name: "露西亞・艾弗里",
    englishName: "Lucia Avery",
    organization: "胡桃木",
    background: "古老皇室的末裔，也是末日後少數受過高等教育的知識分子。沉穩、敏銳，對未知懷有近乎固執的求知慾；即使血統失去實際意義，她仍保有正向而強韌的意志，以及讓人願意追隨的從容。課餘時，她會跟隨胡桃木成員前往車站搜索物資。",
    health: 70,
    mind: 160,
    attributes: [
      { label: "力量", value: 3 },
      { label: "魅力", value: 6 },
      { label: "智慧", value: 8 },
    ],
    items: ["油燈", "學院制服", "寶石吊墜", "水壺", "切肉刀", "麵包"],
  };

  const chapters = [
    {
      id: "chapter_01",
      numeral: "I",
      title: protagonist.name,
      protagonist: protagonist.englishName,
      period: "1887 年 · 灰燼冬季",
      region: "赫斯維克下城",
      portrait: assets.portrait,
      unlocked: true,
      status: "進行中",
    },
    {
      id: "chapter_02",
      numeral: "II",
      title: "未命名卷宗",
      protagonist: "Morrow",
      period: "時間封存",
      region: "地點封存",
      portrait: assets.ally,
      unlocked: false,
      status: "尚未解鎖",
    },
    {
      id: "chapter_03",
      numeral: "III",
      title: "銀鹽中的陌生人",
      protagonist: "身分未辨認",
      period: "記錄受損",
      region: "記錄受損",
      portrait: assets.reveal,
      unlocked: false,
      status: "記錄封存",
    },
  ];

  const sections = [
    {
      id: "section_01",
      order: "01",
      title: "煤灰車站",
      time: "黃昏 18:40",
      location: "舊城南站",
      visits: 6,
      image: assets.station,
      imagePosition: "23% center",
      need: 0,
      monologue: "我又回到了煤灰車站。這地方總有辦法讓人一踏進門就後悔：煤屑像黑雪一樣懸在空氣裡，把十步外的人都磨成模糊的影子；流民守著熄不滅的桶火，不法之徒則守著別人的口袋。胡桃木需要燈油、乾糧，以及任何還能派上用場的零件，而我最好在天色完全暗下來前找到它們。保持安靜，別盯著任何人太久，也別讓好奇心替我惹麻煩——至少今天別。",
    },
    {
      id: "section_02",
      order: "02",
      title: "封鎖藥房",
      time: "深夜 23:15",
      location: "赫斯維克北區",
      visits: 4,
      image: assets.room,
      need: 1,
      monologue: "封條還是新的，門縫裡的藥味卻像死了好幾天。若老闆真逃走了，他不會把最值錢的止痛酊留在櫃上。除非他帶不走自己的手。很好，我今晚需要的麻煩，看來一樣也沒少。",
    },
    {
      id: "section_03",
      order: "03",
      title: "無鐘教區",
      time: "凌晨 02:10",
      location: "聖維蘭教區",
      visits: 3,
      image: assets.reveal,
      need: 2,
      monologue: "鐘被拆了，禮拜卻沒有停。那些人低著頭，像在等一句誰也不敢先說的話。我只是來找一個失蹤的孩子，偏偏每張長椅都像認得我。若有人開始唱詩，我就從側門走。若側門還肯放我走。",
    },
    {
      id: "section_04",
      order: "04",
      title: "赤潮碼頭",
      time: "黎明之前",
      location: "河岸第七码頭",
      visits: 0,
      image: assets.street,
      need: 3,
      monologue: "河水今夜紅得不自然，碼頭工卻照常按桶收費。赫斯維克就是這樣：只要帳本還乾著，誰也不在乎貨物是不是還會呼吸。那艘沒有船名的駁船正在等我，我最好別讓它等得太像一張嘴。",
    },
    {
      id: "section_05",
      order: "05",
      title: "鉛灰宴席",
      time: "時間未確認",
      location: "位置尚未顯影",
      visits: 0,
      image: assets.room,
      need: 2,
      monologue: "請帖沒有署名，蠟封卻沾著我家的灰。赴宴者都戴著笑臉，侍者端來的銀盤則很誠實。我不記得自己受過這種禮遇，也不記得桌首那張空椅為什麼剛好合身。先坐下吧，站著死未免太失禮。",
    },
    {
      id: "section_06",
      order: "Ω",
      title: "終局阻影",
      time: "最後一夜",
      location: "位置遭到遮蔽",
      visits: 0,
      image: assets.reveal,
      need: 3,
      boss: true,
      monologue: "一路留下的腳印在門前少了一雙。我終於明白，跟著我的東西從來不在身後。門的另一側有人用我的聲音呼吸，而我只剩下一個問題：這次究竟是誰要從這裡活著出去？",
    },
  ];

  const variants = {
    saints: {
      label: "電報案卷",
      summary: "肖像案卷與內心電文。",
      render: renderSaints,
    },
    darkroom: {
      label: "濕版暗房",
      summary: "玻璃底片與顯影路線。",
      render: renderDarkroom,
    },
    registry: {
      label: "城市名冊",
      summary: "城市登記簿與調查紀錄。",
      render: renderRegistry,
    },
    theatre: {
      label: "血色劇院",
      summary: "紅絨帷幕與劇目式章節。",
      render: renderTheatre,
    },
  };

  const initialState = {
    variant: "saints",
    selectedSectionId: "character_intro",
    unlockedCount: 1,
    clueProgress: 0,
    deathCount: 17,
  };
  const state = { ...initialState };

  const stage = document.querySelector("#prototypeStage");
  const variantSwitch = document.querySelector("#variantSwitch");
  const variantSummary = document.querySelector("#variantSummary");
  const clueButton = document.querySelector("#clueButton");
  const deathButton = document.querySelector("#deathButton");
  const resetButton = document.querySelector("#resetButton");
  const toast = document.querySelector("#toast");
  const deathReveal = document.querySelector("#deathReveal");
  let toastTimer = 0;
  let deathTimer = 0;
  let typewriterTimer = 0;

  function sectionState(index) {
    if (index < state.unlockedCount) return "available";
    if (index === state.unlockedCount) return "next";
    return "unknown";
  }

  function selectedSection() {
    return sections.find((section) => section.id === state.selectedSectionId) || sections[0];
  }

  function isIntroductionSelected() {
    return state.selectedSectionId === "character_intro";
  }

  function selectedSectionStatus() {
    const index = sections.findIndex((section) => section.id === state.selectedSectionId);
    return index < 0 ? "introduction" : sectionState(index);
  }

  function nextSection() {
    return sections[state.unlockedCount] || null;
  }

  function safeText(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function chapterNav(className = "chapter-list", currentOnly = false) {
    const visibleChapters = currentOnly ? chapters.slice(0, 1) : chapters;
    return `<div class="${className}">${visibleChapters.map((chapter) => `
      <button class="chapter-choice ${chapter.unlocked ? "unlocked" : "locked"} ${chapter.id === "chapter_01" ? "active" : ""}"
        type="button" ${chapter.unlocked ? "" : "disabled"} aria-label="${safeText(chapter.title)}，${safeText(chapter.status)}">
        <span class="chapter-number">${chapter.numeral}</span>
        <span class="chapter-thumb"><img src="${chapter.portrait}" alt=""></span>
        <span class="chapter-copy"><small>${chapter.protagonist}</small><strong>${chapter.title}</strong><em>${chapter.status}</em></span>
        ${chapter.unlocked ? "" : '<i aria-hidden="true">封</i>'}
      </button>
    `).join("")}</div>`;
  }

  function clueMarks() {
    const next = nextSection();
    if (!next) return '<span class="clue-complete">終局底片已經顯影</span>';
    return Array.from({ length: next.need }, (_, index) => `
      <i class="${index < state.clueProgress ? "found" : ""}" aria-label="${index < state.clueProgress ? "已取得" : "未知線索"}">${index < state.clueProgress ? "◆" : "◇"}</i>
    `).join("");
  }

  function plateButton(section, index, styleClass = "section-plate") {
    const status = sectionState(index);
    const selected = section.id === state.selectedSectionId;
    const disabled = status !== "available";
    if (status !== "available") {
      return `
        <button class="${styleClass} ${status} sealed ${selected ? "selected" : ""} ${section.boss ? "boss" : ""}"
          type="button" data-section="${section.id}" disabled aria-pressed="false" aria-label="未解鎖小節">
          <span class="plate-seal" aria-hidden="true">◇</span>
        </button>
      `;
    }
    if (styleClass === "saint-plate") {
      const labels = ["第一節", "第二節", "第三節", "第四節", "第五節", "終節"];
      return `
        <button class="${styleClass} available ${selected ? "selected" : ""} ${section.boss ? "boss" : ""}"
          type="button" data-section="${section.id}" aria-pressed="${selected}">
          <span class="plate-image" style="--plate-image:url('${section.image}');--plate-position:${section.imagePosition || "center"}"></span>
          <span class="plate-simple"><small>${labels[index]}</small><strong>${section.title}</strong></span>
        </button>
      `;
    }
    const statusText = section.visits > 0 ? `已探索 ${section.visits} 次` : "可以進入";
    return `
      <button class="${styleClass} ${status} ${selected ? "selected" : ""} ${section.boss ? "boss" : ""}"
        type="button" data-section="${section.id}" ${disabled ? "disabled" : ""} aria-pressed="${selected}">
        <span class="plate-index">${section.order}</span>
        <span class="plate-image" style="--plate-image:url('${section.image}');--plate-position:${section.imagePosition || "center"}"></span>
        <span class="plate-copy"><small>${section.time}</small><strong>${section.title}</strong><em>${section.location}</em></span>
        <span class="plate-status">${statusText}</span>
      </button>
    `;
  }

  function introductionPlate() {
    const selected = isIntroductionSelected();
    return `
      <button class="saint-plate introduction available ${selected ? "selected" : ""}" type="button"
        data-introduction aria-pressed="${selected}" aria-label="人物序頁，${safeText(protagonist.name)}">
        <span class="plate-image" style="--plate-image:url('${assets.portrait}');--plate-position:center 22%"></span>
        <span class="plate-simple"><strong>序節</strong></span>
      </button>
    `;
  }

  function detailContent(mode) {
    const section = selectedSection();
    const index = sections.indexOf(section);
    const status = sectionState(index);
    const available = status === "available";
    const next = nextSection();
    const heading = available ? section.title : "—";
    return `
      <div class="detail-block ${mode} ${status}">
        <div class="detail-heading">
          <span>${available && section.boss ? "FINAL" : `SECTION ${section.order}`}</span>
          <h3>${heading}</h3>
        </div>
        <div class="detail-meta">
          <span><small>時間</small><strong>${available ? section.time : "—"}</strong></span>
          <span><small>地點</small><strong>${available ? section.location : "—"}</strong></span>
          <span><small>構成</small><strong>${available ? section.boss ? "11 節點＋BOSS" : "12 節點" : "—"}</strong></span>
        </div>
        ${status === "next" && next ? `<div class="detail-clues"><span>需要線索</span><div>${clueMarks()}</div><small>${state.clueProgress} / ${next.need}</small></div>` : ""}
        <button class="enter-section" type="button" data-enter ${available ? "" : "disabled"}>
          ${available ? section.boss ? "進入終局" : section.visits ? "再次進入" : "進入小節" : "尚未解鎖"}
        </button>
      </div>
    `;
  }

  function characterDossier() {
    return `
      <section class="character-dossier" aria-labelledby="characterDossierTitle">
        <div class="dossier-scroll" data-drag-scroll="y" tabindex="0" aria-label="${safeText(protagonist.name)}人物資料，可上下拖曳閱讀">
          <div class="dossier-layout">
            <div class="character-copy">
              <small>CHAPTER PROLOGUE · PERSONAL FILE</small>
              <h3 id="characterDossierTitle">${protagonist.name}<span>${protagonist.englishName}</span></h3>
              <p>${protagonist.background}</p>
            </div>
            <div class="character-stats" aria-label="角色屬性">
              <div class="dossier-vitals"><span><small>生命</small><strong>${protagonist.health}</strong></span><span><small>心智</small><strong>${protagonist.mind}</strong></span></div>
              <div class="dossier-attributes">${protagonist.attributes.map((attribute) => `<span>${attribute.label}<b>${attribute.value}</b></span>`).join("")}</div>
            </div>
            <div class="character-kit">
              <small>WALNUT · ${protagonist.organization}</small>
              <strong>初始道具</strong>
              <div>${protagonist.items.map((item, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${item}</span>`).join("")}</div>
            </div>
          </div>
        </div>
        <span class="dossier-mark">S–01</span>
      </section>
    `;
  }

  function saintTransmission() {
    if (isIntroductionSelected()) return characterDossier();
    const section = selectedSection();
    const index = sections.indexOf(section);
    const status = sectionState(index);
    const available = status === "available";
    const next = nextSection();
    if (!available) {
      return `
        <section class="sealed-detail" aria-label="第 ${section.order} 小節尚未解鎖">
          <span class="sealed-order">${section.order}</span>
          <i class="sealed-diamond" aria-hidden="true">◇</i>
          ${status === "next" && next ? `<div class="sealed-clues"><span>LINE</span>${clueMarks()}<b>${state.clueProgress}/${next.need}</b></div>` : ""}
        </section>
      `;
    }
    const transmission = section.monologue;
    return `
      <section class="saint-telegram ${status}" aria-labelledby="telegramTitle">
        <div class="telegram-heading">
          <div class="telegram-title"><span>${section.boss ? "FINAL WIRE" : `SECTION · ${section.order}`}</span>
            <h3 id="telegramTitle">${section.title}</h3>
          </div>
        </div>
        <button class="enter-section telegram-enter" type="button" data-enter>
          ${section.boss ? "進入終局" : section.visits ? "再次進入" : "進入小節"}
        </button>
        <div class="telegram-paper">
          <span class="paper-feed left" aria-hidden="true"></span>
          <div class="telegram-scroll" data-telegram-scroll data-drag-scroll="y" tabindex="0" aria-label="${safeText(section.title)}，第一人稱內心獨白，可上下拖曳閱讀">
            <div class="telegram-track">
              <span class="wire-code" aria-hidden="true">HX–${section.order} / PRIVATE</span>
              <p class="telegram-copy"><span data-typewriter data-text="${safeText(transmission)}"></span><i class="type-cursor" aria-hidden="true"></i></p>
            </div>
          </div>
          <span class="paper-feed right" aria-hidden="true"></span>
          <span class="telegram-accessible">${safeText(transmission)}</span>
        </div>
      </section>
    `;
  }

  function saintMainDisplay() {
    if (isIntroductionSelected()) {
      return `
        <div class="saint-display character-display">
          <div class="halo halo-a"></div><div class="halo halo-b"></div>
          <img src="${assets.portrait}" alt="${protagonist.name}肖像">
        </div>
      `;
    }
    const section = selectedSection();
    const status = selectedSectionStatus();
    if (status !== "available") {
      return `<div class="saint-display locked-display" aria-label="尚未解鎖"><i aria-hidden="true">◇</i></div>`;
    }
    return `
      <div class="saint-display section-display">
        <img src="${section.image}" style="object-position:${section.imagePosition || "center"}" alt="${safeText(section.title)}場景">
        <span class="soot-veil" aria-hidden="true"></span>
      </div>
    `;
  }

  function renderSaints() {
    return `
      <div class="scene variant-saints">
        <div class="saints-architecture" aria-hidden="true"><i></i><i></i><i></i></div>
        <aside class="saints-archive">
          <div class="scene-title"><small>CHAPTER ARCHIVE</small><strong>章節檔案</strong></div>
          ${chapterNav("saints-chapters", true)}
        </aside>

        <section class="saints-shrine">
          <div class="shrine-wing identity-wing">
            <small>CHAPTER I</small>
            <h2>第一章<br>${protagonist.name}</h2>
            <div class="chapter-region"><span>HESWICK LOWER CITY</span><strong>赫斯維克下城</strong></div>
          </div>
          ${saintMainDisplay()}

          <div class="saints-sections">
            <div class="plate-rail">${introductionPlate()}${sections.map((section, index) => plateButton(section, index, "saint-plate")).join("")}</div>
          </div>
          ${saintTransmission()}
        </section>
      </div>
    `;
  }

  function renderDarkroom() {
    const section = selectedSection();
    return `
      <div class="scene variant-darkroom">
        <div class="red-lamp" aria-hidden="true"><i></i></div>
        <header class="darkroom-head">
          <div><small>WET PLATE ARCHIVE · CHAPTER I</small><h2>赫斯維克濕版檔案室</h2></div>
          <span>1887 · 灰燼冬季</span>
        </header>
        <div class="darkroom-main">
          <aside class="film-canisters">
            <span class="rail-label">CHAPTER CANISTERS</span>
            ${chapterNav("canister-list")}
          </aside>
          <section class="negative-viewer">
            <div class="viewer-frame">
              <i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>
              <div class="selected-negative" style="--negative:url('${section.image}')"><img src="${section.image}" alt="${safeText(section.title)}負片"></div>
              <span class="viewer-index">${section.order}</span>
              <div class="viewer-caption"><small>${section.time}</small><h2>${section.title}</h2><span>${section.location}</span></div>
            </div>
            <div class="chemical-readout"><span>底片 <b>${section.order}</b></span><span>探索 <b>${section.visits} 次</b></span><span>線索 <b>4</b></span></div>
          </section>
          <aside class="developer-notes">
            <small>NEXT LOCATION</small>
            <h3>${nextSection() ? "—" : "終局"}</h3>
            <div class="dark-clues">${clueMarks()}</div>
          </aside>
        </div>
        <div class="film-strip"><div class="sprockets"></div>${sections.map((item, index) => plateButton(item, index, "negative-card")).join("")}<div class="sprockets bottom"></div></div>
        ${detailContent("darkroom-detail")}
      </div>
    `;
  }

  function renderRegistry() {
    return `
      <div class="scene variant-registry">
        <div class="registry-table" aria-hidden="true"></div>
        <header class="registry-head"><span>HESWICK CITY ARCHIVE</span><strong>赫斯維克市政檔案處</strong><em>ARCHIVE · 1887</em></header>
        <div class="ledger-book">
          <section class="ledger-page left-page">
            <div class="ledger-ornament">§</div>
            <small>CHAPTER REGISTRY</small>
            <h2>章節<br>登記名冊</h2>
            ${chapterNav("ledger-chapters")}
            <div class="registry-portrait"><img src="${assets.portrait}" alt="${protagonist.name}"><span><small>主角</small><strong>${protagonist.name}</strong><em>${protagonist.englishName} · 1887</em></span></div>
          </section>
          <section class="ledger-page right-page">
            <div class="ledger-title-row"><div><small>CHAPTER I · ${protagonist.name}</small><h2>小節調查紀錄</h2></div><span class="registry-stamp">進行中</span></div>
            <div class="ledger-lines">${sections.map((section, index) => {
              const status = sectionState(index);
              const revealed = status === "available";
              const selected = section.id === state.selectedSectionId;
              return `<button type="button" class="ledger-row ${status} ${selected ? "selected" : ""} ${section.boss ? "boss" : ""}" data-section="${section.id}" ${revealed ? "" : "disabled"}>
                <span>${section.order}</span><strong>${revealed ? section.title : "—"}</strong><em>${revealed ? section.location : "—"}</em><small>${revealed ? `已調查 · ${section.visits} 次` : "—"}</small><i>${revealed ? "閱" : "◇"}</i>
              </button>`;
            }).join("")}</div>
            ${detailContent("registry-detail")}
            <div class="clerk-signature"><span>檔案員</span><strong>字跡無法辨認</strong></div>
          </section>
        </div>
      </div>
    `;
  }

  function renderTheatre() {
    const section = selectedSection();
    return `
      <div class="scene variant-theatre">
        <div class="audience-eyes" aria-hidden="true">${Array.from({ length: 9 }, () => "<i></i>").join("")}</div>
        <div class="curtain curtain-left" aria-hidden="true"></div><div class="curtain curtain-right" aria-hidden="true"></div>
        <header class="theatre-bill"><small>THE LAST GASLIGHT THEATRE</small><h2>今晚劇目</h2><strong>《${protagonist.name}》</strong><span>主演 · ${protagonist.englishName}</span></header>
        <aside class="playbill-chapters">
          <span>本季劇目</span>
          ${chapterNav("playbill-list")}
        </aside>
        <section class="theatre-stage">
          <div class="stage-arch"><span>ACT ${section.order}</span></div>
          <div class="stage-portrait">
            <div class="spotlight"></div>
            <img src="${assets.portrait}" alt="舞台上的${protagonist.name}">
            <div class="stage-shadow" style="--shadow-image:url('${section.image}')"></div>
          </div>
          <div class="stage-caption"><small>${section.time} · ${section.location}</small><h2>${section.title}</h2></div>
        </section>
        <aside class="divine-box">
          <small>ROYAL BOX · VII</small><h3>節目殘頁</h3>
          <div class="box-clues"><span>下一幕</span>${clueMarks()}</div>
        </aside>
        <nav class="act-strip" aria-label="選擇小節">${sections.map((item, index) => plateButton(item, index, "act-ticket")).join("")}</nav>
        ${detailContent("theatre-detail")}
        <div class="footlights" aria-hidden="true">${Array.from({ length: 16 }, () => "<i></i>").join("")}</div>
      </div>
    `;
  }

  function render() {
    clearInterval(typewriterTimer);
    state.variant = "saints";
    document.body.dataset.theme = "saints";
    stage.innerHTML = renderSaints();
    requestAnimationFrame(() => {
      stage.querySelector(".scene")?.classList.add("ready");
      initializeTelegram();
    });
  }

  function initializeTelegram() {
    const output = stage.querySelector("[data-typewriter]");
    if (output) {
      const fullText = output.dataset.text || "";
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      let characterIndex = 0;
      output.textContent = reducedMotion ? fullText : "";

      if (!reducedMotion) {
        typewriterTimer = window.setInterval(() => {
          characterIndex = Math.min(characterIndex + 2, fullText.length);
          output.textContent = fullText.slice(0, characterIndex);
          if (characterIndex >= fullText.length) clearInterval(typewriterTimer);
        }, 18);
      }
    }

    stage.querySelectorAll("[data-drag-scroll]").forEach((scroller) => {
      const vertical = scroller.dataset.dragScroll !== "x";
      let pointerId = null;
      let pointerStart = 0;
      let scrollStart = 0;

      scroller.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointerId = event.pointerId;
        pointerStart = vertical ? event.clientY : event.clientX;
        scrollStart = vertical ? scroller.scrollTop : scroller.scrollLeft;
        scroller.setPointerCapture(pointerId);
        scroller.classList.add("dragging");
      });

      scroller.addEventListener("pointermove", (event) => {
        if (event.pointerId !== pointerId) return;
        const pointerNow = vertical ? event.clientY : event.clientX;
        const nextScroll = scrollStart - (pointerNow - pointerStart);
        if (vertical) scroller.scrollTop = nextScroll;
        else scroller.scrollLeft = nextScroll;
      });

      const releasePointer = (event) => {
        if (event.pointerId !== pointerId) return;
        if (scroller.hasPointerCapture(pointerId)) scroller.releasePointerCapture(pointerId);
        pointerId = null;
        scroller.classList.remove("dragging");
      };

      scroller.addEventListener("pointerup", releasePointer);
      scroller.addEventListener("pointercancel", releasePointer);
    });
  }

  function showToast(message, tone = "normal") {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = `toast visible ${tone}`;
    toastTimer = setTimeout(() => { toast.className = "toast"; }, 2600);
  }

  function addClue() {
    const next = nextSection();
    if (!next) {
      showToast("全部小節已解鎖。", "success");
      return;
    }
    state.clueProgress += 1;
    if (state.clueProgress >= next.need) {
      state.unlockedCount += 1;
      state.selectedSectionId = next.id;
      state.clueProgress = 0;
      render();
      showToast(next.boss ? "終局已解鎖。" : `「${next.title}」已解鎖。`, "success");
      stage.querySelector(`[data-section="${next.id}"]`)?.focus({ preventScroll: true });
      return;
    }
    render();
    showToast(`取得線索 ${state.clueProgress} / ${next.need}`);
  }

  function simulateDeath() {
    clearTimeout(deathTimer);
    deathReveal.hidden = false;
    deathReveal.setAttribute("aria-hidden", "false");
    requestAnimationFrame(() => deathReveal.classList.add("visible"));
    deathTimer = setTimeout(() => {
      state.unlockedCount = 1;
      state.clueProgress = 0;
      state.selectedSectionId = "character_intro";
      state.deathCount += 1;
      render();
      deathReveal.classList.remove("visible");
      setTimeout(() => {
        deathReveal.hidden = true;
        deathReveal.setAttribute("aria-hidden", "true");
        showToast("本章已返回第一小節。", "danger");
      }, 360);
    }, 1650);
  }

  function resetState() {
    Object.assign(state, initialState);
    render();
    showToast("已復原。", "success");
  }

  variantSwitch?.querySelectorAll("button[data-variant]").forEach((button) => {
    button.addEventListener("click", () => {
      const variant = button.dataset.variant;
      if (!variants[variant] || variant === state.variant) return;
      state.variant = variant;
      render();
    });
  });

  stage.addEventListener("click", (event) => {
    const introductionButton = event.target.closest("[data-introduction]");
    if (introductionButton) {
      state.selectedSectionId = "character_intro";
      render();
      return;
    }
    const firstSectionButton = event.target.closest("[data-first-section]");
    if (firstSectionButton) {
      state.selectedSectionId = sections[0].id;
      render();
      stage.querySelector('[data-section="section_01"]')?.focus({ preventScroll: true });
      return;
    }
    const sectionButton = event.target.closest("[data-section]");
    if (sectionButton && !sectionButton.disabled) {
      state.selectedSectionId = sectionButton.dataset.section;
      render();
      return;
    }
    const enterButton = event.target.closest("[data-enter]");
    if (enterButton && !enterButton.disabled) {
      const section = selectedSection();
      showToast(`準備進入「${section.title}」的 12 節點冒險。`, "success");
    }
  });

  clueButton?.addEventListener("click", addClue);
  deathButton?.addEventListener("click", simulateDeath);
  resetButton?.addEventListener("click", resetState);

  render();
})();
