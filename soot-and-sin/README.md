# 煤灰與惡 Godot 專案

正式遊戲來源。H5 與未來 Steam 版共用同一套 Core 與 GDScript Logic Pack；H5 由 GitHub Actions 自動匯出，不提交生成檔。

## 啟動流程

1. Web HTML 殼層載入 Godot 引擎與固定 Core。
2. `Bootstrap` 取得 `content/manifest.json`，驗證 RSA 簽章與 Core／Logic 契約。
3. 缺少的版本化 PCK 下載到 staging，通過大小與 SHA-256 後才啟用。
4. 依序掛載 GDScript Logic Pack 與純資料 Content Pack，再建立 manifest 指定的入口場景。
5. 入口場景完成兩幀初始化後主動回報 `Bootstrap`，啟動畫面才以 0.5 秒淡出；載包完成不會自行關閉 Loading。
6. 遠端失敗時使用 active、previous 或 builtin Core 入口繼續啟動。

Web 下載會暫存單一內容包，因此後續內容須拆成可獨立版本化的小型 Bundle。

## 目錄

- `src/bootstrap/`：啟動 UI 與流程入口
- `src/core/`：固定版本與穩定契約
- `src/platform/`：Web／Steam 平台差異
- `src/content/`：簽章 manifest、下載、驗證與 PCK 掛載
- `src/ui/`：跨平台 Theme 與中文字型
- `logic/`：啟動時由已簽章 PCK 掛載的 GDScript 與場景
- `content/bundles/`：只含資料與素材的內容來源
- `tools/`：Logic／Content PCK、簽章 manifest、契約與候選入口驗證
- `web/`：Godot Web 自訂初始載入殼層

## UI 殼層

- 設計解析度固定為 1600×900，H5 與桌面版等比例縮放。
- 結構參考 Cocos Mines：固定 Loading／`GameRoot`、分離遊戲場景與操作 UI、Popup 最後建立並維持最高層級。
- `src/ui/popup_ui.tscn` 共用訊息、確認／取消及可阻擋輸入的 Loading；多個 Loading 請求以 key 管理。
- `tools/validate_ui_shell.gd` 驗證三種 Popup 狀態與 1600×900 主畫面殼層。

`tools/fixtures/development_update.key` 只用來驗證開發流程，任何人都能取得，不能用於正式版。正式私鑰必須由 CI secret 或離線環境提供。

正式架構規則見 [`AGENTS.md`](AGENTS.md)。
