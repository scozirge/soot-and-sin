const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const browserPath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const pageUrl = pathToFileURL(path.join(__dirname, "index.html")).href;

(async () => {
  console.log("[validate] launch");
  const browser = await chromium.launch({ headless: true, executablePath: browserPath });
  const errors = [];

  const desktop = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  desktop.setDefaultTimeout(10000);
  desktop.on("console", (message) => { if (message.type() === "error") errors.push(`desktop console: ${message.text()}`); });
  desktop.on("pageerror", (error) => errors.push(`desktop page: ${error.message}`));
  await desktop.goto(pageUrl, { waitUntil: "load", timeout: 10000 });
  await desktop.waitForTimeout(180);

  const introState = await desktop.evaluate(() => {
    const scene = document.querySelector(".variant-saints");
    const images = [...scene.querySelectorAll("img")];
    const profile = document.querySelector(".character-dossier")?.innerText || "";
    const introText = document.querySelector("[data-introduction]")?.innerText.trim();
    const firstText = document.querySelector('[data-section="section_01"]')?.innerText.trim();
    const lockedCards = [...document.querySelectorAll("[data-section].sealed")];
    const forbidden = ["神祇", "死亡回歸", "輪迴", "塑形", "凝視", "信念"];
    return {
      sections: document.querySelectorAll("[data-section]").length,
      availableSections: document.querySelectorAll("[data-section].available").length,
      lockedSections: lockedCards.length,
      currentChapters: document.querySelectorAll(".saints-chapters .chapter-choice").length,
      controlsRemoved: !document.querySelector(".prototype-controls, #variantSwitch, #clueButton, #deathButton, #resetButton"),
      progressRemoved: !document.querySelector(".death-tally"),
      introSelected: document.querySelector("[data-introduction]")?.classList.contains("selected"),
      introText,
      firstText,
      lockedCardsHideContent: lockedCards.every((card) => card.innerText.trim() === "◇" && !card.querySelector(".plate-image, .plate-copy, .plate-simple")),
      portrait: document.querySelector(".character-display img")?.getAttribute("src") || "",
      hasProfile: ["露西亞・艾弗里", "生命", "70", "心智", "160", "油燈", "寶石吊墜", "切肉刀"].every((term) => profile.includes(term)),
      profileHasButton: Boolean(document.querySelector(".character-dossier button")),
      profileOverflowY: getComputedStyle(document.querySelector(".dossier-scroll")).overflowY,
      profileFont: parseFloat(getComputedStyle(document.querySelector(".character-copy p")).fontSize),
      brokenImages: images.filter((image) => !image.complete || image.naturalWidth === 0).length,
      disclosures: forbidden.filter((term) => document.body.innerText.includes(term)),
    };
  });

  await desktop.click('[data-section="section_01"]');
  await desktop.waitForTimeout(1400);
  const telegram = desktop.locator("[data-telegram-scroll]");
  const telegramBox = await telegram.boundingBox();
  const beforeDrag = await telegram.evaluate((element) => ({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    typedCharacters: element.querySelector("[data-typewriter]")?.textContent.length || 0,
    fontSize: parseFloat(getComputedStyle(element.querySelector(".telegram-copy")).fontSize),
  }));
  if (telegramBox) {
    await desktop.mouse.move(telegramBox.x + telegramBox.width / 2, telegramBox.y + telegramBox.height * 0.8);
    await desktop.mouse.down();
    await desktop.mouse.move(telegramBox.x + telegramBox.width / 2, telegramBox.y + telegramBox.height * 0.2, { steps: 8 });
    await desktop.mouse.up();
  }
  const sectionState = await desktop.evaluate(() => ({
    source: document.querySelector(".section-display img")?.getAttribute("src") || "",
    title: document.querySelector(".telegram-title h3")?.textContent.trim(),
    introVisible: Boolean(document.querySelector(".character-display, .character-dossier")),
    metadataRemoved: !document.querySelector(".telegram-route, .telegram-footer"),
    scrollTop: document.querySelector("[data-telegram-scroll]")?.scrollTop,
    enterFits: (() => {
      const rect = document.querySelector("[data-enter]").getBoundingClientRect();
      return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
    })(),
  }));

  const compact = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  compact.on("console", (message) => { if (message.type() === "error") errors.push(`compact console: ${message.text()}`); });
  compact.on("pageerror", (error) => errors.push(`compact page: ${error.message}`));
  await compact.goto(pageUrl, { waitUntil: "load", timeout: 10000 });
  await compact.waitForTimeout(180);
  const compactState = await compact.evaluate(() => ({
    documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    sceneWidth: Math.round(document.querySelector(".variant-saints").getBoundingClientRect().width),
    introText: document.querySelector("[data-introduction]")?.innerText.trim(),
    firstText: document.querySelector('[data-section="section_01"]')?.innerText.trim(),
    profileClipped: document.querySelector(".dossier-layout").scrollWidth > document.querySelector(".dossier-scroll").clientWidth + 1,
  }));

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  mobile.on("console", (message) => { if (message.type() === "error") errors.push(`mobile console: ${message.text()}`); });
  mobile.on("pageerror", (error) => errors.push(`mobile page: ${error.message}`));
  await mobile.goto(pageUrl, { waitUntil: "load", timeout: 10000 });
  await mobile.waitForTimeout(180);
  const mobileIntro = await mobile.evaluate(() => {
    const dossier = document.querySelector(".dossier-scroll");
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      sceneWidth: Math.round(document.querySelector(".variant-saints").getBoundingClientRect().width),
      dossierOverflow: dossier.scrollHeight > dossier.clientHeight,
      dossierOverflowY: getComputedStyle(dossier).overflowY,
      profileButton: Boolean(document.querySelector(".character-dossier button")),
    };
  });
  await mobile.click('[data-section="section_01"]');
  await mobile.waitForTimeout(1400);
  const mobileSection = await mobile.evaluate(() => {
    const enter = document.querySelector("[data-enter]");
    const rect = enter.getBoundingClientRect();
    const copy = document.querySelector(".telegram-copy");
    return {
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      metadataRemoved: !document.querySelector(".telegram-route, .telegram-footer"),
      copyFont: parseFloat(getComputedStyle(copy).fontSize),
      copyWraps: getComputedStyle(copy).whiteSpace !== "nowrap",
      enterFits: rect.left >= 0 && rect.right <= document.documentElement.clientWidth + 1,
    };
  });

  await browser.close();
  console.log("[validate] browser closed");

  const invalidIntro = (
    introState.sections !== 6
    || introState.availableSections !== 1
    || introState.lockedSections !== 5
    || introState.currentChapters !== 1
    || !introState.controlsRemoved
    || !introState.progressRemoved
    || !introState.introSelected
    || introState.introText !== "序節"
    || introState.firstText !== "第一節\n煤灰車站"
    || !introState.lockedCardsHideContent
    || !introState.portrait.includes("scozirge-portrait.webp")
    || !introState.hasProfile
    || introState.profileHasButton
    || introState.profileOverflowY !== "auto"
    || introState.profileFont < 11
    || introState.brokenImages > 0
    || introState.disclosures.length > 0
  );
  const invalidSection = (
    !sectionState.source.includes("coal-ash-station-handdrawn.png")
    || sectionState.title !== "煤灰車站"
    || sectionState.introVisible
    || !sectionState.metadataRemoved
    || !sectionState.enterFits
    || beforeDrag.typedCharacters < 80
    || beforeDrag.fontSize < 13
    || beforeDrag.scrollHeight <= beforeDrag.clientHeight
    || sectionState.scrollTop <= beforeDrag.scrollTop
  );
  const invalidCompact = (
    compactState.documentOverflow > 1
    || compactState.sceneWidth < 980
    || compactState.introText !== "序節"
    || compactState.firstText !== "第一節\n煤灰車站"
    || compactState.profileClipped
  );
  const invalidMobile = (
    mobileIntro.documentOverflow > 1
    || mobileIntro.sceneWidth < 350
    || !mobileIntro.dossierOverflow
    || mobileIntro.dossierOverflowY !== "auto"
    || mobileIntro.profileButton
    || mobileSection.documentOverflow > 1
    || !mobileSection.metadataRemoved
    || mobileSection.copyFont < 13
    || !mobileSection.copyWraps
    || !mobileSection.enterFits
  );

  const report = { errors, introState, beforeDrag, sectionState, compactState, mobileIntro, mobileSection };
  console.log(JSON.stringify(report, null, 2));
  if (errors.length || invalidIntro || invalidSection || invalidCompact || invalidMobile) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
