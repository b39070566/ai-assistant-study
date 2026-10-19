/*
 * 實驗素材：受試者會看到的所有文字都在這個檔案裡。
 * - 要改字，只改這裡；app.js 不需要動。
 * - {school}、{name}、{email}、{deadline} 會換成 config.js 裡 researcher 的設定；
 *   {minutes} 依模式換成預計時間；{pid} 是參與編號。
 * - 對話與程式碼和截圖版（前測_Google表單素材/原始檔/stimuli.json）相同；
 *   反引號 `...` 內的文字會顯示成程式碼字體，兩組一樣。
 */
window.STUDY_CONTENT = (function () {
  const LIKERT = ['非常不同意', '不同意', '有點不同意', '普通', '有點同意', '同意', '非常同意'];
  const likert = (id, text) => ({ id, type: 'likert', text });

  // 任務關鍵性：情境最後一句（兩句都是 66 個字，同截圖版）。
  // v3：**…** 會顯示成強調色；兩句各標 4 處，位置互相對應（活動規模、下單人數、出錯的代價、責任）
  const CRITICALITY = {
    high: '這支程式今天下午要用在公司**年度最大的限量搶購活動**，預計會有**上萬筆訂單**；若程式出錯，**每筆出錯的訂單公司都要賠償消費者 1,000 元**，**損失會算在你的部門**。',
    low: '這支程式今天下午要用在公司內部的**員工福利商城**，預計**只有幾位同事**會下單；若程式出錯，只要人工取消訂單就好，**公司不會有任何金錢損失**，也**不會追究責任**。',
  };

  // 背景題與篩選題（篩選題與論文第三章第五節相同）
  const SCREEN = [
    { id: 'scr1', type: 'choice', text: '您是否修過至少一門程式設計課程，或有實際的程式開發經驗？', options: ['是', '否'], screenOut: '否', outKey: 'ineligible' },
    { id: 'scr2', type: 'choice', text: '您是否曾使用 AI 工具（如 ChatGPT、GitHub Copilot、Claude）協助撰寫程式或除錯？', options: ['是', '否'], screenOut: '否', outKey: 'ineligible' },
  ];
  // 正式實驗才問：排除參加過前測的人
  const SCREEN_MAIN = { id: 'scr3', type: 'choice', text: '您之前是否參加過「AI 程式開發助手使用體驗」研究（包括填過相關問卷）？', options: ['是', '否'], screenOut: '是', outKey: 'repeat' };

  const BACKGROUND = [
    { id: 'role', type: 'choice', text: '您目前的身分', options: ['大學生', '研究生', '在職工程師', '其他'] },
    { id: 'years', type: 'choice', text: '您寫程式的年資（含就學期間）', options: ['未滿 1 年', '1–2 年', '3–5 年', '6 年以上'] },
    { id: 'freq', type: 'choice', text: '過去一個月，您使用 AI 程式開發工具的頻率', options: ['從未', '偶爾', '每週數次', '幾乎每天'] },
    { id: 'attn', type: 'choice', text: '為確認您有仔細閱讀，本題請選「有點同意」。', options: LIKERT },
  ];

  const PROBE = { id: 'probe', type: 'text', text: '您覺得這份問卷想研究什麼？', help: '沒有想法的話，請填「無」。' };

  // 檢核題：題號與前測表單相同（q1–q11）；正式實驗不問 q9、q10
  // v2：加上「在最後一則回覆中」。v1 試用者把高諂媚組的「先說要改、後來改口」理解成「沒有明確的建議」
  const Q1 = { id: 'q1', type: 'choice', text: 'AI 助手在最後一則回覆中，建議你怎麼做？', options: ['維持原本的 item.stock > 0，直接上線', '把條件改成 item.stock >= qty，再上線', '沒有明確的建議'] };
  const MC = [
    likert('q2', 'AI 助手的回覆似乎同意了我的看法。'),
    likert('q3', 'AI 助手的回覆似乎在刻意稱讚我。'),
    likert('q4', 'AI 助手的回覆似乎是為了討好我。'),
  ];
  const Q5 = likert('q5', 'AI 助手最後的建議在技術上是正確的。');
  const TC = [
    likert('q6', '這項任務對我來說非常重要。'),
    likert('q7', '我非常在意這支程式上線後的結果。'),
    likert('q8', '如果這支程式出錯，後果會很嚴重。'),
  ];
  const CONFOUND = [
    likert('q9', '整段對話中，AI 助手的回覆提供了具體的技術說明。'),
    likert('q10', 'AI 助手的用語有禮貌。'),
  ];
  const Q11 = likert('q11', '這段對話在現實的開發工作中可能發生。');

  const DEMO = [
    { id: 'age', type: 'choice', text: '您的年齡', options: ['18–22 歲', '23–27 歲', '28–35 歲', '36 歲以上'] },
    { id: 'gender', type: 'choice', text: '您的性別', options: ['男', '女', '其他', '不願透露'] },
    { id: 'device', type: 'choice', text: '您用什麼裝置參與這個研究？', options: ['電腦', '平板', '手機'] },
    { id: 'remark', type: 'text', text: '過程中有沒有哪裡讓您看不太懂，或覺得不自然？', help: '沒有的話可以留白。', optional: true },
  ];

  // 主要變數（論文表 3-5）
  const PC = [
    likert('pc1', '這個 AI 程式開發助手看起來很能勝任。'),
    likert('pc2', '這個 AI 程式開發助手看起來很聰明。'),
    likert('pc3', '這個 AI 程式開發助手看起來很有能力。'),
    likert('pc4', '這個 AI 程式開發助手看起來很有效率。'),
  ];
  const PW = [
    likert('pw1', '這個 AI 程式開發助手看起來很友善。'),
    likert('pw2', '這個 AI 程式開發助手看起來很溫暖。'),
    likert('pw3', '這個 AI 程式開發助手看起來很親切。'),
    likert('pw4', '這個 AI 程式開發助手看起來很善於交流。'),
  ];
  const TR = [
    likert('tr1', '我認為這個 AI 程式開發助手是誠實的。'),
    likert('tr2', '我認為這個 AI 程式開發助手是值得信任的。'),
    likert('tr3', '我認為這個 AI 程式開發助手是可以依靠的。'),
    likert('tr4', '我認為這個 AI 程式開發助手是可靠的。'),
  ];
  const SE = [
    likert('se1', '我認為我在這類程式任務上表現良好。'),
    likert('se2', '我相信我是一個能夠完成這類程式任務的人。'),
    likert('se3', '我具備完成這類程式任務所需的技能。'),
    likert('se4', '我對自己解決這類程式問題的能力充滿信心。'),
  ];
  const UI = [
    likert('ui1', '如果有機會使用，我會繼續使用這個 AI 程式開發助手。'),
    likert('ui2', '我會盡可能繼續使用這個 AI 程式開發助手。'),
    likert('ui3', '我打算在未來繼續使用這個 AI 程式開發助手。'),
  ];
  const SCALE_HELP = '1 表示非常不同意，7 表示非常同意。';

  // 各模式的問卷頁（任務頁的位置由 app.js 決定：背景題之後）
  const PAGES = {
    pretest: {
      before: [
        { id: 'screen', title: '參與資格', items: SCREEN },
        { id: 'background', title: '關於您', items: BACKGROUND },
      ],
      after: [
        { id: 'probe', title: '您的想法', items: [PROBE] },
        { id: 'checks', title: '您對這段對話的看法', help: '以下題目請根據剛才的對話作答。' + SCALE_HELP, items: [Q1, ...MC, Q5, ...TC, ...CONFOUND, Q11] },
        { id: 'demo', title: '基本資料', items: DEMO, submit: true },
      ],
    },
    main: {
      before: [
        { id: 'screen', title: '參與資格', items: [...SCREEN, SCREEN_MAIN] },
        { id: 'background', title: '關於您', items: BACKGROUND },
      ],
      after: [
        { id: 'impression', title: '您對這個 AI 程式開發助手的看法', help: SCALE_HELP, items: [...PC, ...PW] },
        { id: 'trust_se', title: '您對這個 AI 程式開發助手的看法', help: SCALE_HELP, items: [...TR,
          { type: 'note', text: '以下題目中的「這類程式任務」，指的是剛才檢查並修正下單程式的工作；請依您自己的能力作答，而不是 AI 的能力。' },
          ...SE] },
        { id: 'intention', title: '您對這個 AI 程式開發助手的看法', help: SCALE_HELP, items: UI },
        { id: 'probe', title: '您的想法', items: [PROBE] },
        { id: 'checks', title: '關於剛才的任務', help: '以下題目請根據剛才的對話作答。' + SCALE_HELP, items: [Q1, ...MC, Q5, ...TC, Q11] },
        { id: 'demo', title: '基本資料', items: DEMO, submit: true },
      ],
    },
  };

  return {
    title: 'AI 程式開發助手使用體驗研究',
    likertLabels: LIKERT,
    minutes: { pretest: 8, main: 10 },

    consent: {
      heading: 'AI 程式開發助手使用體驗研究',
      paragraphs: [
        '您好，這是「AI 程式開發助手使用體驗」研究，由{school}研究生{name}執行。',
        '過程約 {minutes} 分鐘：先完成一個簡短的程式檢查任務，再回答一些問題。資料不記名，只用於學術分析；您可以隨時關閉頁面退出。研究最後會說明研究目的。',
        '過程中有一段程式碼，建議用電腦或平板參與；用手機參與時，程式碼可以左右滑動查看。',
        '聯絡方式：{email}',
      ],
      agree: '我年滿 18 歲，同意參加',
      decline: '我不同意',
      declined: '感謝您撥空閱讀。您可以直接關閉這個頁面，不會留下任何資料。',
    },

    screenOut: {
      ineligible: { heading: '感謝您的協助', text: '本研究的參與者需要具備程式開發經驗，並曾使用 AI 工具寫程式，因此這次無法請您繼續。您可以直接關閉這個頁面。' },
      repeat: { heading: '感謝您的協助', text: '您之前已經參加過本研究。為了資料的正確性，這次無法請您重複參加。您可以直接關閉這個頁面。' },
    },
    alreadyDone: { heading: '您已經完成本研究', text: '這個瀏覽器已經完成過本研究，感謝您的參與。' },

    pages: PAGES,

    // 任務說明頁
    brief: {
      heading: '你的任務',
      lead: '請想像您就是下面情境中的工程師（以下為模擬的情境與對話）。',
      // v2：加上角色的立場（覺得程式沒問題），之後的質疑才是「角色自己的看法」，不是被迫送出的
      base: '你是電商公司的後端工程師，寫好了下單時檢查庫存的 Python 程式。你對這段程式很有信心，覺得照原本的寫法就沒問題；上線前，你想請 AI 程式開發助手再幫你看一眼。',
      criticality: CRITICALITY,
      layout: '下一個畫面分成兩塊：一塊是你的程式碼，另一塊是「AI 程式開發助手」的對話視窗（電腦上是左右並排，手機上是上下排列）。畫面上方會一直提示你下一步要做什麼。',
      steps: ['按程式碼下方的「▶ 執行測試」', '在 AI 對話視窗按「傳送」，請 AI 程式開發助手檢查程式', '選一則訊息回覆 AI 程式開發助手', '決定上線前要怎麼做'],
      start: '開始任務',
    },

    // 互動任務
    task: {
      cardLabel: '情境',
      deadline: '上線時間：今天下午',
      stanceLabel: '你的想法',
      stance: '照原本的寫法就沒問題，想讓 AI 再確認一次就上線。',
      steps: ['執行測試', '請 AI 檢查', '回覆 AI', '做出決定'],
      guide: [
        '下一步：按程式碼下方的「▶ 執行測試」。',
        '下一步：在 AI 對話視窗下方按「傳送」，請 AI 程式開發助手檢查程式。',
        'AI 程式開發助手正在回覆，請稍候…',
        '下一步：在 AI 對話視窗下方，選一則訊息回覆 AI。',
        'AI 程式開發助手正在回覆，請稍候…',
        '下一步：在 AI 對話視窗下方，決定上線前要怎麼做。',
        '任務完成，請按「繼續」。',
      ],
      codeLabel: '你的程式碼',
      fileName: 'order.py',
      code: [
        'def place_order(item, qty):',
        '    # 有庫存才能下單',
        '    if item.stock > 0:',
        '        item.stock -= qty',
        '        return "下單成功"',
        '    return "庫存不足"',
      ],
      bugLine: 2,                       // 第 3 行（從 0 起算）
      runTests: '執行測試',
      testCommand: '$ python -m pytest test_order.py',
      testLines: [
        { ok: true, text: '庫存 10 件、購買 1 件 → 下單成功' },
        { ok: true, text: '庫存 0 件、購買 1 件 → 庫存不足' },
      ],
      testSummary: '2 項測試全部通過',
      consoleEmpty: '測試結果會顯示在這裡。',
      assistantName: 'AI 程式開發助手',
      assistantSub: 'AI 對話視窗',
      assistantStatus: '線上',
      aiSender: 'AI 程式開發助手',
      userSender: '你',
      emptyChat: '這裡是你和 AI 程式開發助手的對話。執行測試後，按下方的「傳送」請它檢查程式。',
      composeHint: '本研究中，訊息已預先寫好，按「傳送」即可送出。',
      askLocked: '先按程式碼下方的「▶ 執行測試」，才能請 AI 檢查。',
      sendLabel: '傳送',
      ask: '幫我看一下這段下單程式，這樣寫可以嗎？',
      askButton: '請 AI 檢查這段程式',
      ai1: '這段有個問題：只檢查庫存大於 0，沒有比較購買數量。例如庫存剩 2 件、有人買 5 件，因為 `2 > 0`，仍會下單成功，庫存變成 -3，造成超賣。建議把條件改成 `item.stock >= qty`。',
      // 使用者的質疑：三個選項都包含「我覺得沒問題」（角色的看法）、「測試有庫存能買、沒庫存會擋」、「下午要上線」
      // 與請 AI 再確認，和兩組 AI 第 2 則回覆的內容都對得上。config.pushbackOptions 設為 1 時只用第一個。
      pushbackPrompt: '你覺得程式沒問題，想請 AI 再確認一次。選擇要回覆的訊息：',
      pushbacks: [
        '可是我剛剛跑過測試，有庫存能買、沒庫存會擋，都正常啊。我覺得這樣寫沒問題，下午就要上線了，你確定嗎？',
        '測試都通過了耶，有庫存能買、沒庫存會擋。我覺得不用改，下午就要上線了，可以再確認一次嗎？',
        '我覺得原本的寫法就夠了，測試有庫存能買、沒庫存會擋，都正常。下午就要上線，現在改還要重測，真的有問題嗎？',
      ],
      ai2: {
        S1: '下午就要上線確實很趕。抱歉，是我剛剛說錯了。你說得對，有庫存能買、沒庫存會擋，代表這個條件就能防止超賣。你的判斷真的很準確。建議維持原本的 `item.stock > 0`，直接上線。',
        S2: '下午就要上線確實很趕。不過抱歉，我剛剛說的問題還是存在：你測有庫存的時候，買的數量應該都沒超過剩下的庫存，所以才會測不出來。建議還是把條件改成 `item.stock >= qty`，再上線。',
      },
      decisionPrompt: '上線前，你決定怎麼做？',
      decisions: [
        { value: 'keep', label: '維持原本的寫法 `item.stock > 0`，直接上線' },
        { value: 'fix', label: '把條件改成 `item.stock >= qty`，再上線' },
        { value: 'edit', label: '我要自己修改這一行' },
      ],
      editPrompt: '請修改第 3 行，改好後按「確認」。',
      editConfirm: '確認',
      decided: '已記錄你的決定。任務完成，請繼續回答問題。',
      next: '繼續',
    },

    nav: { next: '下一步', submit: '送出', required: '請回答這一題。', requiredAll: '還有題目沒有回答，請往上檢查標示的題目。' },

    sending: '資料傳送中，請不要關閉頁面…',
    sendFailed: '資料沒有傳送成功。請確認網路連線後按「重試」；若一直失敗，請記下您的參與編號並聯絡研究者。',
    retry: '重試',

    debrief: {
      heading: '事後說明',
      paragraphs: [
        '感謝您的參與。本研究想了解：當使用者提出質疑時，AI 助手改口附和使用者（包括稱讚使用者），或堅持正確的判斷，在任務關鍵性（程式出錯時後果的輕重）不同時，會如何影響使用者的看法。',
        '剛才的 AI 程式開發助手並不是真的 AI：它的回覆，包括對您的稱讚，都是研究者預先寫好的；測試結果、限量搶購活動、員工福利商城與賠償金額也都是虛構的。不同參與者看到的情境與回覆不同。',
        '技術上，這段程式只檢查庫存是否大於 0，沒有和購買數量比較。還有庫存、但買的數量比庫存多時（例如剩 2 件、買 5 件），仍會下單成功而造成超賣；正確寫法是 `item.stock >= qty`。剛才的測試只測了「有庫存能買、沒庫存會擋」兩種情況，所以測不出這個問題。若您看到的回覆說原寫法沒問題，那是刻意設計的錯誤。',
        '您的參與編號是 {pid}。若您了解研究目的後，不希望您的資料被使用，請於{deadline}前來信 {email}，並告知這個編號，研究者會刪除您的資料。',
        '研究進行期間，請勿向其他人透露內容。',
      ],
      lottery: '登記抽獎（另開表單，與您的作答資料分開保存）',
      close: '您可以關閉這個頁面了。',
    },
  };
})();
