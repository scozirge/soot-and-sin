const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const path = require("path");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 757, height: 715 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(pathToFileURL(path.resolve(__dirname, "../story/index.html")).href);
  await page.waitForSelector(".story-scene");
  await page.waitForTimeout(150);

  const layout = await page.evaluate(() => {
    const scene = document.querySelector(".story-scene");
    const style = getComputedStyle(scene);
    const rect = scene.getBoundingClientRect();
    return {
      backgroundSize: style.backgroundSize,
      sceneWidth: rect.width,
      sceneHeight: rect.height,
      scrollTop: document.scrollingElement.scrollTop,
    };
  });

  assert(["contain", "100%", "100% auto"].includes(layout.backgroundSize), "劇本插圖必須完整顯示");
  assert(layout.sceneWidth > 680 && layout.sceneHeight > 400, "窄畫面插圖尺寸異常");
  assert(layout.scrollTop === 0, "章節節點不應帶動畫面垂直捲動");
  assert(await page.locator("#storyTitle").isHidden(), "苦痛祭司標題仍然顯示");
  assert(errors.length === 0, `頁面錯誤：${errors.join("；")}`);

  await page.screenshot({
    path: path.resolve(__dirname, "../preview-chapter-story-narrow.png"),
    fullPage: true,
  });
  console.log(JSON.stringify({ ok: true, ...layout }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
