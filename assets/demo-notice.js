// 展示用提示氣泡：提醒訪客這是 AI 產生的靜態成果，沒有實際部署後端
(function () {
  const REPO_URL = "https://github.com/cxyfer/ai-usage-demo";
  const STORAGE_KEY = "ai-usage-demo-notice-collapsed";

  const style = document.createElement("style");
  style.textContent = `
    .aud-notice {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      max-width: min(340px, calc(100vw - 32px));
      font: 14px/1.6 system-ui, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      color: #3b3320; background: #fff8e1; border: 1px solid #f0d58a;
      border-radius: 14px; box-shadow: 0 6px 24px rgba(0, 0, 0, .15);
      padding: 14px 16px 12px;
    }
    .aud-notice b { display: block; margin-bottom: 4px; }
    .aud-notice p { margin: 0 0 8px; }
    .aud-notice a { color: #8a5a00; }
    .aud-notice .aud-close {
      position: absolute; top: 6px; right: 8px; border: 0; background: none;
      font-size: 18px; line-height: 1; cursor: pointer; color: #8a7a50;
    }
    .aud-pill {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      border: 1px solid #f0d58a; background: #fff8e1; color: #3b3320;
      border-radius: 99px; padding: 8px 14px; cursor: pointer;
      font: 13px system-ui, "Noto Sans TC", sans-serif; box-shadow: 0 4px 14px rgba(0, 0, 0, .12);
    }
  `;
  document.head.append(style);

  const box = document.createElement("div");
  box.className = "aud-notice";
  box.setAttribute("role", "note");
  box.innerHTML = `
    <button class="aud-close" aria-label="收合提示">×</button>
    <b>⚠️ 展示頁面，未實際部署</b>
    <p>這是 AI 依提示詞產生的示範網站，沒有後端與資料庫。你送出的「預約」只會存在自己的瀏覽器裡，不會傳給任何人。</p>
    <a href="${REPO_URL}" target="_blank" rel="noopener">查看提示詞與比較 →</a>`;

  const pill = document.createElement("button");
  pill.className = "aud-pill";
  pill.textContent = "⚠️ 展示頁面";
  pill.setAttribute("aria-label", "展開展示頁面提示");

  function setCollapsed(collapsed) {
    box.hidden = collapsed;
    pill.hidden = !collapsed;
    sessionStorage.setItem(STORAGE_KEY, collapsed ? "1" : "");
  }
  box.querySelector(".aud-close").addEventListener("click", () => setCollapsed(true));
  pill.addEventListener("click", () => setCollapsed(false));

  function mount() {
    document.body.append(box, pill);
    setCollapsed(sessionStorage.getItem(STORAGE_KEY) === "1");
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
