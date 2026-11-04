# AI Usage Demo

示範不懂程式的人如何用 AI coding 工具（Claude Code、Codex、Antigravity CLI）做出一個網站，並比較不同模型用**同一段提示詞**產出的結果。

🔗 **線上展示**：https://cxyfer.github.io/ai-usage-demo/

> 所有成果都是靜態展示頁面，沒有後端與資料庫。頁面上的「預約」只存在訪客自己的瀏覽器裡，不會傳給任何人。

## 範例：心理諮商診所預約網站

- 提示詞：[`prompts/clinic-booking.md`](prompts/clinic-booking.md)
- 這次只跑主提示詞 ①，每個模型都在各自的空資料夾裡、以非互動模式執行一次，沒有人工修改程式碼

| 模型 | 工具 | 耗時 | 自我檢查 | 獨立驗證 | 成果 | 執行紀錄 |
|---|---|---|---|---|---|---|
| claude-sonnet-5-5 | Claude Code | 3 分 21 秒 | ❌ 無執行權限 | 8 / 8 | [開啟](https://cxyfer.github.io/ai-usage-demo/results/clinic-booking/claude-sonnet-5-5/) | [紀錄](results/clinic-booking/claude-sonnet-5-5.md) |
| gpt-6.1-terra | Codex CLI | 42 分 15 秒 | ✅ 瀏覽器實測 | 8 / 8 | [開啟](https://cxyfer.github.io/ai-usage-demo/results/clinic-booking/gpt-6.1-terra/) | [紀錄](results/clinic-booking/gpt-6.1-terra.md) |
| gemini-3.8-flash | Antigravity CLI | 9 分 50 秒 | ✅ 端對端測試 | 8 / 8 | [開啟](https://cxyfer.github.io/ai-usage-demo/results/clinic-booking/gemini-3.8-flash/) | [紀錄](results/clinic-booking/gemini-3.8-flash.md) |

**獨立驗證**項目：送出預約、同一時段無法重複預約、後台確認、後台取消、取消後時段重新開放、特殊字元不會被當成 HTML、沒有 JS 錯誤。

**驗證以外發現的問題**：`gemini-3.8-flash` 選「今天」時，已經過去的時段仍可預約；Claude 與 Codex 版都有擋掉。

> 各家權限條件並不完全相同：Claude 只能讀寫檔案，Codex 與 Antigravity 可以在 sandbox 內執行指令，所以「自我檢查」的差異有一部分來自權限，不全是模型能力。

## 對結果的修改

為了公開展示，只做了下面這些修改，可以在 git 歷史中對照：

1. 每個成果的 `index.html` 加了一行 `<script src="…/assets/demo-notice.js">`，在右下角顯示「展示頁面，未實際部署」的提示氣泡
2. 移除了 Codex sandbox 留下的空目錄（`.agents`、`.aws`、`.codex`、`.git`）

## 注意事項

- `gpt-6.1-terra` 的心理師照片由 Codex 內建的圖片生成工具產生，**照片中的人物皆為 AI 生成的虛構人物**。
- 所有心理師姓名、電話、學經歷和介紹都是假資料，`gemini-3.8-flash` 版的「諮心字第 ○○○ 號」證照字號也是模型虛構的。
- 執行環境載入了作者個人的 Claude Code / Codex / Antigravity 設定，結果可能和全新安裝的環境略有不同，細節見各模型的執行紀錄。
- 同一個模型每次執行的結果都會不同，這裡只是一次的樣本。

## 目錄結構

```
prompts/                 提示詞與示範說明
results/<範例>/<模型>/    模型產出的網站（雙擊 index.html 即可打開）
results/<範例>/<模型>.md  執行紀錄：指令、耗時、模型回覆原文
assets/demo-notice.js    展示用提示氣泡
assets/slides.*          首頁（簡報式介紹頁）
assets/screenshots/      成果首屏截圖
```
