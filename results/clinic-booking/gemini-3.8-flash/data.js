/**
 * ============================================================
 * ☀️ 晴日心理諮商所 - 資料設定檔 (data.js)
 * ============================================================
 * 
 * 💡 修改指南：
 * 1. 心理師資料：在 counselors 陣列中修改姓名、專長、簡介或頭像圖片。
 * 2. 諮商空間：在 rooms 陣列中修改名稱或描述。
 * 3. 可預約時段：在 timeSlots 陣列中增加或刪除時段。
 * 4. 修改後只要重新整理瀏覽器網頁，內容就會立即更新！
 * ============================================================
 */

window.CLINIC_CONFIG = {
  // 診所基本資料
  clinic: {
    name: "晴日心理諮商所",
    subtitle: "傾聽內在聲音，陪你走過每個陰晴轉折",
    phone: "02-2345-6789",
    email: "contact@sunnyday-counseling.tw",
    address: "台北市大安區和平東路二段 120 號 3 樓（捷運科技大樓站步行 3 分鐘）",
    hours: "週一至週六 09:00 - 21:00（週日公休）",
    notice: [
      "每次諮商時間為 50 分鐘，並保留 10 分鐘沉澱與心理師紀錄時間。",
      "線上預約送出後，診所管理員將於 24 小時內審核並確認您的時段。",
      "如需改期或取消，請於預約日前 24 小時來電或線上通知。",
      "我們嚴格遵守心理師法與專業倫理，諮商過程完全保密。"
    ]
  },

  // 心理師名單（可隨時增減、修改）
  counselors: [
    {
      id: "counselor-1",
      name: "陳晴予",
      title: "院長 / 諮商心理師",
      license: "諮心字第 002158 號",
      avatarColor: "#4E7D63", // 綠意草木調
      specialties: ["情緒調適與壓力管理", "親密關係與溝通", "高敏感特質探索", "自我認同"],
      intro: "「在安靜的呼吸裡，給疲憊的自己一次溫柔擁抱。」具有 9 年個別諮商與關係輔導經驗，擅長人際歷程取向與情緒焦點治療，陪伴你在混亂與迷惘中重新找到內在安定的節奏。",
      education: "國立台灣師範大學 心輔系碩士",
      experience: ["前台大醫院精神部 實習心理師", "大專院校專任心理師 4 年", "現任晴日心理諮商所 院長"],
      availableDays: [1, 2, 3, 4, 5, 6] // 週一至週六
    },
    {
      id: "counselor-2",
      name: "林子翔",
      title: "資深諮商心理師",
      license: "諮心字第 003412 號",
      avatarColor: "#D97706", // 溫暖暖陽調
      specialties: ["職涯迷惘與職場壓力", "自我價值與完美主義", "人際界線建立", "男性情緒梳理"],
      intro: "「面對外界期待感到疲倦時，讓這裡成為你暫停充電的綠洲。」擅長以清晰而溫暖的敘事風格，協助來訪者拆解焦慮源頭，重新梳理內在渴望，找回生活與工作的主導權。",
      education: "國立台北教育大學 心理與諮商碩士",
      experience: ["多家百大企業特約心理顧問", "社區心理衛生中心 合作心理師", "專長青年與職場成年人諮商"],
      availableDays: [1, 2, 3, 4, 5] // 週一至週五
    },
    {
      id: "counselor-3",
      name: "黃詠馨",
      title: "資深諮商心理師",
      license: "諮心字第 002987 號",
      avatarColor: "#8C5E58", // 沉靜大地調
      specialties: ["原生家庭議題", "失落悲傷陪伴", "伴侶與婚姻會談", "內在小孩修復"],
      intro: "「傷口所在之處，往往也是光照進來的地方。」專長家族系統治療與完形心理學，風格沉穩包容。陪伴你穿透過去的傷痕與失落，在安全的容器中溫柔縫合心靈的裂隙。",
      education: "國立彰化師範大學 輔導與諮商碩士",
      experience: ["知名家庭諮商中心 資深心理師", "悲傷撫平與失落團體帶領者", "婚姻與伴侶關係專任諮商師"],
      availableDays: [2, 3, 4, 5, 6] // 週二至週六
    }
  ],

  // 諮商空間 / 模式設定
  rooms: [
    {
      id: "room-forest",
      name: "森林室",
      type: "physical", // 實體空間
      capacity: "個人 / 深度對談",
      features: ["綠意植栽環繞", "天然雪松香氛", "舒緩大地色調", "隔音加強門窗"],
      description: "宛如漫步在清晨的靜謐森林，柔和的間接光線與植物包覆感，讓緊繃的神經自然放鬆，特別適合個人探索與深度沉澱。",
      icon: "forest"
    },
    {
      id: "room-sun",
      name: "暖陽室",
      type: "physical", // 實體空間
      capacity: "個人 / 伴侶會談",
      features: ["大面落地自然採光", "溫潤木質傢俱", "雙人寬敞沙發", "舒心花草茶飲"],
      description: "採光通透溫馨，如沐浴在微風晴日之中。空間寬敞自在，非常適合個別會談、伴侶或家庭諮商。",
      icon: "sun"
    },
    {
      id: "room-online",
      name: "線上諮商",
      type: "online", // 線上遠距
      capacity: "遠距視訊諮商",
      features: ["免出門零地域限制", "安全加密專屬視訊房", "彈性排程高隱私", "提供事前音訊測試"],
      description: "在您最熟悉、最放鬆的私人環境中進行會談。預約確認後將透過簡訊與 Email 發送專屬加密視訊連結。",
      icon: "online"
    }
  ],

  // 每日開放的可預約時段清單
  timeSlots: [
    "09:30 - 10:20",
    "11:00 - 11:50",
    "14:00 - 14:50",
    "15:30 - 16:20",
    "17:00 - 17:50",
    "19:00 - 19:50"
  ],

  // 預先設定的示範預約資料（首次載入時會自動儲存到瀏覽器的 localStorage 中）
  // 方便您直接在後台看到運作效果，並測試「時段被預約後無法重複選取」的功能
  getInitialDemoBookings: function() {
    const today = new Date();
    
    // 取得 YYYY-MM-DD 格式日期字串
    const getDateString = (offsetDays) => {
      const d = new Date(today);
      d.setDate(d.getDate() + offsetDays);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    return [
      {
        id: "BK-" + getDateString(1).replace(/-/g, "") + "-001",
        counselorId: "counselor-1",
        counselorName: "陳晴予",
        roomId: "room-forest",
        roomName: "森林室",
        date: getDateString(1), // 明天
        time: "14:00 - 14:50",
        clientName: "張雅婷",
        clientPhone: "0912-345-678",
        topic: "職場人際關係與壓力調適",
        status: "pending", // 待確認
        createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
        adminNote: "個案備註：希望諮商室能提供溫水。"
      },
      {
        id: "BK-" + getDateString(1).replace(/-/g, "") + "-002",
        counselorId: "counselor-2",
        counselorName: "林子翔",
        roomId: "room-sun",
        roomName: "暖陽室",
        date: getDateString(1), // 明天
        time: "15:30 - 16:20",
        clientName: "李宗翰",
        clientPhone: "0928-888-999",
        topic: "面對轉職抉擇的焦慮與自信心重建",
        status: "confirmed", // 已確認
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        adminNote: "已發送行前提醒簡訊與交通指引。"
      },
      {
        id: "BK-" + getDateString(2).replace(/-/g, "") + "-003",
        counselorId: "counselor-3",
        counselorName: "黃詠馨",
        roomId: "room-online",
        roomName: "線上諮商",
        date: getDateString(2), // 後天
        time: "19:00 - 19:50",
        clientName: "王曉微",
        clientPhone: "0933-777-111",
        topic: "原生家庭溝通模式與伴侶相處",
        status: "pending", // 待確認
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        adminNote: ""
      },
      {
        id: "BK-" + getDateString(3).replace(/-/g, "") + "-004",
        counselorId: "counselor-1",
        counselorName: "陳晴予",
        roomId: "room-forest",
        roomName: "森林室",
        date: getDateString(3), // 三天後
        time: "11:00 - 11:50",
        clientName: "陳建良",
        clientPhone: "0955-432-109",
        topic: "睡眠障礙與身心緊繃焦慮",
        status: "confirmed", // 已確認
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        adminNote: "個案初談，預留前置說明時間。"
      }
    ];
  }
};
