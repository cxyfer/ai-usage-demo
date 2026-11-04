/**
 * ============================================================
 * ☀️ 晴日心理諮商所 - 應用程式邏輯 (app.js)
 * ============================================================
 */

(function () {
  "use strict";

  const STORAGE_KEY = "SUNNYDAY_BOOKINGS_DATA_V1";

  // 全域狀態
  const state = {
    currentView: "booking", // 'booking' | 'admin'
    selectedCounselorId: null,
    selectedRoomId: null,
    selectedDate: null,
    selectedTimeSlot: null,
    adminFilterStatus: "all",
    adminSearchQuery: "",
    bookings: []
  };

  // DOM 元素快取
  const dom = {
    // 導航
    navBooking: document.getElementById("nav-booking"),
    navCounselors: document.getElementById("nav-counselors"),
    navRooms: document.getElementById("nav-rooms"),
    navAdmin: document.getElementById("nav-admin"),
    navPendingBadge: document.getElementById("nav-pending-badge"),
    btnBackToBooking: document.getElementById("btn-back-to-booking"),
    btnResetData: document.getElementById("btn-reset-data"),

    // 視圖區塊
    bookingViewWrap: document.getElementById("booking-view-wrap"),
    adminViewWrap: document.getElementById("admin-view-wrap"),
    heroSection: document.getElementById("hero-section"),
    counselorsSection: document.getElementById("counselors-section"),
    roomsSection: document.getElementById("rooms-section"),

    // 預約表單元素
    counselorsGrid: document.getElementById("counselors-selector-grid"),
    roomsGrid: document.getElementById("rooms-selector-grid"),
    dateInput: document.getElementById("booking-date-input"),
    dateQuickBtns: document.getElementById("date-quick-btns"),
    timeSlotsGrid: document.getElementById("time-slots-grid"),
    slotConflictHint: document.getElementById("slot-conflict-hint"),
    clientNameInput: document.getElementById("client-name-input"),
    clientPhoneInput: document.getElementById("client-phone-input"),
    clientTopicInput: document.getElementById("client-topic-input"),
    btnSubmitBooking: document.getElementById("btn-submit-booking"),

    // 側邊摘要卡
    summaryCounselor: document.getElementById("summary-counselor"),
    summaryRoom: document.getElementById("summary-room"),
    summaryDate: document.getElementById("summary-date"),
    summaryTime: document.getElementById("summary-time"),

    // 後台統計與清單
    adminStatPending: document.getElementById("admin-stat-pending"),
    adminStatConfirmed: document.getElementById("admin-stat-confirmed"),
    adminStatToday: document.getElementById("admin-stat-today"),
    adminStatAll: document.getElementById("admin-stat-all"),
    adminBookingsList: document.getElementById("admin-bookings-list"),
    adminSearchInput: document.getElementById("admin-search-input"),
    statusTabBtns: document.querySelectorAll(".status-tab-btn"),

    // 前台展示清單
    counselorsShowcase: document.getElementById("counselors-showcase-grid"),
    roomsShowcase: document.getElementById("rooms-showcase-grid"),

    // 成功彈窗
    bookingSuccessModal: document.getElementById("booking-success-modal"),
    modalBookingId: document.getElementById("modal-booking-id"),
    modalCounselor: document.getElementById("modal-counselor"),
    modalRoom: document.getElementById("modal-room"),
    modalDateTime: document.getElementById("modal-datetime"),
    modalClient: document.getElementById("modal-client"),
    modalStatusBadge: document.getElementById("modal-status-badge"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    modalGoAdminBtn: document.getElementById("modal-go-admin-btn"),

    // 查詢彈窗
    lookupModal: document.getElementById("lookup-modal"),
    btnOpenLookup: document.getElementById("btn-open-lookup"),
    lookupPhoneInput: document.getElementById("lookup-phone-input"),
    btnDoLookup: document.getElementById("btn-do-lookup"),
    lookupResults: document.getElementById("lookup-results"),
    lookupCloseBtn: document.getElementById("lookup-close-btn"),

    // Toast 提示容器
    toastContainer: document.getElementById("toast-container")
  };

  /**
   * 1. 資料初始化與 LocalStorage 管理
   */
  function initData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state.bookings = JSON.parse(saved);
      } else {
        // 第一次造訪：載入示範資料
        state.bookings = window.CLINIC_CONFIG.getInitialDemoBookings();
        saveBookings();
      }
    } catch (e) {
      console.error("讀取 localStorage 失敗，使用初始設定", e);
      state.bookings = window.CLINIC_CONFIG.getInitialDemoBookings();
    }
  }

  function saveBookings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookings));
    } catch (e) {
      console.error("儲存至 localStorage 失敗", e);
    }
    updateNavBadges();
  }

  function resetToDefault() {
    if (confirm("確定要重設回初始示範資料嗎？現有的預約異動將會被還原。")) {
      state.bookings = window.CLINIC_CONFIG.getInitialDemoBookings();
      saveBookings();
      renderTimeSlots();
      renderAdminDashboard();
      showToast("已成功還原為預設示範資料", "success");
    }
  }

  /**
   * 2. 時段衝突檢測演算法 (Core Conflict Logic)
   * 
   * 衝突判定標準：
   * 只有狀態為「待確認」(pending) 或「已確認」(confirmed) 的預約才會占用時段。
   * 「已取消」(cancelled) 的預約視為已釋放時段，不造成衝突。
   * 
   * 衝突類型：
   * 1. 心理師衝突：同一位心理師在同一日期的同一個時段不能有兩筆預約。
   * 2. 實體諮商室衝突：森林室或暖陽室在同一日期的同一個時段不能有兩場諮商（不論是哪位心理師使用）。
   * 3. 線上諮商不占用實體空間，但仍受心理師時間衝突約束。
   */
  function checkSlotConflict(counselorId, roomId, dateStr, timeSlot) {
    if (!dateStr || !timeSlot) {
      return { isBooked: false, reason: "" };
    }

    const targetRoom = window.CLINIC_CONFIG.rooms.find(r => r.id === roomId);
    const isPhysicalRoom = targetRoom && targetRoom.type === "physical";

    for (const b of state.bookings) {
      // 僅計算待確認與已確認之預約
      if (b.status !== "pending" && b.status !== "confirmed") {
        continue;
      }

      if (b.date === dateStr && b.time === timeSlot) {
        // 1. 檢查心理師是否已被預約
        if (counselorId && b.counselorId === counselorId) {
          const statusText = b.status === "confirmed" ? "已確認" : "待確認";
          return {
            isBooked: true,
            reason: `該心理師此時段已有個案預約（狀態：${statusText}）`
          };
        }

        // 2. 若為實體諮商室，檢查空間是否已被占用
        if (isPhysicalRoom && b.roomId === roomId) {
          return {
            isBooked: true,
            reason: `諮商空間「${b.roomName}」該時段已有會談進行中`
          };
        }
      }
    }

    return { isBooked: false, reason: "" };
  }

  /**
   * 3. 畫面渲染：心理師與空間選擇器
   */
  function renderCounselorSelectors() {
    dom.counselorsGrid.innerHTML = "";
    window.CLINIC_CONFIG.counselors.forEach(c => {
      const isSelected = state.selectedCounselorId === c.id;
      const card = document.createElement("div");
      card.className = `counselor-select-card ${isSelected ? "selected" : ""}`;
      card.dataset.id = c.id;

      const specialtiesHtml = c.specialties
        .slice(0, 3)
        .map(s => `<span class="tag-specialty">${escapeHtml(s)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="counselor-card-top">
          <div class="counselor-avatar" style="background-color: ${c.avatarColor};">
            ${escapeHtml(c.name.substring(0, 1))}
          </div>
          <div class="counselor-card-meta">
            <h4>${escapeHtml(c.name)}</h4>
            <p>${escapeHtml(c.title)}</p>
          </div>
        </div>
        <div class="counselor-card-specialties">
          ${specialtiesHtml}
        </div>
        <div class="counselor-card-desc">
          ${escapeHtml(c.intro)}
        </div>
      `;

      card.addEventListener("click", () => {
        state.selectedCounselorId = c.id;
        renderCounselorSelectors();
        renderTimeSlots();
        updateSummary();
      });

      dom.counselorsGrid.appendChild(card);
    });
  }

  function renderRoomSelectors() {
    dom.roomsGrid.innerHTML = "";
    window.CLINIC_CONFIG.rooms.forEach(r => {
      const isSelected = state.selectedRoomId === r.id;
      const card = document.createElement("div");
      card.className = `room-select-card ${isSelected ? "selected" : ""}`;
      card.dataset.id = r.id;

      let iconEmoji = "🌿";
      if (r.id === "room-sun") iconEmoji = "☀️";
      if (r.id === "room-online") iconEmoji = "💻";

      card.innerHTML = `
        <div class="room-card-head">
          <span class="room-badge-icon">${iconEmoji}</span>
          <div>
            <h4>${escapeHtml(r.name)}</h4>
            <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(r.capacity)}</span>
          </div>
        </div>
        <div class="room-card-features">
          ${escapeHtml(r.features.slice(0, 2).join(" · "))}
        </div>
      `;

      card.addEventListener("click", () => {
        state.selectedRoomId = r.id;
        renderRoomSelectors();
        renderTimeSlots();
        updateSummary();
      });

      dom.roomsGrid.appendChild(card);
    });
  }

  /**
   * 4. 畫面渲染：可預約時段網格與即時衝突標記
   */
  function renderTimeSlots() {
    dom.timeSlotsGrid.innerHTML = "";
    let conflictCount = 0;
    let conflictReasons = [];

    window.CLINIC_CONFIG.timeSlots.forEach(slot => {
      const conflict = checkSlotConflict(
        state.selectedCounselorId,
        state.selectedRoomId,
        state.selectedDate,
        slot
      );

      const isSelected = state.selectedTimeSlot === slot;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `time-slot-btn ${conflict.isBooked ? "booked" : ""} ${isSelected && !conflict.isBooked ? "selected" : ""}`;
      btn.dataset.slot = slot;

      if (conflict.isBooked) {
        btn.disabled = true;
        btn.title = conflict.reason;
        btn.innerHTML = `
          <span>${escapeHtml(slot)}</span>
          <span class="slot-status-text">🔒 已額滿</span>
        `;
        conflictCount++;
        if (!conflictReasons.includes(conflict.reason)) {
          conflictReasons.push(conflict.reason);
        }

        // 若原先選中的時段因為變更心理師或空間而衝突，則取消選取
        if (state.selectedTimeSlot === slot) {
          state.selectedTimeSlot = null;
        }
      } else {
        btn.innerHTML = `
          <span>${escapeHtml(slot)}</span>
          <span class="slot-status-text">${isSelected ? "✓ 已選取" : "可預約"}</span>
        `;
        btn.addEventListener("click", () => {
          state.selectedTimeSlot = slot;
          renderTimeSlots();
          updateSummary();
        });
      }

      dom.timeSlotsGrid.appendChild(btn);
    });

    // 衝突提示橫幅
    if (conflictCount > 0) {
      dom.slotConflictHint.innerHTML = `
        <span>ℹ️</span>
        <span>此日期有 <strong>${conflictCount}</strong> 個時段已被預約（${escapeHtml(conflictReasons.join("；"))}），已自動停用無法選取。</span>
      `;
      dom.slotConflictHint.classList.add("visible");
    } else {
      dom.slotConflictHint.classList.remove("visible");
    }

    updateSummary();
  }

  /**
   * 5. 側邊預約摘要與送出按鈕狀態更新
   */
  function updateSummary() {
    const counselor = window.CLINIC_CONFIG.counselors.find(c => c.id === state.selectedCounselorId);
    const room = window.CLINIC_CONFIG.rooms.find(r => r.id === state.selectedRoomId);

    dom.summaryCounselor.textContent = counselor ? counselor.name : "尚未選擇";
    dom.summaryRoom.textContent = room ? room.name : "尚未選擇";
    dom.summaryDate.textContent = state.selectedDate ? state.selectedDate : "尚未選擇";
    dom.summaryTime.textContent = state.selectedTimeSlot ? state.selectedTimeSlot : "尚未選擇";

    const nameVal = dom.clientNameInput.value.trim();
    const phoneVal = dom.clientPhoneInput.value.trim();

    // 檢查是否所有必要資料均已填妥
    const isReady =
      state.selectedCounselorId &&
      state.selectedRoomId &&
      state.selectedDate &&
      state.selectedTimeSlot &&
      nameVal.length >= 2 &&
      phoneVal.length >= 8;

    dom.btnSubmitBooking.disabled = !isReady;
  }

  /**
   * 6. 送出預約處理
   */
  function handleBookingSubmit() {
    const counselor = window.CLINIC_CONFIG.counselors.find(c => c.id === state.selectedCounselorId);
    const room = window.CLINIC_CONFIG.rooms.find(r => r.id === state.selectedRoomId);
    const name = dom.clientNameInput.value.trim();
    const phone = dom.clientPhoneInput.value.trim();
    const topic = dom.clientTopicInput.value.trim();

    if (!counselor || !room || !state.selectedDate || !state.selectedTimeSlot || !name || !phone) {
      alert("請完整填寫心理師、空間、日期時間及聯絡資訊！");
      return;
    }

    // 再次確保該時段未被搶先預約
    const conflict = checkSlotConflict(
      state.selectedCounselorId,
      state.selectedRoomId,
      state.selectedDate,
      state.selectedTimeSlot
    );

    if (conflict.isBooked) {
      alert(`很抱歉，該時段剛剛已被預約：${conflict.reason}，請選擇其他時段。`);
      renderTimeSlots();
      return;
    }

    // 產生預約編號
    const dateCode = state.selectedDate.replace(/-/g, "");
    const randomSuffix = String(Math.floor(100 + Math.random() * 900));
    const bookingId = `BK-${dateCode}-${randomSuffix}`;

    const newBooking = {
      id: bookingId,
      counselorId: counselor.id,
      counselorName: counselor.name,
      roomId: room.id,
      roomName: room.name,
      date: state.selectedDate,
      time: state.selectedTimeSlot,
      clientName: name,
      clientPhone: phone,
      topic: topic || "一般心理會談與生活調適",
      status: "pending", // 預設狀態：待確認
      createdAt: new Date().toISOString(),
      adminNote: ""
    };

    // 加入預約清單
    state.bookings.unshift(newBooking);
    saveBookings();

    // 顯示成功彈窗
    dom.modalBookingId.textContent = newBooking.id;
    dom.modalCounselor.textContent = newBooking.counselorName;
    dom.modalRoom.textContent = newBooking.roomName;
    dom.modalDateTime.textContent = `${newBooking.date} ${newBooking.time}`;
    dom.modalClient.textContent = `${newBooking.clientName} (${newBooking.clientPhone})`;
    dom.bookingSuccessModal.classList.add("active");

    // 清空表單與選取時段
    dom.clientNameInput.value = "";
    dom.clientPhoneInput.value = "";
    dom.clientTopicInput.value = "";
    state.selectedTimeSlot = null;

    renderTimeSlots();
    renderAdminDashboard();
    showToast("預約申請已成功送出！狀態為「待確認」", "success");
  }

  /**
   * 7. 管理後台渲染與操作 (Admin Dashboard)
   */
  function renderAdminDashboard() {
    const allBookings = state.bookings;
    const todayStr = getTodayString(0);

    // 計算各狀態數量
    const pendingCount = allBookings.filter(b => b.status === "pending").length;
    const confirmedCount = allBookings.filter(b => b.status === "confirmed").length;
    const cancelledCount = allBookings.filter(b => b.status === "cancelled").length;
    const todayCount = allBookings.filter(b => b.date === todayStr && b.status !== "cancelled").length;

    dom.adminStatPending.textContent = pendingCount;
    dom.adminStatConfirmed.textContent = confirmedCount;
    dom.adminStatToday.textContent = todayCount;
    dom.adminStatAll.textContent = allBookings.length;

    // 更新篩選標籤按鈕數量
    dom.statusTabBtns.forEach(btn => {
      const status = btn.dataset.status;
      const countSpan = btn.querySelector(".count");
      if (countSpan) {
        if (status === "all") countSpan.textContent = allBookings.length;
        if (status === "pending") countSpan.textContent = pendingCount;
        if (status === "confirmed") countSpan.textContent = confirmedCount;
        if (status === "cancelled") countSpan.textContent = cancelledCount;
      }
    });

    // 篩選預約清單
    let filtered = allBookings.filter(b => {
      if (state.adminFilterStatus !== "all" && b.status !== state.adminFilterStatus) {
        return false;
      }
      if (state.adminSearchQuery) {
        const q = state.adminSearchQuery.toLowerCase();
        const matchName = b.clientName.toLowerCase().includes(q);
        const matchPhone = b.clientPhone.includes(q);
        const matchId = b.id.toLowerCase().includes(q);
        const matchCounselor = b.counselorName.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchId && !matchCounselor) {
          return false;
        }
      }
      return true;
    });

    // 依日期與時段排序（由近到遠）
    filtered.sort((a, b) => {
      const dateA = a.date + " " + a.time;
      const dateB = b.date + " " + b.time;
      return dateA.localeCompare(dateB);
    });

    dom.adminBookingsList.innerHTML = "";

    if (filtered.length === 0) {
      dom.adminBookingsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>目前沒有符合條件的預約紀錄</h3>
          <p>可嘗試切換上方狀態標籤或清除搜尋關鍵字。</p>
        </div>
      `;
      return;
    }

    filtered.forEach(b => {
      const card = document.createElement("div");
      card.className = "booking-item-card";

      let statusClass = "pending";
      let statusTitle = "待確認";
      let statusSub = "尚未排入正式諮商";

      if (b.status === "confirmed") {
        statusClass = "confirmed";
        statusTitle = "已確認";
        statusSub = "時段正式保留";
      } else if (b.status === "cancelled") {
        statusClass = "cancelled";
        statusTitle = "已取消";
        statusSub = "時段已釋出開放預約";
      }

      // 操作按鈕邏輯
      let actionButtons = "";
      if (b.status === "pending") {
        actionButtons = `
          <button class="btn-action-confirm" data-id="${b.id}" title="確認預約，正式成立時段">
            ✓ 確認預約
          </button>
          <button class="btn-action-cancel" data-id="${b.id}" title="取消此筆預約">
            ✕ 取消
          </button>
        `;
      } else if (b.status === "confirmed") {
        actionButtons = `
          <button class="btn-action-cancel" data-id="${b.id}" title="取消此預約，時段將重新開放">
            ✕ 取消預約
          </button>
        `;
      } else if (b.status === "cancelled") {
        actionButtons = `
          <button class="btn-secondary" style="font-size:0.8rem; padding:6px 12px;" data-restore-id="${b.id}">
            ↩ 恢復為待確認
          </button>
          <button class="btn-action-delete" data-del-id="${b.id}" title="永久刪除此紀錄">
            🗑
          </button>
        `;
      }

      const createdTimeStr = new Date(b.createdAt).toLocaleString("zh-TW", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });

      card.innerHTML = `
        <div class="booking-item-status ${statusClass}">
          <span class="status-badge-text">${statusTitle}</span>
          <span class="status-badge-sub">${statusSub}</span>
        </div>

        <div class="booking-item-main">
          <div class="booking-main-top">
            <span class="booking-client-name">${escapeHtml(b.clientName)}</span>
            <span class="booking-client-phone">📞 ${escapeHtml(b.clientPhone)}</span>
            <span class="booking-id-tag">${escapeHtml(b.id)}</span>
            <span style="font-size:0.75rem; color:var(--text-muted); margin-left:auto;">
              申請於 ${createdTimeStr}
            </span>
          </div>

          <div class="booking-main-details">
            <span class="detail-badge">
              👤 心理師：<strong>${escapeHtml(b.counselorName)}</strong>
            </span>
            <span class="detail-badge">
              🛋 諮商室：<strong>${escapeHtml(b.roomName)}</strong>
            </span>
            <span class="detail-badge highlight-time">
              📅 ${escapeHtml(b.date)} (${getDayOfWeekStr(b.date)}) ${escapeHtml(b.time)}
            </span>
          </div>

          ${b.topic ? `
            <div class="booking-topic-box">
              <strong>諮商主題：</strong> ${escapeHtml(b.topic)}
              ${b.adminNote ? `<br><strong style="color:var(--primary);">管理註記：</strong> ${escapeHtml(b.adminNote)}` : ""}
            </div>
          ` : ""}
        </div>

        <div class="booking-item-actions">
          ${actionButtons}
        </div>
      `;

      // 綁定操作按鈕事件
      const confirmBtn = card.querySelector(".btn-action-confirm");
      if (confirmBtn) {
        confirmBtn.addEventListener("click", () => updateBookingStatus(b.id, "confirmed"));
      }

      const cancelBtn = card.querySelector(".btn-action-cancel");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
          if (confirm(`確定要取消「${b.clientName}」於 ${b.date} ${b.time} 的預約嗎？\n取消後該時段將釋出供其他人預約。`)) {
            updateBookingStatus(b.id, "cancelled");
          }
        });
      }

      const restoreBtn = card.querySelector("[data-restore-id]");
      if (restoreBtn) {
        restoreBtn.addEventListener("click", () => updateBookingStatus(b.id, "pending"));
      }

      const deleteBtn = card.querySelector("[data-del-id]");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          if (confirm(`確定要完全刪除預約編號 ${b.id} 嗎？`)) {
            deleteBooking(b.id);
          }
        });
      }

      dom.adminBookingsList.appendChild(card);
    });
  }

  /**
   * 8. 狀態更新與刪除操作
   */
  function updateBookingStatus(id, newStatus) {
    const booking = state.bookings.find(b => b.id === id);
    if (!booking) return;

    booking.status = newStatus;
    saveBookings();
    renderAdminDashboard();
    renderTimeSlots();

    if (newStatus === "confirmed") {
      showToast(`預約【${booking.clientName}】已確認成立！`, "success");
    } else if (newStatus === "cancelled") {
      showToast(`預約【${booking.clientName}】已取消，時段已重新釋出。`, "warning");
    } else if (newStatus === "pending") {
      showToast(`預約【${booking.clientName}】已恢復為待確認。`, "success");
    }
  }

  function deleteBooking(id) {
    state.bookings = state.bookings.filter(b => b.id !== id);
    saveBookings();
    renderAdminDashboard();
    renderTimeSlots();
    showToast("預約紀錄已刪除", "warning");
  }

  function updateNavBadges() {
    const pendingCount = state.bookings.filter(b => b.status === "pending").length;
    if (pendingCount > 0) {
      dom.navPendingBadge.textContent = pendingCount;
      dom.navPendingBadge.style.display = "inline-block";
    } else {
      dom.navPendingBadge.style.display = "none";
    }
  }

  /**
   * 9. 前台展示區塊渲染（心理師與空間卡片）
   */
  function renderShowcases() {
    // 心理師展示
    dom.counselorsShowcase.innerHTML = "";
    window.CLINIC_CONFIG.counselors.forEach(c => {
      const card = document.createElement("div");
      card.className = "counselor-profile-card";

      const specsHtml = c.specialties
        .map(s => `<span class="tag-specialty" style="background:#EBF2ED; color:#2C523C;">${escapeHtml(s)}</span>`)
        .join("");

      const expHtml = c.experience
        .map(e => `<li>· ${escapeHtml(e)}</li>`)
        .join("");

      card.innerHTML = `
        <div class="profile-top">
          <div class="profile-avatar-large" style="background-color: ${c.avatarColor};">
            ${escapeHtml(c.name.substring(0, 1))}
          </div>
          <div class="profile-meta">
            <h3>${escapeHtml(c.name)}</h3>
            <p>${escapeHtml(c.title)} · ${escapeHtml(c.education)}</p>
            <span class="license-tag">${escapeHtml(c.license)}</span>
          </div>
        </div>
        <div class="profile-specialties">
          ${specsHtml}
        </div>
        <p class="profile-intro">${escapeHtml(c.intro)}</p>
        <ul class="profile-experience-list">
          ${expHtml}
        </ul>
        <button type="button" class="btn-select-counselor-direct" data-id="${c.id}">
          選擇 ${escapeHtml(c.name)} 心理師並預約 →
        </button>
      `;

      card.querySelector(".btn-select-counselor-direct").addEventListener("click", () => {
        state.selectedCounselorId = c.id;
        renderCounselorSelectors();
        renderTimeSlots();
        updateSummary();
        dom.bookingViewWrap.scrollIntoView({ behavior: "smooth" });
      });

      dom.counselorsShowcase.appendChild(card);
    });

    // 空間展示
    dom.roomsShowcase.innerHTML = "";
    window.CLINIC_CONFIG.rooms.forEach(r => {
      const card = document.createElement("div");
      card.className = "room-showcase-card";

      let bannerClass = "forest";
      let bannerEmoji = "🌲";
      if (r.id === "room-sun") {
        bannerClass = "sun";
        bannerEmoji = "☀️";
      } else if (r.id === "room-online") {
        bannerClass = "online";
        bannerEmoji = "🌐";
      }

      const featuresHtml = r.features
        .map(f => `<span class="feature-pill">✓ ${escapeHtml(f)}</span>`)
        .join("");

      card.innerHTML = `
        <div class="room-visual-banner ${bannerClass}">
          <span>${bannerEmoji}</span>
        </div>
        <h3>
          <span>${escapeHtml(r.name)}</span>
          <span class="room-capacity-badge">${escapeHtml(r.capacity)}</span>
        </h3>
        <p style="font-size:0.9rem; color:var(--text-secondary); line-height:1.6;">
          ${escapeHtml(r.description)}
        </p>
        <div class="room-features-pill-list">
          ${featuresHtml}
        </div>
      `;

      dom.roomsShowcase.appendChild(card);
    });
  }

  /**
   * 10. 個案電話預約自我查詢
   */
  function handleClientLookup() {
    const phone = dom.lookupPhoneInput.value.trim();
    if (!phone) {
      alert("請輸入您的聯絡電話進行查詢！");
      return;
    }

    const matches = state.bookings.filter(b => b.clientPhone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
    dom.lookupResults.innerHTML = "";

    if (matches.length === 0) {
      dom.lookupResults.innerHTML = `
        <div style="text-align:center; padding:20px; color:var(--text-secondary);">
          查無電話 <strong>${escapeHtml(phone)}</strong> 的預約紀錄。<br>
          請確認電話是否輸入正確，或直接來電診所由專人為您查詢。
        </div>
      `;
      return;
    }

    matches.forEach(b => {
      let statusBadge = "";
      if (b.status === "confirmed") {
        statusBadge = '<span style="background:#DCFCE7; color:#166534; padding:3px 8px; border-radius:12px; font-weight:700; font-size:0.8rem;">已確認成立</span>';
      } else if (b.status === "pending") {
        statusBadge = '<span style="background:#FEF3C7; color:#B45309; padding:3px 8px; border-radius:12px; font-weight:700; font-size:0.8rem;">待管理員確認</span>';
      } else {
        statusBadge = '<span style="background:#F1F5F9; color:#64748B; padding:3px 8px; border-radius:12px; font-weight:700; font-size:0.8rem;">已取消</span>';
      }

      const item = document.createElement("div");
      item.style.cssText = "background:#FAF8F4; border:1px solid #E8E3D9; border-radius:10px; padding:14px; margin-bottom:10px;";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="color:var(--text-primary); font-size:1rem;">${escapeHtml(b.id)}</strong>
          ${statusBadge}
        </div>
        <div style="font-size:0.88rem; color:var(--text-secondary); line-height:1.6;">
          <div>👤 心理師：${escapeHtml(b.counselorName)}</div>
          <div>🛋 空間：${escapeHtml(b.roomName)}</div>
          <div>📅 日期時段：<strong>${escapeHtml(b.date)} ${escapeHtml(b.time)}</strong></div>
          ${b.adminNote ? `<div style="color:var(--primary); margin-top:4px;">💬 診所附註：${escapeHtml(b.adminNote)}</div>` : ""}
        </div>
      `;
      dom.lookupResults.appendChild(item);
    });
  }

  /**
   * 11. 視圖切換與導航控制
   */
  function switchView(viewName) {
    state.currentView = viewName;
    if (viewName === "admin") {
      dom.bookingViewWrap.classList.add("hidden");
      dom.heroSection.style.display = "none";
      dom.counselorsSection.style.display = "none";
      dom.roomsSection.style.display = "none";
      dom.adminViewWrap.classList.add("active");

      dom.navBooking.classList.remove("active");
      dom.navAdmin.classList.add("active");
      renderAdminDashboard();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      dom.bookingViewWrap.classList.remove("hidden");
      dom.heroSection.style.display = "block";
      dom.counselorsSection.style.display = "block";
      dom.roomsSection.style.display = "block";
      dom.adminViewWrap.classList.remove("active");

      dom.navBooking.classList.add("active");
      dom.navAdmin.classList.remove("active");
      renderTimeSlots();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /**
   * 12. Toast 訊息提示元件
   */
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    let icon = "🔔";
    if (type === "success") icon = "✅";
    if (type === "warning") icon = "⚠️";
    if (type === "danger") icon = "🛑";

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 20);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /**
   * 工具輔助函式
   */
  function getTodayString(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getDayOfWeekStr(dateStr) {
    const days = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const d = new Date(dateStr + "T00:00:00");
    return days[d.getDay()] || "";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * 13. 初始化事件監聽
   */
  function setupEventListeners() {
    // 導航列切換
    dom.navBooking.addEventListener("click", e => {
      e.preventDefault();
      switchView("booking");
      dom.bookingViewWrap.scrollIntoView({ behavior: "smooth" });
    });

    dom.navAdmin.addEventListener("click", e => {
      e.preventDefault();
      switchView("admin");
    });

    dom.btnBackToBooking.addEventListener("click", () => switchView("booking"));
    dom.btnResetData.addEventListener("click", resetToDefault);

    // 錨點平滑滾動
    dom.navCounselors.addEventListener("click", e => {
      if (state.currentView !== "booking") switchView("booking");
      dom.counselorsSection.scrollIntoView({ behavior: "smooth" });
    });

    dom.navRooms.addEventListener("click", e => {
      if (state.currentView !== "booking") switchView("booking");
      dom.roomsSection.scrollIntoView({ behavior: "smooth" });
    });

    // 日期選取器設定
    const minDate = getTodayString(0);
    const maxDate = getTodayString(60);
    dom.dateInput.min = minDate;
    dom.dateInput.max = maxDate;
    dom.dateInput.value = state.selectedDate;

    dom.dateInput.addEventListener("change", e => {
      state.selectedDate = e.target.value;
      updateQuickDateButtons();
      renderTimeSlots();
      updateSummary();
    });

    // 快捷日期按鈕產生（今天、明天、後天、大後天）
    const quickOffsets = [
      { label: "今天", offset: 0 },
      { label: "明天", offset: 1 },
      { label: "後天", offset: 2 },
      { label: "3天後", offset: 3 }
    ];

    dom.dateQuickBtns.innerHTML = "";
    quickOffsets.forEach(item => {
      const dateVal = getTodayString(item.offset);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `quick-btn ${state.selectedDate === dateVal ? "active" : ""}`;
      btn.textContent = `${item.label} (${dateVal.slice(5)})`;
      btn.dataset.date = dateVal;

      btn.addEventListener("click", () => {
        state.selectedDate = dateVal;
        dom.dateInput.value = dateVal;
        updateQuickDateButtons();
        renderTimeSlots();
        updateSummary();
      });

      dom.dateQuickBtns.appendChild(btn);
    });

    function updateQuickDateButtons() {
      dom.dateQuickBtns.querySelectorAll(".quick-btn").forEach(btn => {
        if (btn.dataset.date === state.selectedDate) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    // 表單輸入即時驗證
    dom.clientNameInput.addEventListener("input", updateSummary);
    dom.clientPhoneInput.addEventListener("input", updateSummary);

    // 送出預約
    dom.btnSubmitBooking.addEventListener("click", handleBookingSubmit);

    // 成功彈窗關閉與前往後台
    dom.modalCloseBtn.addEventListener("click", () => {
      dom.bookingSuccessModal.classList.remove("active");
    });

    dom.modalGoAdminBtn.addEventListener("click", () => {
      dom.bookingSuccessModal.classList.remove("active");
      switchView("admin");
    });

    // 後台狀態標籤按鈕
    dom.statusTabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        dom.statusTabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.adminFilterStatus = btn.dataset.status;
        renderAdminDashboard();
      });
    });

    // 後台搜尋
    dom.adminSearchInput.addEventListener("input", e => {
      state.adminSearchQuery = e.target.value.trim();
      renderAdminDashboard();
    });

    // 查詢預約彈窗
    dom.btnOpenLookup.addEventListener("click", () => {
      dom.lookupModal.classList.add("active");
      dom.lookupPhoneInput.focus();
    });

    dom.lookupCloseBtn.addEventListener("click", () => {
      dom.lookupModal.classList.remove("active");
    });

    dom.btnDoLookup.addEventListener("click", handleClientLookup);
    dom.lookupPhoneInput.addEventListener("keyup", e => {
      if (e.key === "Enter") handleClientLookup();
    });
  }

  /**
   * 應用程式啟動入口
   */
  function start() {
    initData();

    // 預設選取第一位心理師、第一間空間、以及明天日期
    state.selectedCounselorId = window.CLINIC_CONFIG.counselors[0].id;
    state.selectedRoomId = window.CLINIC_CONFIG.rooms[0].id;
    state.selectedDate = getTodayString(1);

    renderCounselorSelectors();
    renderRoomSelectors();
    setupEventListeners();
    renderTimeSlots();
    renderShowcases();
    renderAdminDashboard();
    updateSummary();
    updateNavBadges();
  }

  // DOM 載入後啟動
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
