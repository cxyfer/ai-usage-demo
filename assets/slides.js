// 首頁簡報：模型資料、成果卡片、比較表、圓點導覽與鍵盤翻頁

// 新增模型時只要加一筆資料
const MODELS = [
  {
    id: "claude-sonnet-5-5",
    tool: "Claude Code",
    tagline: "溫暖的橘色系，前台和後台放在同一頁。",
    time: "3 分 21 秒",
    selfCheck: "沒有（沒有執行指令的權限）",
    verify: "8 / 8 通過",
    note: "照片位置先用姓名首字代替",
  },
  {
    id: "gpt-6.1-terra",
    tool: "Codex CLI",
    tagline: "沉穩的綠色系，還自己生成了心理師照片。",
    time: "42 分 15 秒",
    selfCheck: "有，用瀏覽器實測並邊測邊修",
    verify: "8 / 8 通過",
    note: "照片為 AI 生成的虛構人物",
  },
  {
    id: "gemini-3.8-flash",
    tool: "Antigravity CLI",
    tagline: "功能最多，還有電話查詢預約與示範資料。",
    time: "9 分 50 秒",
    selfCheck: "有，自己寫了端對端測試",
    verify: "8 / 8 通過",
    note: "選「今天」時仍可預約已過的時段；證照字號為虛構",
  },
];

const REPO = "https://github.com/cxyfer/ai-usage-demo";
const RESULT_DIR = "results/clinic-booking";

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function renderCards() {
  const box = document.getElementById("cards");
  for (const m of MODELS) {
    if (m.pending) {
      box.append(el(`
        <article class="card pending">
          <div class="shot">執行中，稍後補上</div>
          <div class="body"><h3>${m.id}</h3><div class="tool">${m.tool}</div></div>
        </article>`));
      continue;
    }
    box.append(el(`
      <article class="card">
        <div class="shot" style="background-image:url('assets/screenshots/${m.id}.jpg')" role="img" aria-label="${m.id} 成果截圖"></div>
        <div class="body">
          <h3>${m.id}</h3>
          <div class="tool">${m.tool}・${m.time}</div>
          <p class="tagline">${m.tagline}</p>
          <div class="actions">
            <a class="btn" href="${RESULT_DIR}/${m.id}/">開啟網站</a>
            <a class="btn ghost" href="${REPO}/blob/main/${RESULT_DIR}/${m.id}.md">執行紀錄</a>
          </div>
        </div>
      </article>`));
  }
}

function renderTable() {
  const done = MODELS.filter((m) => !m.pending);
  document.getElementById("compare-head").innerHTML =
    `<tr><th></th>${done.map((m) => `<th>${m.id}<br><small>${m.tool}</small></th>`).join("")}</tr>`;
  const rows = [
    ["耗時", "time"],
    ["自我檢查", "selfCheck"],
    ["獨立驗證", "verify"],
    ["備註", "note"],
  ];
  document.getElementById("compare-body").innerHTML = rows
    .map(([label, key]) => `<tr><th>${label}</th>${done.map((m) => `<td>${m[key]}</td>`).join("")}</tr>`)
    .join("");
}

// 從 prompts/clinic-booking.md 取出主提示詞，避免兩邊內容不同步
function loadPrompt() {
  const pre = document.getElementById("prompt");
  fetch("prompts/clinic-booking.md")
    .then((r) => r.text())
    .then((md) => {
      const match = md.match(/## ① 主提示詞\s*```\n([\s\S]*?)```/);
      pre.textContent = match ? match[1].trim() : md;
    })
    .catch(() => {
      pre.textContent = "請到 GitHub 查看 prompts/clinic-booking.md";
    });
}

function setupNav() {
  const slides = [...document.querySelectorAll(".slide")];
  const dots = document.getElementById("dots");
  const links = slides.map((s) => {
    const a = el(`<a href="#${s.id}" aria-label="${s.dataset.title}"><span>${s.dataset.title}</span></a>`);
    dots.append(a);
    return a;
  });

  let current = 0;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        current = slides.indexOf(e.target);
        links.forEach((a, i) => a.classList.toggle("active", i === current));
      }
    },
    { threshold: 0.55 }
  );
  slides.forEach((s) => io.observe(s));

  // 方向鍵翻頁（輸入框或可捲動的提示詞區塊內不攔截）
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea, pre")) return;
    const next = { ArrowDown: 1, PageDown: 1, ArrowRight: 1, ArrowUp: -1, PageUp: -1, ArrowLeft: -1 }[e.key];
    if (!next) return;
    const target = slides[Math.min(slides.length - 1, Math.max(0, current + next))];
    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth" });
  });
}

renderCards();
renderTable();
loadPrompt();
setupNav();
