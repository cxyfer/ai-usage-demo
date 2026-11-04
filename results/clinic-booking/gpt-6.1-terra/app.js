(() => {
  const { therapists, rooms, schedule } = window.CLINIC_DATA;
  const storageKey = "sunnyday-appointments-v1";
  const statusNames = { pending: "待確認", confirmed: "已確認", cancelled: "已取消" };
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  const state = {
    therapistId: "",
    date: "",
    time: "",
    roomId: "",
    pageOffset: 0,
    filter: "all",
    appointments: [],
    storageError: false
  };

  const element = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dateFromString = (value) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  };
  const today = () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  };
  const addDays = (date, count) => {
    const result = new Date(date);
    result.setDate(result.getDate() + count);
    return result;
  };
  const dateLabel = (value) => {
    if (!value) return "尚未選擇";
    const date = dateFromString(value);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（週${weekdays[date.getDay()]}）`;
  };
  const minutes = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
  };
  const isPast = (date, time) => {
    const start = dateFromString(date);
    const [hour, minute] = time.split(":").map(Number);
    start.setHours(hour, minute, 0, 0);
    return start <= new Date();
  };
  const isDateOpen = (date) => schedule.availableDays.includes(date.getDay());
  const therapistById = (id) => therapists.find((therapist) => therapist.id === id);
  const roomById = (id) => rooms.find((room) => room.id === id);
  const active = (appointment) => appointment.status === "pending" || appointment.status === "confirmed";
  const overlaps = (appointment, date, time) => {
    if (!active(appointment) || appointment.date !== date) return false;
    const start = minutes(time);
    const existingStart = minutes(appointment.time);
    const existingDuration = Number(appointment.durationMinutes) || schedule.sessionMinutes;
    return start < existingStart + existingDuration && existingStart < start + schedule.sessionMinutes;
  };
  const therapistBusy = (date, time, therapistId) => state.appointments.some((appointment) =>
    appointment.therapistId === therapistId && overlaps(appointment, date, time)
  );
  const roomBusy = (date, time, room) => room.exclusive !== false && state.appointments.some((appointment) =>
    appointment.roomId === room.id && overlaps(appointment, date, time)
  );
  const roomAvailable = (date, time, therapistId, room) => !therapistBusy(date, time, therapistId) && !roomBusy(date, time, room);
  const timeAvailable = (date, time, therapistId) => Boolean(date && therapistId && !isPast(date, time) &&
    rooms.some((room) => roomAvailable(date, time, therapistId, room)));

  function readAppointments() {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(parsed)) throw new Error("Invalid data");
      state.appointments = parsed;
      state.storageError = false;
      return true;
    } catch {
      state.storageError = true;
      return false;
    }
  }

  function saveAppointments(appointments) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(appointments));
      state.appointments = appointments;
      state.storageError = false;
      return true;
    } catch {
      state.storageError = true;
      return false;
    }
  }

  function showMessage(message, error = false) {
    const target = element("form-message");
    target.textContent = message;
    target.classList.toggle("error", error);
    target.hidden = false;
  }

  function clearMessage() {
    element("form-message").hidden = true;
  }

  function firstOpenDate() {
    for (let offset = 0; offset < schedule.bookingWindowDays; offset += 1) {
      const date = addDays(today(), offset);
      if (isDateOpen(date) && schedule.timeSlots.some((time) => !isPast(localDate(date), time))) return localDate(date);
    }
    return "";
  }

  function renderTherapists() {
    const container = element("therapist-cards");
    container.innerHTML = "";
    therapists.forEach((therapist) => {
      const card = document.createElement("article");
      card.className = "therapist-card";
      card.innerHTML = `
        <div class="therapist-photo" role="img" aria-label="${escapeHtml(therapist.name)}心理師的示範照片"></div>
        <div class="therapist-card-content">
          <div class="therapist-name-line"><h3>${escapeHtml(therapist.name)}</h3><span>${escapeHtml(therapist.title)}</span></div>
          <div class="specialties">${therapist.specialties.map((specialty) => `<span>${escapeHtml(specialty)}</span>`).join("")}</div>
          <p class="therapist-bio">${escapeHtml(therapist.introduction)}</p>
          <button class="select-therapist" type="button" data-therapist="${escapeHtml(therapist.id)}">選擇這位心理師 <span aria-hidden="true">→</span></button>
        </div>`;
      const photo = card.querySelector(".therapist-photo");
      photo.style.backgroundImage = `url(${JSON.stringify(therapist.photo)})`;
      photo.style.setProperty("--photo-size", therapist.photoSize || "cover");
      photo.style.setProperty("--photo-mobile-size", therapist.photoSize === "300% auto" ? "auto 100%" : therapist.photoSize || "cover");
      photo.style.backgroundPosition = therapist.photoPosition || "center";
      container.appendChild(card);
    });
  }

  function renderTherapistChoices() {
    element("therapist-choices").innerHTML = therapists.map((therapist) => `
      <button class="choice-button" type="button" data-therapist="${escapeHtml(therapist.id)}" aria-pressed="${state.therapistId === therapist.id}">${escapeHtml(therapist.name)}</button>`).join("");
  }

  function renderCalendar() {
    const start = addDays(today(), state.pageOffset);
    const end = addDays(start, Math.min(6, schedule.bookingWindowDays - state.pageOffset - 1));
    element("calendar-range").textContent = `${start.getFullYear()} 年 ${start.getMonth() + 1} 月 ${start.getDate()} 日 - ${end.getMonth() + 1} 月 ${end.getDate()} 日`;
    element("previous-week").disabled = state.pageOffset === 0;
    element("next-week").disabled = state.pageOffset + 7 >= schedule.bookingWindowDays;
    element("date-choices").innerHTML = Array.from({ length: Math.min(7, schedule.bookingWindowDays - state.pageOffset) }, (_, index) => {
      const date = addDays(start, index);
      const value = localDate(date);
      const open = isDateOpen(date) && schedule.timeSlots.some((time) => !isPast(value, time));
      const label = !open ? "休息" : value === localDate(today()) ? "今天" : `${date.getMonth() + 1}月`;
      return `<button class="date-button" type="button" data-date="${value}" aria-label="${dateLabel(value)}${open ? "" : "，無可預約時段"}" aria-pressed="${state.date === value}" ${open ? "" : "disabled"}><span>週${weekdays[date.getDay()]}</span><strong>${date.getDate()}</strong><span class="date-label">${label}</span></button>`;
    }).join("");
  }

  function renderTimes() {
    element("session-length").textContent = `每次 ${schedule.sessionMinutes} 分鐘`;
    element("time-choices").innerHTML = schedule.timeSlots.map((time) => {
      const past = state.date && isPast(state.date, time);
      const unavailable = state.date && state.therapistId && !past && !timeAvailable(state.date, time, state.therapistId);
      const enabled = !state.storageError && timeAvailable(state.date, time, state.therapistId);
      const sublabel = past ? "已過" : unavailable ? "已預約" : "";
      return `<button class="time-button" type="button" data-time="${escapeHtml(time)}" aria-pressed="${state.time === time}" ${enabled ? "" : "disabled"}>${escapeHtml(time)}${sublabel ? `<small>${sublabel}</small>` : ""}</button>`;
    }).join("");
    element("time-hint").textContent = state.storageError ? "無法讀取瀏覽器資料，請確認瀏覽器允許本機儲存。" : !state.therapistId ? "請先選擇心理師。" : !state.date ? "目前沒有可預約的日期。" : "灰色時段無法預約。";
  }

  function renderRooms() {
    element("room-choices").innerHTML = rooms.map((room) => {
      const selectedTime = Boolean(state.date && state.time && state.therapistId);
      const enabled = selectedTime && !state.storageError && roomAvailable(state.date, state.time, state.therapistId, room);
      const description = selectedTime && !enabled ? "已預約" : room.description;
      return `<button class="choice-button" type="button" data-room="${escapeHtml(room.id)}" aria-pressed="${state.roomId === room.id}" ${enabled ? "" : "disabled"}>${escapeHtml(room.name)}<small>${escapeHtml(description)}</small></button>`;
    }).join("");
    element("room-hint").textContent = state.time ? "灰色選項在此時段無法預約。" : "選擇時間後，可查看各諮商方式的空位。";
  }

  function renderSummary() {
    element("summary-therapist").textContent = therapistById(state.therapistId)?.name || "尚未選擇";
    element("summary-date").textContent = dateLabel(state.date);
    element("summary-time").textContent = state.time || "尚未選擇";
    element("summary-room").textContent = roomById(state.roomId)?.name || "尚未選擇";
  }

  function refreshBooking() {
    if (state.time && !timeAvailable(state.date, state.time, state.therapistId)) {
      state.time = "";
      state.roomId = "";
    }
    const room = roomById(state.roomId);
    if (room && state.time && !roomAvailable(state.date, state.time, state.therapistId, room)) state.roomId = "";
    renderTherapistChoices();
    renderCalendar();
    renderTimes();
    renderRooms();
    renderSummary();
  }

  function renderAdmin() {
    const counts = {
      all: state.appointments.length,
      pending: state.appointments.filter((appointment) => appointment.status === "pending").length,
      confirmed: state.appointments.filter((appointment) => appointment.status === "confirmed").length
    };
    element("booking-stats").innerHTML = [["全部預約", counts.all], ["待確認", counts.pending], ["已確認", counts.confirmed]].map(([label, count]) => `<div class="stat"><span>${label}</span><strong>${count}</strong></div>`).join("");
    element("status-filters").innerHTML = [["all", "全部"], ["pending", "待確認"], ["confirmed", "已確認"], ["cancelled", "已取消"]].map(([id, label]) => `<button class="filter-button" type="button" data-filter="${id}" aria-pressed="${state.filter === id}">${label}</button>`).join("");
    const filtered = state.appointments.filter((appointment) => state.filter === "all" || appointment.status === state.filter)
      .slice().sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));
    const list = element("appointment-list");
    if (state.storageError) {
      list.innerHTML = '<div class="empty-state"><strong>無法讀取預約資料</strong><span>請確認瀏覽器允許本機儲存，並保留原有資料。</span></div>';
      return;
    }
    if (!filtered.length) {
      list.innerHTML = '<div class="empty-state"><strong>目前沒有預約</strong><span>新的預約會顯示在這裡。</span></div>';
      return;
    }
    list.innerHTML = filtered.map((appointment) => {
      const date = dateFromString(appointment.date);
      const therapistName = therapistById(appointment.therapistId)?.name || appointment.therapistName || "已移除的心理師";
      const roomName = roomById(appointment.roomId)?.name || appointment.roomName || "已移除的諮商方式";
      const status = statusNames[appointment.status] ? appointment.status : "cancelled";
      const actions = appointment.status === "pending" ? `<button class="action-button confirm" type="button" data-action="confirm" data-id="${escapeHtml(appointment.id)}">確認</button>` : "";
      const cancel = active(appointment) ? `<button class="action-button" type="button" data-action="cancel" data-id="${escapeHtml(appointment.id)}">取消</button>` : "";
      return `<article class="appointment-row">
        <div class="appointment-date">${date.getMonth() + 1}/${date.getDate()}<span>${date.getFullYear()} · ${escapeHtml(appointment.time)}</span></div>
        <div><div class="appointment-person"><strong>${escapeHtml(appointment.clientName)}</strong><span class="status-badge status-${status}">${statusNames[status]}</span></div>
        <div class="appointment-detail">${escapeHtml(therapistName)} · ${escapeHtml(roomName)} · ${escapeHtml(appointment.clientPhone)}</div></div>
        <div class="appointment-actions">${actions}${cancel}</div>
      </article>`;
    }).join("");
  }

  function showAdmin() {
    readAppointments();
    renderAdmin();
    element("public-view").hidden = true;
    element("admin-view").hidden = false;
    window.scrollTo(0, 0);
  }

  function showPublic() {
    element("admin-view").hidden = true;
    element("public-view").hidden = false;
    readAppointments();
    refreshBooking();
  }

  function chooseTherapist(id) {
    if (!therapistById(id)) return;
    state.therapistId = id;
    state.time = "";
    state.roomId = "";
    clearMessage();
    refreshBooking();
  }

  element("therapist-cards").addEventListener("click", (event) => {
    const button = event.target.closest("[data-therapist]");
    if (!button) return;
    chooseTherapist(button.dataset.therapist);
    element("booking").scrollIntoView({ behavior: "smooth" });
  });
  element("therapist-choices").addEventListener("click", (event) => {
    const button = event.target.closest("[data-therapist]");
    if (button) chooseTherapist(button.dataset.therapist);
  });
  element("previous-week").addEventListener("click", () => {
    state.pageOffset = Math.max(0, state.pageOffset - 7);
    renderCalendar();
  });
  element("next-week").addEventListener("click", () => {
    if (state.pageOffset + 7 < schedule.bookingWindowDays) state.pageOffset += 7;
    renderCalendar();
  });
  element("date-choices").addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button || button.disabled) return;
    state.date = button.dataset.date;
    state.time = "";
    state.roomId = "";
    clearMessage();
    refreshBooking();
  });
  element("time-choices").addEventListener("click", (event) => {
    const button = event.target.closest("[data-time]");
    if (!button || button.disabled) return;
    state.time = button.dataset.time;
    state.roomId = "";
    clearMessage();
    refreshBooking();
  });
  element("room-choices").addEventListener("click", (event) => {
    const button = event.target.closest("[data-room]");
    if (!button || button.disabled) return;
    state.roomId = button.dataset.room;
    clearMessage();
    refreshBooking();
  });

  element("booking-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!readAppointments()) {
      showMessage("無法讀取或儲存預約資料，請確認瀏覽器允許本機儲存。", true);
      refreshBooking();
      return;
    }
    const therapist = therapistById(state.therapistId);
    const room = roomById(state.roomId);
    if (!therapist || !state.date || !state.time || !room) {
      showMessage("請先選擇心理師、日期、時間和諮商方式。", true);
      return;
    }
    const chosenDate = dateFromString(state.date);
    const lastDate = addDays(today(), schedule.bookingWindowDays - 1);
    if (chosenDate < today() || chosenDate > lastDate || !isDateOpen(chosenDate) || !schedule.timeSlots.includes(state.time) || !timeAvailable(state.date, state.time, therapist.id) || !roomAvailable(state.date, state.time, therapist.id, room)) {
      state.time = "";
      state.roomId = "";
      refreshBooking();
      showMessage("這個時段已無法預約，請重新選擇時間或諮商方式。", true);
      return;
    }
    const nameInput = element("client-name");
    const phoneInput = element("client-phone");
    const clientName = nameInput.value.trim();
    const clientPhone = phoneInput.value.trim();
    if (!clientName) {
      showMessage("請填寫姓名。", true);
      nameInput.focus();
      return;
    }
    if (!/^[0-9+()\-\s]+$/.test(clientPhone) || clientPhone.replace(/\D/g, "").length < 7) {
      showMessage("請填寫有效的聯絡電話，至少需要 7 位數字。", true);
      phoneInput.focus();
      return;
    }
    const appointment = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      therapistId: therapist.id,
      therapistName: therapist.name,
      date: state.date,
      time: state.time,
      durationMinutes: schedule.sessionMinutes,
      roomId: room.id,
      roomName: room.name,
      clientName,
      clientPhone,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    if (!saveAppointments([...state.appointments, appointment])) {
      showMessage("無法儲存預約，請確認瀏覽器允許本機儲存後再試。", true);
      refreshBooking();
      return;
    }
    nameInput.value = "";
    phoneInput.value = "";
    state.time = "";
    state.roomId = "";
    refreshBooking();
    showMessage("預約已儲存，狀態為待確認。示範版不會通知診所；請到「預約管理」查看。");
  });

  element("open-admin").addEventListener("click", showAdmin);
  element("back-to-site").addEventListener("click", () => {
    showPublic();
    window.scrollTo(0, 0);
  });
  document.querySelectorAll("[data-public-link]").forEach((link) => link.addEventListener("click", showPublic));
  element("status-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    renderAdmin();
  });
  element("appointment-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    if (!readAppointments()) {
      renderAdmin();
      return;
    }
    const appointment = state.appointments.find((item) => item.id === button.dataset.id);
    if (!appointment) {
      renderAdmin();
      return;
    }
    if (button.dataset.action === "cancel" && active(appointment)) {
      if (!window.confirm("確定要取消這筆預約嗎？取消後時段會重新開放。")) return;
      appointment.status = "cancelled";
    } else if (button.dataset.action === "confirm" && appointment.status === "pending") {
      appointment.status = "confirmed";
    } else {
      renderAdmin();
      return;
    }
    if (!saveAppointments(state.appointments)) window.alert("無法儲存變更，請確認瀏覽器允許本機儲存後再試。");
    renderAdmin();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    readAppointments();
    refreshBooking();
    renderAdmin();
  });

  readAppointments();
  state.date = firstOpenDate();
  if (state.date) {
    const daysUntilSelection = Math.round((dateFromString(state.date) - today()) / 86400000);
    state.pageOffset = Math.floor(daysUntilSelection / 7) * 7;
  }
  renderTherapists();
  refreshBooking();
  renderAdmin();
})();
