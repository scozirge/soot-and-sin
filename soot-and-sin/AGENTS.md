# Soot and Sin：Godot 專案規則

修改本目錄前先閱讀本文件。只把使用者已確認的內容視為需求；討論中的提案不是既定設計。

## 專案定位

- Godot 4.7.1 Standard，使用 GDScript。
- 單人、劇情導向的維多利亞後末日冒險 Roguelite；正式首發只製作露西亞・艾弗里一名主角。
- H5 是開發測試與展示版本，Windows／Steam 是正式發行目標；兩者由同一份 Godot 專案與遊戲邏輯匯出。
- 不實作多人搶物資、隊友物資分配或玩家交易；NPC／同行者可以參與事件與戰鬥。

## 已確認的冒險框架

- 同一章使用同一主角、相近時期與同一條故事線；每個小節是一次完整冒險。
- 每節固定 13 個未知事件點：7 個劇本、2 個休息、4 個戰鬥。休息點分別隨機位於第 4–6 點與第 10–12 點，其餘位置隨機分配劇本與戰鬥。
- 章末小節第 13 點固定為 Boss 戰並計入四場戰鬥；玩家抵達前不知道下一事件類型。
- 小節依條件而非序號解鎖；後續小節的線索可以反向開啟先前小節的關鍵劇本。
- 死亡清除該次角色道具與該章小節解鎖狀態；永久天賦與跨章節共用銀幣不清除。
- 詳細數值與內容規則仍以 `soot-and-sin-h5-demo/soot-and-sin-adventure-demo/` 內的設計文件為準，不複製到 UI 腳本。

## Core、Logic Pack 與 Content Pack

- Core 固定包含啟動器、下載、簽章驗證、平台介面、存檔、共用 UI 與穩定契約。
- 啟動後才載入的遊戲程式與入口場景放在 `logic/`；純資料與素材放在 `content/`。
- Logic Pack 可以包含 GDScript 與場景，但只能使用 `res://logic/`，禁止原生程式、C# DLL、GDExtension、WASM 或 Core 路徑。
- Content Pack 禁止 GDScript、原生程式與 Core 路徑。
- `src/core/` 放契約與設定、`src/platform/` 隔離 Web／Steam、`src/content/` 管理載包、`src/features/` 放可獨立測試的遊戲功能。
- 功能模組不得直接依賴 Web API 或 Steam API，必須透過 `src/platform/` 的介面或轉接器。
- 目前不建立獨立模組專案；有第二個遊戲需要共用時，再把穩定模組抽離並獨立版本化。

## 啟動更新與 Bundle 契約

- 更新只發生在啟動階段，不在遊玩小節中切換程式或內容版本。
- 固定順序為：建立儲存目錄 → 取得遠端簽章 manifest → 驗證 key、Core API、Logic 契約、Godot 版本與頻道 → 下載到 staging → 檢查大小與 SHA-256 → 原子啟用 manifest → 掛載 Logic Pack → 掛載 Content Pack → 建立 manifest 指定的入口場景。
- 遠端 manifest 使用 RSA-SHA256 簽章 envelope；SHA-256 只驗證 PCK 完整性，不能取代發布簽章。
- manifest payload 必須包含 `schema_version`、`core_version`、`core_api_version`、`logic_contract_version`、`engine_version`、`update_channel`、`logic_version`、`content_version` 與 `entry_scene`；`core_version` 採 Cocos Base／Main Version 的精確映射概念。
- 每個 bundle 必須包含 `id`、`kind`、`version`、`file`、`bytes`、`sha256`、`required` 與 `priority`。
- 遠端失敗時依序回退到 active、previous、builtin；失敗檔只能留在 staging，不能成為 active。
- PCK 檔名必須版本化且不可原地修改；manifest 發布時不得先指向尚未上傳的 PCK。
- 掛載一律使用 `replace_files=false`，Logic Pack 不得覆蓋 Core；Core、Godot 引擎與原生功能仍由 H5 重新部署或 Steam 正式更新處理。
- H5 使用同源的 `content/manifest.json`；桌面測試只有設定 `SOOT_AND_SIN_CONTENT_MANIFEST_URL` 才讀遠端內容。
- H5 下載單一 PCK 時會暫存該包位元組；內容增長後依用途拆成數個可獨立版本化的 Bundle，不建立單一巨型內容包。
- `tools/fixtures/development_update.key` 是公開且不具安全性的開發測試金鑰，只能用於 `development` 頻道。
- 正式私鑰只存在 CI secrets 或離線簽章環境，禁止提交到 Git、PCK、H5 或日誌；正式 Core 只內嵌對應公鑰。

## H5 初始載入

- Web 分兩階段：HTML 殼層顯示引擎／Core 下載進度，Godot 啟動場景顯示簽章、Logic Pack 與 Content Pack 進度。
- 玩家介面只顯示符合世界觀的短句與進度，不顯示 API、PCK、hash 或內部錯誤；詳細錯誤只寫入開發者主控台。
- Web 不使用專屬遊戲規則或獨立存檔格式；正式功能必須同時能在 Windows／Steam 執行。
- Godot Web 不依賴系統字型；正式 UI 使用 Core 內的 Noto Sans TC Theme，保留字型授權文件。

## 資料流程

- 未來以 Google Sheets 作為角色、道具、事件與平衡資料的編輯來源，取代舊 Excel 巨集。
- 遊戲執行時不得直接讀取 Google Sheets。固定流程為：Sheets → 匯出工具 → JSON → Schema／交叉引用驗證 → 版本化快照 → Content Pack。
- 只有通過驗證的 JSON 快照可以進入建置；遠端試算表無法連線時，使用最後一份已驗證快照或明確失敗，不能產生半套資料。
- 金鑰與服務帳號只存在 CI secrets 或本機環境，不寫入專案、Bundle、H5 或日誌。

## 開發與驗收

- 權威玩法規則不要寫在 UI 腳本內；平台 API 不得散落在功能模組。
- 修改 Bundle 契約時同步調整 manifest 產生器、簽章驗證、fallback 與 CI。
- 發布候選必須在移除本機 `logic/` 原始碼的 Core 副本中掛載 PCK，成功解析 GDScript、建立 `entry_scene` 並取得 `STARTUP_CANDIDATE_READY` 後才可部署。
- 完成修改前執行 `validate_bundle_contract.gd`、`validate_startup_candidate.gd`、Godot headless 桌面啟動、Web 匯出與瀏覽器啟動測試。
- H5 匯出物由 CI 產生，不提交 `build/`、`dist/`、`.pck`、`.wasm` 或其他生成檔。

## 目前進度

已完成 Core 啟動殼、Web 兩段載入、RSA 簽章 manifest、啟動時 GDScript Logic Pack、純資料 Content Pack、SHA-256 驗證、staging／active／previous／builtin 回退、無本機邏輯原始碼候選驗證與 GitHub Pages 自動建置。1600×900 Loading、主遊戲 UI 殼層與共用 Popup 已接入；具體冒險功能尚未接入 Godot。
