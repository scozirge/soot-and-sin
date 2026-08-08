const { chromium } = require("playwright");
const fs = require("fs");
const http = require("http");
const path = require("path");

const siteRoot = path.resolve(__dirname, "../..");
const backlogPath = path.join(siteRoot, "soot-and-sin-adventure-demo", "SYSTEM_DESIGN_BACKLOG.md");
const previewDir = path.join(__dirname, "previews");
const expectedTasks = (fs.readFileSync(backlogPath, "utf8").match(/^- \[[ xX]\] /gm) || []).length;
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let filePath = path.resolve(siteRoot, `.${pathname}`);
      if (!filePath.startsWith(siteRoot)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
      if (!fs.existsSync(filePath)) {
        response.writeHead(404).end("Not found");
        return;
      }
      response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(response);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  console.log("[checklist] 啟動本機伺服器");
  const server = await startServer();
  const address = server.address();
  const pageUrl = `http://127.0.0.1:${address.port}/soot-and-sin-event-prototypes/system-design-checklist/`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    const nativeClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function captureChecklistExport() {
      if (this.download) {
        window.__checklistExport = { download: this.download, href: this.href };
        return;
      }
      nativeClick.call(this);
    };
  });

  try {
    page.setDefaultTimeout(10000);
    console.log("[checklist] 載入桌面版");
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 20000 });
    const taskCount = await page.locator(".task-row").count();
    assert(taskCount === expectedTasks, `待辦數量錯誤：${taskCount}/${expectedTasks}`);
    assert(await page.locator(".priority-block").count() === 3, "未建立 P0、P1、P2 三個階段");
    assert(await page.locator("text=載入失敗").count() === 0, "Markdown 載入失敗");
    fs.mkdirSync(previewDir, { recursive: true });
    await page.screenshot({ path: path.join(previewDir, "preview-desktop.png") });

    console.log("[checklist] 驗證勾選、備註與重新整理");
    const firstTask = page.locator(".task-row").first();
    const firstCheckbox = firstTask.locator("input[type='checkbox']");
    await firstTask.locator(".task-check").click();
    assert(await firstCheckbox.isChecked(), "點擊清單列沒有勾選項目");
    await firstTask.locator("summary").click();
    await firstTask.locator("textarea").fill("驗證備註保存");
    await page.reload({ waitUntil: "networkidle" });
    assert(await page.locator(".task-row input[type='checkbox']").first().isChecked(), "勾選狀態未保存");
    assert(await page.locator(".task-row textarea").first().inputValue() === "驗證備註保存", "備註未保存");

    console.log("[checklist] 驗證篩選");
    await page.locator('[data-filter="pending"]').click();
    assert(await page.locator(".task-row").first().isHidden(), "未完成篩選沒有隱藏已完成項目");
    await page.locator('[data-filter="done"]').click();
    assert(await page.locator(".task-row:not([hidden])").count() === 1, "已完成篩選數量錯誤");

    console.log("[checklist] 驗證 JSON 匯出與匯入");
    await page.locator("#exportButton").click();
    const exportedFilename = await page.evaluate(() => window.__checklistExport?.download || "");
    assert(exportedFilename.endsWith(".json"), "匯出檔名不是 JSON");

    const importPayload = {
      format: "soot-and-sin-system-design-checklist",
      version: 1,
      items: {},
    };
    const secondId = await page.locator(".task-row").nth(1).getAttribute("data-task-id");
    importPayload.items[secondId] = { done: true, note: "匯入成功" };
    await page.locator("#importInput").setInputFiles({
      name: "progress.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(importPayload)),
    });
    await page.waitForFunction(
      ([taskId, note]) => {
        const saved = JSON.parse(localStorage.getItem("soot-and-sin:system-design-checklist:v1") || "{}");
        return saved.items?.[taskId]?.done === true && saved.items?.[taskId]?.note === note;
      },
      [secondId, "匯入成功"],
    );
    await page.locator('[data-filter="all"]').click();
    assert(await page.locator(".task-row input[type='checkbox']").nth(1).isChecked(), "匯入沒有合併勾選狀態");
    assert(await page.locator(".task-row textarea").nth(1).inputValue() === "匯入成功", "匯入沒有合併備註");

    console.log("[checklist] 驗證手機版");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "networkidle", timeout: 20000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `手機版出現水平溢位：${overflow}px`);
    assert(await page.locator("#exportButton").isVisible(), "手機版匯出按鈕不可見");
    await page.screenshot({ path: path.join(previewDir, "preview-mobile.png") });
    assert(errors.length === 0, `頁面錯誤：${errors.join(" | ")}`);

    console.log(JSON.stringify({ expectedTasks, taskCount, errors, mobileOverflow: overflow }, null, 2));
  } finally {
    console.log("[checklist] 關閉測試環境");
    await browser.close();
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
