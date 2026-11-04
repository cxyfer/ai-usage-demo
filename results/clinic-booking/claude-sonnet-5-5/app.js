/* 晴日心理諮商所 — 預約網站主程式（一般情況下不需要修改） */
(function () {
  'use strict';

  var CFG = window.CLINIC_CONFIG;
  var KEY = 'qingri_bookings_v1';
  var WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  var STATUS = { pending: '待確認', confirmed: '已確認', cancelled: '已取消' };

  /* ---------- 儲存（localStorage，失敗時退回記憶體） ---------- */
  var memoryStore = [];
  var storageOk = true;

  function load() {
    try {
      var data = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      storageOk = false;
      return memoryStore;
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch (e) {
      storageOk = false;
      memoryStore = list;
    }
  }

  /* ---------- 小工具 ---------- */
  function $(id) { return document.getElementById(id); }

  // 建立 DOM 元素；文字一律用 textContent，避免個案輸入的內容被當成 HTML
  function h(tag, props) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    });
    Array.prototype.slice.call(arguments, 2).forEach(function add(c) {
      if (c == null || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else el.append(c.nodeType ? c : document.createTextNode(c));
    });
    return el;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dateKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDate(key) { var p = key.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function toMinutes(time) { var p = time.split(':'); return +p[0] * 60 + +p[1]; }
  function slotDate(date, time) {
    var d = parseDate(date), p = time.split(':');
    d.setHours(+p[0], +p[1], 0, 0);
    return d;
  }
  function weekdayLabel(key) { return '週' + WEEK[parseDate(key).getDay()]; }
  function longDate(key) {
    var d = parseDate(key);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate() + '（' + weekdayLabel(key) + '）';
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* ---------- 時段判斷 ---------- */
  var SESSION = (CFG.booking && CFG.booking.sessionMinutes) || 60;

  function overlaps(a, b) { return a.date === b.date && Math.abs(toMinutes(a.time) - toMinutes(b.time)) < SESSION; }

  // 同一位心理師同一時間已有（待確認或已確認）預約
  function therapistBusy(list, tid, date, time) {
    return list.some(function (b) {
      return b.status !== 'cancelled' && b.therapistId === tid && overlaps(b, { date: date, time: time });
    });
  }

  // 實體諮商室同一時間已被預約；線上諮商不受限
  function roomBusy(list, rid, date, time) {
    var room = byId(CFG.rooms, rid);
    if (!room || room.online) return false;
    return list.some(function (b) {
      return b.status !== 'cancelled' && b.roomId === rid && overlaps(b, { date: date, time: time });
    });
  }

  function tooSoon(date, time) {
    var limit = Date.now() + (CFG.booking.minHoursAhead || 0) * 3600 * 1000;
    return slotDate(date, time).getTime() < limit;
  }

  // 回傳 'ok' | 'busy'（已被預約）| 'soon'（過去或太近）
  function slotState(list, tid, date, time) {
    if (tooSoon(date, time)) return 'soon';
    if (therapistBusy(list, tid, date, time)) return 'busy';
    return 'ok';
  }

  function availableDates(t) {
    var list = load(), out = [], today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < CFG.booking.daysAhead; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      if (t.workDays.indexOf(d.getDay()) === -1) continue;
      var key = dateKey(d);
      var open = t.times.filter(function (tm) { return slotState(list, t.id, key, tm) === 'ok'; }).length;
      out.push({ key: key, open: open, isToday: i === 0 });
    }
    return out;
  }

  /* ---------- 預約頁狀態 ---------- */
  var st = { therapistId: null, date: null, time: null, roomId: null };

  function currentTherapist() { return byId(CFG.therapists, st.therapistId); }

  function avatar(t, cls) {
    var wrap = h('div', { class: 'avatar ' + (cls || '') }, h('span', { class: 'avatar-initial', 'aria-hidden': 'true' }, t.name.charAt(0)));
    if (t.photo) {
      var img = h('img', { src: t.photo, alt: t.name + '的照片', loading: 'lazy' });
      img.addEventListener('error', function () { img.remove(); });
      wrap.append(img);
    }
    return wrap;
  }

  function renderTherapists() {
    var box = $('therapist-list');
    box.replaceChildren();
    CFG.therapists.forEach(function (t) {
      var selected = st.therapistId === t.id;
      box.append(
        h('article', { class: 'card therapist' + (selected ? ' is-selected' : '') },
          avatar(t, 'avatar-lg'),
          h('h3', {}, t.name, h('span', { class: 'title' }, t.title)),
          h('ul', { class: 'tags', 'aria-label': '專長' }, t.specialties.map(function (s) { return h('li', {}, s); })),
          h('p', { class: 'intro' }, t.intro),
          h('button', {
            type: 'button',
            class: 'btn ' + (selected ? 'btn-selected' : 'btn-outline'),
            'aria-pressed': selected ? 'true' : 'false',
            onclick: function () { chooseTherapist(t.id); }
          }, selected ? '✓ 已選擇' : '預約這位心理師')
        )
      );
    });
  }

  function chooseTherapist(id) {
    if (st.therapistId !== id) {
      st.therapistId = id; st.date = null; st.time = null; st.roomId = null;
    }
    renderAll();
    $('booking').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function reduceMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // 單選 chip（用真正的 radio，鍵盤與讀屏都能用）
  function chip(name, value, checked, disabled, content, onPick) {
    return h('label', { class: 'chip' + (disabled ? ' is-disabled' : '') },
      h('input', { type: 'radio', name: name, value: value, checked: checked, disabled: disabled, onchange: onPick }),
      h('span', { class: 'chip-body' }, content)
    );
  }

  function hint(text) { return h('p', { class: 'hint' }, text); }

  function renderSelected() {
    var box = $('selected-therapist'), t = currentTherapist();
    box.replaceChildren();
    if (!t) { box.append(hint('請先在上方選擇一位心理師。')); return; }
    box.append(
      avatar(t, 'avatar-sm'),
      h('div', {}, h('strong', {}, t.name), h('span', { class: 'title' }, t.title)),
      h('a', { href: '#therapists', class: 'link-change' }, '更換')
    );
  }

  function renderDates() {
    var box = $('date-list'), t = currentTherapist();
    box.replaceChildren();
    if (!t) { box.append(hint('選好心理師後，這裡會出現可預約的日期。')); return; }
    var dates = availableDates(t);
    if (!dates.length) { box.append(hint('近期沒有開放的日期，請直接來電洽詢。')); return; }
    dates.forEach(function (d) {
      var full = d.open === 0, p = parseDate(d.key);
      box.append(chip('date', d.key, st.date === d.key, full, [
        h('span', { class: 'c-top' }, d.isToday ? '今天' : weekdayLabel(d.key)),
        h('span', { class: 'c-main' }, (p.getMonth() + 1) + '/' + p.getDate()),
        h('span', { class: 'c-sub' }, full ? '已額滿' : '')
      ], function () {
        st.date = d.key; st.time = null; st.roomId = null;
        renderTimes(); renderRooms(); renderSummary();
      }));
    });
  }

  function renderTimes() {
    var box = $('time-list'), t = currentTherapist();
    box.replaceChildren();
    if (!t || !st.date) { box.append(hint('選好日期後，這裡會出現可預約的時間。')); return; }
    var list = load();
    t.times.slice().sort().forEach(function (tm) {
      var state = slotState(list, t.id, st.date, tm);
      box.append(chip('time', tm, st.time === tm, state !== 'ok', [
        h('span', { class: 'c-main' }, tm),
        h('span', { class: 'c-sub' }, state === 'busy' ? '已預約' : state === 'soon' ? '不開放' : '')
      ], function () {
        st.time = tm;
        if (st.roomId && roomBusy(load(), st.roomId, st.date, tm)) st.roomId = null;
        renderRooms(); renderSummary();
      }));
    });
  }

  function renderRooms() {
    var box = $('room-list');
    box.replaceChildren();
    if (!st.time) { box.append(hint('選好時間後，這裡會顯示該時段可用的諮商室。')); return; }
    var list = load();
    CFG.rooms.forEach(function (r) {
      var busy = roomBusy(list, r.id, st.date, st.time);
      box.append(
        h('label', { class: 'room' + (busy ? ' is-disabled' : '') },
          h('input', {
            type: 'radio', name: 'room', value: r.id, checked: st.roomId === r.id, disabled: busy,
            onchange: function () { st.roomId = r.id; renderSummary(); }
          }),
          h('span', { class: 'room-body' },
            h('strong', {}, r.name, busy ? h('em', {}, '此時段已被預約') : null),
            h('small', {}, r.desc)
          )
        )
      );
    });
  }

  function renderSummary() {
    var t = currentTherapist(), r = byId(CFG.rooms, st.roomId), el = $('summary-line');
    if (t && st.date && st.time && r) {
      el.textContent = '你選擇的是：' + t.name + '　' + longDate(st.date) + ' ' + st.time + '　' + r.name;
    } else {
      el.textContent = '';
    }
  }

  function renderAll() {
    renderTherapists(); renderSelected(); renderDates(); renderTimes(); renderRooms(); renderSummary();
  }

  /* ---------- 送出預約 ---------- */
  function showError(msg, focusEl) {
    var box = $('form-error');
    box.textContent = msg;
    box.hidden = false;
    if (focusEl) focusEl.focus();
  }

  function onSubmit(e) {
    e.preventDefault();
    var form = e.target, nameEl = $('f-name'), phoneEl = $('f-phone');
    var t = currentTherapist(), r = byId(CFG.rooms, st.roomId);
    $('form-error').hidden = true;

    if (!t) return showError('請先選擇一位心理師。', $('therapists').querySelector('button'));
    if (!st.date) return showError('請選擇日期。', form.querySelector('input[name="date"]:not(:disabled)'));
    if (!st.time) return showError('請選擇時間。', form.querySelector('input[name="time"]:not(:disabled)'));
    if (!r) return showError('請選擇諮商室。', form.querySelector('input[name="room"]:not(:disabled)'));

    var name = nameEl.value.trim();
    if (!name) return showError('請填寫姓名。', nameEl);
    var phone = phoneEl.value.trim();
    if (!/^\+?\d{8,13}$/.test(phone.replace(/[\s-]/g, ''))) {
      return showError('手機號碼格式好像不太對，請再確認一次（例如 0912-345-678）。', phoneEl);
    }

    // 送出前重新讀取一次，避免別的分頁已經搶先預約
    var list = load();
    if (slotState(list, t.id, st.date, st.time) !== 'ok' || roomBusy(list, r.id, st.date, st.time)) {
      st.time = null; st.roomId = null;
      renderAll();
      return showError('很抱歉，這個時段剛剛已被預約，請重新選擇時間。', form.querySelector('input[name="time"]:not(:disabled)'));
    }

    var booking = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      therapistId: t.id, therapistName: t.name,
      roomId: r.id, roomName: r.name,
      date: st.date, time: st.time,
      name: name, phone: phone,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    list.push(booking);
    save(list);
    showDone(booking);
  }

  function showDone(b) {
    var box = $('booking-done');
    function row(k, v) { return h('div', {}, h('dt', {}, k), h('dd', {}, v)); }
    box.replaceChildren(
      h('div', { class: 'done-icon', 'aria-hidden': 'true' }, '✓'),
      h('h3', {}, '預約已送出，等待診所確認'),
      h('p', {}, '目前狀態是「待確認」。診所確認後，預約才算成立，我們會以電話與你聯繫。'),
      h('dl', { class: 'done-info' },
        row('心理師', b.therapistName),
        row('日期', longDate(b.date)),
        row('時間', b.time),
        row('諮商室', b.roomName),
        row('姓名', b.name),
        row('電話', b.phone)
      ),
      h('p', { class: 'fine-print' }, '如需更改或取消，請來電 ' + CFG.clinic.phone + '。'),
      h('button', { type: 'button', class: 'btn btn-outline', onclick: resetBooking }, '再預約一次')
    );
    $('booking-form-wrap').hidden = true;
    box.hidden = false;
    box.setAttribute('tabindex', '-1');
    box.focus();
    box.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function resetBooking() {
    st = { therapistId: null, date: null, time: null, roomId: null };
    $('booking-form').reset();
    $('form-error').hidden = true;
    $('booking-done').hidden = true;
    $('booking-form-wrap').hidden = false;
    renderAll();
    $('therapists').scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------- 管理後台 ---------- */
  var adminFilter = 'all';

  function setStatus(id, status) {
    var list = load();
    var b = byId(list, id);
    if (!b) return;
    if (status === 'confirmed' && b.status !== 'pending') return;
    if (status === 'cancelled' && b.status === 'cancelled') return;
    b.status = status;
    save(list);
    renderAdmin();
  }

  function renderAdmin() {
    $('storage-warning').hidden = storageOk;
    var all = load().slice().sort(function (a, b) {
      return (a.date + a.time).localeCompare(b.date + b.time) || a.createdAt.localeCompare(b.createdAt);
    });

    var tabs = [['all', '全部'], ['pending', '待確認'], ['confirmed', '已確認'], ['cancelled', '已取消']];
    var tabBox = $('admin-tabs');
    tabBox.replaceChildren();
    tabs.forEach(function (tb) {
      var n = tb[0] === 'all' ? all.length : all.filter(function (b) { return b.status === tb[0]; }).length;
      tabBox.append(h('button', {
        type: 'button', role: 'tab', class: 'tab' + (adminFilter === tb[0] ? ' is-active' : ''),
        'aria-selected': adminFilter === tb[0] ? 'true' : 'false',
        onclick: function () { adminFilter = tb[0]; renderAdmin(); }
      }, tb[1], h('span', { class: 'tab-n' }, String(n))));
    });

    var rows = adminFilter === 'all' ? all : all.filter(function (b) { return b.status === adminFilter; });
    var box = $('admin-list');
    box.replaceChildren();
    if (!rows.length) {
      box.append(h('p', { class: 'empty' }, all.length ? '這個分類目前沒有預約。' : '還沒有任何預約。到預約頁送出一筆試試看吧！'));
      return;
    }
    rows.forEach(function (b) {
      var actions = [];
      if (b.status === 'pending') {
        actions.push(h('button', { type: 'button', class: 'btn btn-sm btn-primary', onclick: function () { setStatus(b.id, 'confirmed'); } }, '確認'));
      }
      if (b.status !== 'cancelled') {
        actions.push(h('button', {
          type: 'button', class: 'btn btn-sm btn-danger',
          onclick: function () {
            if (confirm('確定要取消這筆預約嗎？\n' + b.name + '　' + longDate(b.date) + ' ' + b.time + '\n取消後，這個時段會重新開放給其他人預約。')) {
              setStatus(b.id, 'cancelled');
            }
          }
        }, '取消'));
      }
      box.append(
        h('article', { class: 'booking status-' + b.status },
          h('div', { class: 'booking-top' },
            h('div', { class: 'booking-when' }, longDate(b.date) + ' ' + b.time),
            h('span', { class: 'badge badge-' + b.status }, STATUS[b.status] || b.status)
          ),
          h('dl', { class: 'booking-info' },
            h('div', {}, h('dt', {}, '個案'), h('dd', {}, b.name)),
            h('div', {}, h('dt', {}, '電話'), h('dd', {}, h('a', { href: 'tel:' + b.phone.replace(/[^\d+]/g, '') }, b.phone))),
            h('div', {}, h('dt', {}, '心理師'), h('dd', {}, (byId(CFG.therapists, b.therapistId) || {}).name || b.therapistName)),
            h('div', {}, h('dt', {}, '諮商室'), h('dd', {}, (byId(CFG.rooms, b.roomId) || {}).name || b.roomName))
          ),
          actions.length ? h('div', { class: 'booking-actions' }, actions) : null
        )
      );
    });
  }

  /* ---------- 路由（同一個頁面，#/admin 是後台） ---------- */
  function route() {
    var admin = location.hash === '#/admin';
    $('view-book').hidden = admin;
    $('view-admin').hidden = !admin;
    document.querySelector('.site-nav').hidden = admin;
    document.title = admin ? '預約管理｜' + CFG.clinic.name : CFG.clinic.name + '｜線上預約';
    if (admin) { renderAdmin(); window.scrollTo(0, 0); }
    else {
      renderAll();
      // 在 #/ 或站內錨點之間切換時，回到頂端
      if (location.hash === '' || location.hash === '#/') window.scrollTo(0, 0);
    }
  }

  /* ---------- 啟動 ---------- */
  function init() {
    $('brand-name').textContent = CFG.clinic.name;
    $('hero-slogan').textContent = CFG.clinic.slogan;
    $('footer-info').textContent = CFG.clinic.name + '　' + CFG.clinic.phone + '　' + CFG.clinic.address;
    $('booking-form').addEventListener('submit', onSubmit);
    window.addEventListener('hashchange', route);
    // 另一個分頁有新預約時，這個分頁也同步更新
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY) return;
      if (location.hash === '#/admin') renderAdmin(); else renderAll();
    });
    route();
  }

  init();
})();
