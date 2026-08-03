"use strict";

const storyEvents = {
  pain_priest: {
    type: "關鍵事件",
    title: "苦痛祭司",
    stages: {
      start: {
        scene: "assets/pain-priest-room.png",
        text: "門後是一間光線微弱的暗室，你聽到房間深處傳來微小的悶哼聲。走過去一看，發現一位奄奄一息的男性坐在地上，滿身是血，非常虛弱且似乎無法動彈。當你更靠近時，對方眼珠看向你並激烈的發出含糊的聲音，似乎無法正常說話，但他一直看向旁邊的桌子。可以感覺得出來對方想傳達某些事情。",
        choices: [
          { label: "調查桌面", next: "table" },
          { label: "調查房間（需照明物）", requirement: "oil_lamp", next: "room" },
          { label: "離開房間尋找下一道門", next: "leave" },
        ],
      },
      table: {
        scene: "assets/pain-priest-room.png",
        text: "你在桌上發現一張剪著人形的紙片，紙片上有奇怪的血跡符號，且在頭頂的部分綁著一搓頭髮。",
        choices: [
          { label: "撕掉紙片", next: "tear" },
          { label: "移除紙片上的頭髮", next: "hair" },
        ],
      },
      tear: {
        scene: "assets/pain-priest-reveal.png",
        text: "當你撕掉紙片，你聽到一陣男性尖叫聲。對方身體折成兩半，濺出大量鮮血，慘死在血泊中。此時你的後方發出女性的奸笑聲。聲音來源的暗處角落走出一位臉上布滿鐵絲、相貌可怕的女性，似乎站在那裡很久了，說著：「哎呀，又壞掉一個了。但每次看都覺得有趣，你會負責對吧。」",
        feedback: "（你失去 10 點理智）\n（進入戰鬥）",
        sanity: -10,
        combat: true,
      },
      hair: {
        scene: "assets/pain-priest-reveal.png",
        text: "當你移除紙片上的頭髮，你聽到一陣男性尖叫聲。對方頭髮與頭分離，濺出大量鮮血，慘死在血泊中。此時你的後方發出女性的奸笑聲。聲音來源的暗處角落走出一位臉上布滿鐵絲、相貌可怕的女性，似乎站在那裡很久了，說著：「哎呀，又壞掉一個了。但每次看都覺得有趣，你會負責對吧。」",
        feedback: "（你失去 5 點理智）\n（進入戰鬥）",
        sanity: -5,
        combat: true,
      },
      room: {
        scene: "assets/pain-priest-reveal.png",
        text: "你調查房間時，靠近牆角陰影處，你更仔細的一看發現陰暗處站著一位臉上布滿鐵絲相貌可怕的女性，似乎站在那裏許久了，你警覺的往後跳，對方走出來並說：「哎呀 被發現了 他一個人很寂寞 你願意陪他留在這裡嗎?」",
        feedback: "（進入戰鬥）",
        combat: true,
      },
      leave: { scene: "assets/pain-priest-room.png", text: "你離開前往下一道門。" },
    },
  },
  silent_tram: {
    type: "事件", title: "無聲電車", stages: { start: {
      text: "一輛沒有軌道的電車停在街心，車廂坐滿穿著喪服的人偶。售票員的剪票鉗仍在自行開合。",
      choices: [
        { label: "檢查售票員的口袋", next: "search" },
        { label: "拉動緊急煞車", next: "brake" },
        { label: "繞過電車", next: "leave" },
      ],
    }, search: { text: "口袋裡只有一張寫著你姓名的返程票。日期是明天。", feedback: "獲得線索：返程票\n理智 −3", sanity: -3 }, brake: { text: "車門同時打開。所有人偶都把頭轉向你，但道路另一端也因此暢通。", feedback: "隊伍安全通過" }, leave: { text: "你繞進巷道，聽見電車在沒有軌道的石路上緩慢跟隨。", feedback: "未取得線索" } },
  },
  borrowed_face: {
    type: "事件", title: "借來的臉", stages: { start: {
      text: "裁縫店的櫥窗裡掛滿人臉形狀的薄皮。店主背對你，用與 Morrow 完全相同的聲音詢問尺寸。",
      choices: [{ label: "質問店主", next: "question" }, { label: "查看價目表", next: "price" }, { label: "立刻離開", next: "leave" }],
    }, question: { text: "店主轉身時沒有臉。他說每張臉都由原主人自願留下。", feedback: "Morrow 對你的信任提高" }, price: { text: "價目表沒有金額，只有名字。你的名字被排在最後一行。", feedback: "理智 −4", sanity: -4 }, leave: { text: "你離開店鋪，櫥窗中卻多出一張與你相似的臉。", feedback: "未取得線索" } },
  },
  bell_toll: {
    type: "事件", title: "收鐘人", stages: { start: {
      text: "街口的老人拖著一袋破鐘。他說每只鐘都封著一個人最後沒能說出口的話。",
      choices: [{ label: "聽其中一只鐘", next: "listen" }, { label: "用物資交換情報", next: "trade" }, { label: "保持距離", next: "leave" }],
    }, listen: { text: "鐘裡傳出你的聲音：『別相信家族名冊。』", feedback: "獲得重要線索\n理智 −2", sanity: -2 }, trade: { text: "老人收下物資，指向一條沒有黑霧的捷徑。", feedback: "取得安全路線" }, leave: { text: "老人沒有追趕，只在你背後搖響一只新鐘。", feedback: "未取得線索" } },
  },
  ash_trial: {
    type: "事件", title: "煤灰審判", stages: { start: {
      text: "廣場中央擺著一張法官席。空椅宣讀你的罪名：『攜帶不屬於你的東西活著離開。』",
      choices: [{ label: "交出一件物資", next: "offer" }, { label: "為自己辯護", next: "defend" }, { label: "推翻法官席", next: "break" }],
    }, offer: { text: "煤灰收走最靠近背包口的物品，道路隨之開啟。", feedback: "失去一件物資" }, defend: { text: "空椅沉默許久，最後判你『暫緩處刑』。", feedback: "理智 −3", sanity: -3 }, break: { text: "木席下沒有地面，只有數不清等待宣判的手。", feedback: "理智 −7", sanity: -7 } },
  },
  family_ledger: {
    type: "關鍵事件", title: "家族名冊", stages: { start: {
      text: "檔案室中央放著一本仍在書寫的名冊。每翻過一頁，就有一名家族成員的名字被墨水慢慢劃掉。Morrow 的名字正在變淡。",
      choices: [{ label: "撕下 Morrow 那一頁", next: "tear" }, { label: "寫上自己的名字覆蓋", next: "replace" }, { label: "闔上名冊", next: "close" }],
    }, tear: { text: "紙頁像皮膚般流血。Morrow 的名字恢復了，但走廊深處有東西因此醒來。", feedback: "Morrow 對你的信任大幅提高\n下一節點：無面使徒" }, replace: { text: "你的名字吞掉了他的名字。Morrow 沒有說話，只默默離你遠了一步。", feedback: "理智 −8\nMorrow 對你的信任降低", sanity: -8 }, close: { text: "名冊在你手下繼續書寫。Morrow 的名字完全消失，他卻仍站在身旁。", feedback: "獲得異常線索\n理智 −5", sanity: -5 } },
  },
};

const elements = {
  event: document.querySelector("#storyEvent"), progress: document.querySelector("#chapterProgress"),
  type: document.querySelector("#storyType"), node: document.querySelector("#storyNode"), title: document.querySelector("#storyTitle"),
  text: document.querySelector("#storyText"), feedback: document.querySelector("#storyFeedback"), choices: document.querySelector("#storyChoices"),
  continueButton: document.querySelector("#storyContinue"), vitals: document.querySelector("#playerVitals"),
  scene: document.querySelector("#storyScene"),
};
let session = AdventureState.load();
let event = null;
let currentStage = "start";
let pendingOutcome = null;

function hasItem(id) { return session.inventory.some((item) => item.id === id && item.quantity > 0); }

function renderStage(stageId) {
  currentStage = stageId;
  const stage = event.stages[stageId];
  const scene = stage.scene || "../search/assets/abandoned-apothecary.png";
  if (elements.scene.dataset.scene !== scene) {
    elements.scene.dataset.scene = scene;
    elements.scene.style.setProperty("--scene-image", `url("${scene}")`);
    elements.scene.classList.remove("switching");
    void elements.scene.offsetWidth;
    elements.scene.classList.add("switching");
  }
  elements.text.textContent = stage.text;
  elements.feedback.hidden = !stage.feedback;
  elements.feedback.textContent = stage.feedback || "";
  elements.choices.replaceChildren();
  elements.continueButton.hidden = Boolean(stage.choices);
  elements.continueButton.textContent = stage.combat ? "進入戰鬥" : "前往下一個節點";
  pendingOutcome = stage.choices ? null : stage;
  (stage.choices || []).forEach((choice, index) => {
    const locked = choice.requirement && !hasItem(choice.requirement);
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index + 1).padStart(2, "0");
    button.disabled = locked;
    button.innerHTML = `${choice.label}${locked && choice.requirementText ? `<small>${choice.requirementText}</small>` : ""}`;
    button.addEventListener("click", () => renderStage(choice.next));
    elements.choices.append(button);
  });
}

function continueStory() {
  if (!pendingOutcome) return;
  session.sanity = Math.max(0, Math.min(100, (session.sanity ?? 100) + (pendingOutcome.sanity || 0)));
  session.lastResult = `${event.title}：${pendingOutcome.feedback || "事件結束"}`.replace(/\n/g, "；");
  if (pendingOutcome.combat) {
    session.currentEvent = "combat";
    session.chapterStoryCombat = true;
    AdventureState.save(session);
    location.href = "../battle/index.html";
    return;
  }
  session.completedEvents += 1;
  session = AdventureState.advanceNode(session);
  location.href = AdventureState.eventPath(session.currentEvent, true);
}

function showComplete() {
  elements.progress.textContent = "本節完成";
  elements.type.textContent = "CHAPTER COMPLETE";
  elements.node.textContent = "第一節完成";
  elements.title.hidden = false;
  elements.title.textContent = "你走出了黑霧街區";
  elements.text.textContent = "十二個節點已全部完成。帶出的物資與仍然活著的同行者，將影響下一節劇本。";
  elements.feedback.hidden = false;
  elements.feedback.textContent = `生命 ${session.playerHealth}/${session.maxHealth}　理智 ${session.sanity ?? 100}/100`;
  elements.choices.replaceChildren();
  elements.continueButton.hidden = false;
  elements.continueButton.textContent = "重新開始第一節";
  elements.continueButton.onclick = () => { AdventureState.reset(); location.reload(); };
}

const node = AdventureState.currentNode(session);
if (session.currentEvent === "complete" || !node) showComplete();
else if (!node.type.startsWith("story")) location.replace(AdventureState.eventPath(session.currentEvent, true));
else {
  event = storyEvents[node.id];
  elements.progress.textContent = "第一節";
  elements.type.textContent = event.type;
  elements.node.textContent = "";
  elements.title.textContent = event.title;
  elements.title.hidden = node.id === "pain_priest";
  elements.vitals.textContent = `生命 ${session.playerHealth}/${session.maxHealth} · 理智 ${session.sanity ?? 100}/100`;
  renderStage("start");
  elements.continueButton.addEventListener("click", continueStory);
}
