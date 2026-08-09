# 必做設計清單 H5

公開頁面會讀取 [`../../soot-and-sin-adventure-demo/SYSTEM_DESIGN_BACKLOG.md`](../../soot-and-sin-adventure-demo/SYSTEM_DESIGN_BACKLOG.md) 中的必做項目，不另外維護第二份清單內容。清單只拆分使用者已明確提出的設計，不主動增加未確認的系統。

- 勾選完成狀態與個別備註儲存在瀏覽器 `localStorage`。
- 已完成項目可展開查看 Markdown 中記錄的目前設計摘要。
- 提供全部／未完成／已完成篩選及各階段進度。
- 可以匯出 JSON 備份，再於其他瀏覽器匯入合併。
- 靜態 GitHub Pages 無法直接修改 GitHub 上的 Markdown；規格定案後仍須更新原始文件。

執行 `node validate.cjs` 驗證 Markdown 載入、勾選保存、備註保存、篩選、匯出／匯入與手機版面。
