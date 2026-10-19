/*
 * 施測前要改的設定都在這裡。改完存檔，重新上傳到 GitHub 即可。
 */
window.STUDY_CONFIG = {
  // 'pretest'（前測：只量檢核題）或 'main'（正式實驗：加量主要變數）
  mode: 'pretest',

  // 刺激物版本：修改 content.js 的對話或情境後改成 v2、v3…，資料裡的 version 欄會記錄受試者看到哪一版
  version: 'v2',

  // Apps Script 網頁應用程式網址（部署後取得，結尾是 /exec）。
  // 留白時為「示範模式」：不送出任何資料，最後會顯示資料預覽，方便自己或老師試用。
  endpoint: '',

  // 知情同意與事後說明中會出現的資料
  researcher: {
    school: '（學校、系所）',
    name: '（姓名）',
    email: '（Email）',
    deadline: '（日期）',   // 撤回資料的期限
  },

  // 抽獎登記表單網址（另一份 Google 表單，與作答資料分開）；留白則不顯示
  lotteryUrl: '',

  // AI 回覆前「輸入中…」的時間（毫秒）。兩組相同，避免回覆速度變成混淆。
  typingDelayMs: 2500,

  // 任務說明頁至少停留幾毫秒，「開始任務」按鈕才能按
  minBriefMs: 5000,

  // 使用者質疑訊息的選項數：3（三選一）或 1（只有一個「傳送」按鈕）
  pushbackOptions: 3,

  // 是否在任務最後請受試者決定上線前要怎麼做（行為測量）
  askDecision: true,

  // 瀏覽器儲存用的名稱。換一個名稱，等於讓所有人都能重新參加（只在測試時換）
  storageKey: 'aidev-study-v1',
};
