// 展示用提示氣泡：提醒訪客這是 AI 產生的靜態成果，沒有實際部署後端
(function () {
  const STORAGE_KEY = "ai-usage-demo-notice-collapsed";
  // 由 script 位置推出網站根目錄（assets/ 的上一層），本機雙擊與 GitHub Pages 都適用
  const ROOT = new URL("..", document.currentScript.src).href;
  const model = (location.pathname.match(/results\/[^/]+\/([^/]+)\//) || [])[1] || "AI";

  const style = document.createElement("style");
  style.textContent = `
    .aud, .aud * { box-sizing: border-box; }
    .aud {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
      font: 14px/1.6 system-ui, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      color: #f6f2ea; letter-spacing: normal; text-align: left;
    }
    .aud-card {
      width: min(320px, calc(100vw - 32px));
      background: rgba(38, 34, 29, .92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      border-radius: 18px; padding: 16px 18px 14px;
      box-shadow: 0 18px 50px rgba(0, 0, 0, .28);
      animation: aud-in .35s ease-out;
    }
    .aud-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .aud-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #f0a35e; flex: none;
      box-shadow: 0 0 0 4px rgba(240, 163, 94, .25);
    }
    .aud-title { font-weight: 700; flex: 1; }
    .aud-close {
      all: unset; cursor: pointer; width: 26px; height: 26px; border-radius: 50%;
      display: grid; place-items: center; color: #b8afa2; font-size: 16px;
    }
    .aud-close:hover, .aud-close:focus-visible { background: rgba(255, 255, 255, .1); color: #fff; }
    .aud-card p { margin: 0 0 12px; color: #d9d1c4; font-size: 13px; }
    .aud-card p b { color: #fff; font-weight: 600; }
    .aud-links { display: flex; gap: 8px; flex-wrap: wrap; }
    .aud-links a {
      color: #26221d; background: #f6f2ea; text-decoration: none; font-size: 13px; font-weight: 600;
      padding: 5px 12px; border-radius: 99px;
    }
    .aud-links a.ghost { background: transparent; color: #f6f2ea; border: 1px solid rgba(246, 242, 234, .35); }
    .aud-links a:hover { background: #f0a35e; color: #26221d; border-color: #f0a35e; }
    .aud-pill {
      all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
      background: rgba(38, 34, 29, .92); color: #f6f2ea; font-size: 13px; font-weight: 600;
      padding: 8px 14px; border-radius: 99px; box-shadow: 0 8px 24px rgba(0, 0, 0, .22);
      animation: aud-in .25s ease-out;
    }
    .aud-pill:hover, .aud-pill:focus-visible { background: #26221d; }
    .aud [hidden] { display: none !important; }
    @keyframes aud-in { from { opacity: 0; transform: translateY(8px); } }
    @media (prefers-reduced-motion: reduce) { .aud-card, .aud-pill { animation: none; } }
  `;
  document.head.append(style);

  const root = document.createElement("aside");
  root.className = "aud";
  root.setAttribute("aria-label", "展示頁面說明");
  root.innerHTML = `
    <div class="aud-card" role="note">
      <div class="aud-head">
        <span class="aud-dot" aria-hidden="true"></span>
        <span class="aud-title">展示頁面・未實際部署</span>
        <button class="aud-close" type="button" aria-label="收合說明">✕</button>
      </div>
      <p>這個網站由 <b>${model}</b> 依提示詞自動產生，沒有後端。你送出的預約只會存在自己的瀏覽器，不會傳給任何人。</p>
      <div class="aud-links">
        <a href="${ROOT}">← 回到比較頁</a>
        <a class="ghost" href="${ROOT}#s-prompt">看提示詞</a>
      </div>
    </div>
    <button class="aud-pill" type="button" aria-label="展開展示頁面說明">
      <span class="aud-dot" aria-hidden="true"></span>展示版
    </button>`;

  const card = root.querySelector(".aud-card");
  const pill = root.querySelector(".aud-pill");

  function setCollapsed(collapsed) {
    card.hidden = collapsed;
    pill.hidden = !collapsed;
    sessionStorage.setItem(STORAGE_KEY, collapsed ? "1" : "");
  }
  root.querySelector(".aud-close").addEventListener("click", () => setCollapsed(true));
  pill.addEventListener("click", () => setCollapsed(false));

  function mount() {
    document.body.append(root);
    setCollapsed(sessionStorage.getItem(STORAGE_KEY) === "1");
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
