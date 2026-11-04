// 在這個檔案修改心理師、諮商方式與開放預約時段。
// 更換照片時，將 photo 改成圖片路徑，並把 photoSize 設為 "cover"、photoPosition 設為 "center"。
window.CLINIC_DATA = {
  therapists: [
    {
      id: "lin",
      name: "林語晴",
      title: "諮商心理師",
      specialties: ["情緒困擾", "自我探索", "壓力調適"],
      introduction: "陪你慢慢理解內心的感受，在生活的轉彎處，找到更自在的步伐。",
      photo: "assets/therapists.png",
      photoSize: "300% auto",
      photoPosition: "left 35%"
    },
    {
      id: "chen",
      name: "陳以安",
      title: "諮商心理師",
      specialties: ["人際關係", "職涯壓力", "生活轉變"],
      introduction: "相信每個人都有自己的節奏，陪你整理關係與生活中的不容易。",
      photo: "assets/therapists.png",
      photoSize: "300% auto",
      photoPosition: "center 35%"
    },
    {
      id: "huang",
      name: "黃心寧",
      title: "諮商心理師",
      specialties: ["親密關係", "焦慮調適", "情緒照顧"],
      introduction: "在溫暖而不被評斷的空間裡，陪你練習傾聽自己、照顧自己。",
      photo: "assets/therapists.png",
      photoSize: "300% auto",
      photoPosition: "right 35%"
    }
  ],
  rooms: [
    { id: "forest", name: "森林室", description: "實體諮商", exclusive: true },
    { id: "sunshine", name: "暖陽室", description: "實體諮商", exclusive: true },
    { id: "online", name: "線上諮商", description: "遠距視訊", exclusive: false }
  ],
  schedule: {
    // 星期日為 0，星期一至星期六為 1 至 6。
    availableDays: [1, 2, 3, 4, 5, 6],
    timeSlots: ["10:00", "11:30", "13:30", "15:00", "16:30", "19:00"],
    sessionMinutes: 50,
    bookingWindowDays: 60
  }
};
