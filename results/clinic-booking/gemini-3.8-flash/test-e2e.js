const { chromium } = require("/home/usaya/.nvm/versions/node/v24.12.0/lib/node_modules/agent-browser/node_modules/playwright-core");
const path = require("path");

async function runTests() {
  console.log("=== 開始執行 晴日心理諮商所 完整自動化端對端測試 ===");

  const browser = await chromium.launch({
    executablePath: "/home/usaya/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();

  // 監聽 console 錯誤
  const errors = [];
  page.on("pageerror", err => {
    console.error("頁面 JavaScript 錯誤:", err.message);
    errors.push(err.message);
  });
  page.on("console", msg => {
    if (msg.type() === "error") {
      console.error("Console 錯誤:", msg.text());
      errors.push(msg.text());
    }
  });

  const filePath = "file://" + path.resolve(__dirname, "index.html");
  console.log(`開啟頁面：${filePath}`);
  await page.goto(filePath, { waitUntil: "load" });

  // 1. 檢查基本標題與心理師數量
  const pageTitle = await page.title();
  console.log(`頁面標題: ${pageTitle}`);
  if (!pageTitle.includes("晴日心理諮商所")) {
    throw new Error("頁面標題不正確");
  }

  const counselorCardsCount = await page.locator(".counselor-select-card").count();
  console.log(`前台心理師選擇卡片數: ${counselorCardsCount}`);
  if (counselorCardsCount !== 3) {
    throw new Error(`預期 3 位心理師，實際為 ${counselorCardsCount}`);
  }

  const roomCardsCount = await page.locator(".room-select-card").count();
  console.log(`前台空間選擇卡片數: ${roomCardsCount}`);
  if (roomCardsCount !== 3) {
    throw new Error(`預期 3 間空間，實際為 ${roomCardsCount}`);
  }

  // 2. 測試時段衝突防護 (Conflict Prevention)
  // 示範資料中，明天 (Offset 1) 陳晴予 心理師在 14:00 - 14:50 已被預約 (森林室)
  // 檢查該時段按鈕是否為 disabled
  await page.waitForSelector(".time-slot-btn");
  const bookedSlots = await page.locator(".time-slot-btn.booked").allTextContents();
  console.log(`已額滿/衝突時段: ${JSON.stringify(bookedSlots)}`);
  
  const slot14 = page.locator('.time-slot-btn[data-slot="14:00 - 14:50"]');
  const isSlot14Disabled = await slot14.isDisabled();
  console.log(`14:00 - 14:50 是否已被停用/防護重複預約: ${isSlot14Disabled}`);
  if (!isSlot14Disabled) {
    throw new Error("預約衝突防護失敗：已被預約的時段 14:00 未被停用！");
  }

  // 3. 測試新預約送出
  console.log("正在填寫並送出新預約...");
  // 選擇一個可用時段，例如 09:30 - 10:20
  const slot09 = page.locator('.time-slot-btn[data-slot="09:30 - 10:20"]');
  await slot09.click();
  
  await page.fill("#client-name-input", "王小明");
  await page.fill("#client-phone-input", "0988-123-456");
  await page.fill("#client-topic-input", "近期生活節奏調整與自我探索");

  // 送出預約
  await page.click("#btn-submit-booking");

  // 檢查是否彈出成功視窗
  await page.waitForSelector("#booking-success-modal.active", { timeout: 3000 });
  const modalBookingId = await page.locator("#modal-booking-id").textContent();
  const modalStatus = await page.locator("#modal-status-badge").textContent();
  console.log(`預約成功！編號: ${modalBookingId}, 初始狀態: ${modalStatus}`);

  if (!modalStatus.includes("待確認")) {
    throw new Error("新預約狀態應為「待確認」");
  }

  // 截圖存證至 /tmp
  await page.screenshot({ path: "/tmp/test_booking_success.png" });

  // 關閉成功彈窗
  await page.click("#modal-close-btn");

  // 檢查剛預約的 09:30 時段是否立刻變成 disabled 且 booked
  const isSlot09NowDisabled = await slot09.isDisabled();
  console.log(`剛預約的 09:30 時段是否立即進入防護停用狀態: ${isSlot09NowDisabled}`);
  if (!isSlot09NowDisabled) {
    throw new Error("送出預約後，該時段未能即時防護重複預約！");
  }

  // 4. 測試管理後台 (Admin Panel)
  console.log("切換至管理者後台...");
  await page.click("#nav-admin");
  await page.waitForSelector("#admin-view-wrap.active");

  const pendingCountText = await page.locator("#admin-stat-pending").textContent();
  console.log(`後台待確認數量: ${pendingCountText}`);

  // 在後台找到王小明的預約卡片
  const clientCard = page.locator('.booking-item-card', { hasText: '王小明' });
  const clientCardExists = await clientCard.count();
  if (clientCardExists === 0) {
    throw new Error("後台未找到剛送出的王小明預約！");
  }

  // 測試在後台「確認預約」
  console.log("管理者點選「確認預約」...");
  const confirmBtn = clientCard.locator(".btn-action-confirm");
  await confirmBtn.click();
  await page.waitForTimeout(500);

  // 驗證狀態是否變更為已確認
  const updatedStatusText = await clientCard.locator(".status-badge-text").textContent();
  console.log(`確認後狀態: ${updatedStatusText}`);
  if (!updatedStatusText.includes("已確認")) {
    throw new Error("確認按鈕未能正確變更狀態為已確認！");
  }

  // 截圖後台畫面至 /tmp
  await page.screenshot({ path: "/tmp/test_admin_confirmed.png" });

  // 5. 測試取消預約與時段釋出
  console.log("管理者點選「取消預約」測試時段釋出...");
  // 點擊取消
  page.once("dialog", async dialog => {
    await dialog.accept();
  });
  const cancelBtn = clientCard.locator(".btn-action-cancel");
  await cancelBtn.click();
  await page.waitForTimeout(500);

  const cancelledStatusText = await clientCard.locator(".status-badge-text").textContent();
  console.log(`取消後狀態: ${cancelledStatusText}`);
  if (!cancelledStatusText.includes("已取消")) {
    throw new Error("取消按鈕未能正確變更狀態為已取消！");
  }

  // 6. 返回前台預約頁面，驗證 09:30 時段是否已解鎖釋出
  console.log("返回前台預約頁面...");
  await page.click("#btn-back-to-booking");
  await page.waitForSelector("#booking-view-wrap:not(.hidden)");

  const isSlot09Freed = !(await page.locator('.time-slot-btn[data-slot="09:30 - 10:20"]').isDisabled());
  console.log(`取消預約後，09:30 時段是否已成功釋出可重新預約: ${isSlot09Freed}`);
  if (!isSlot09Freed) {
    throw new Error("取消預約後時段未被正確釋出！");
  }

  // 7. 測試個案電話查詢彈窗
  console.log("測試個案電話預約查詢功能...");
  await page.click("#btn-open-lookup");
  await page.waitForSelector("#lookup-modal.active");
  await page.fill("#lookup-phone-input", "0988-123-456");
  await page.click("#btn-do-lookup");
  await page.waitForTimeout(300);

  const lookupResultText = await page.locator("#lookup-results").textContent();
  console.log(`查詢結果預覽: ${lookupResultText.replace(/\s+/g, ' ').slice(0, 100)}`);
  if (!lookupResultText.includes("王小明") && !lookupResultText.includes(modalBookingId)) {
    throw new Error("電話查詢功能未查出該筆紀錄！");
  }
  await page.click("#lookup-close-btn");

  // 8. 測試手機螢幕尺寸 RWD
  console.log("測試手機版 RWD 檢視...");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.screenshot({ path: "/tmp/test_mobile_view.png" });

  console.log("JS 錯誤數:", errors.length);
  if (errors.length > 0) {
    throw new Error(`出現 JavaScript 錯誤: ${errors.join(", ")}`);
  }

  console.log("=== 🎉 所有自動化端對端測試全部通過！ ===");
  await browser.close();
}

runTests().catch(err => {
  console.error("測試失敗:", err);
  process.exit(1);
});
