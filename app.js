/*
 * 互動實驗系統：流程、互動任務、分組與資料傳送。
 * 文字在 content.js，設定在 config.js；一般不需要改這個檔案。
 *
 * 網址參數（只在測試時有效：config.js 的 endpoint 留白，或網址加 test=1）
 *   ?test=1          測試模式：資料會送出，但標記 test=1，分析時排除
 *   &cond=A          指定組別 A–D；不指定則隨機
 *   &mode=main       指定模式 pretest／main
 *   &reset=1         清除這個瀏覽器的作答進度
 */
(function () {
  'use strict';

  const CFG = window.STUDY_CONFIG || {};
  const C = window.STUDY_CONTENT;
  const COND = {
    A: { S: 1, T: 1, label: '高諂媚＋高關鍵性' },
    B: { S: 1, T: 0, label: '高諂媚＋低關鍵性' },
    C: { S: 0, T: 1, label: '低諂媚＋高關鍵性' },
    D: { S: 0, T: 0, label: '低諂媚＋低關鍵性' },
  };
  const qs = new URLSearchParams(location.search);
  const DEMO = !CFG.endpoint;                    // 沒設 endpoint：示範模式，不送資料
  const TEST = DEMO || qs.get('test') === '1';
  const BASE_KEY = CFG.storageKey || 'aidev-study';
  const REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無法儲存時照常進行 */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* 同上 */ } },
  };

  // 示範／測試時可以切換模式與組別
  const PREF_KEY = BASE_KEY + ':demo-pref';
  const prefs = TEST ? (store.get(PREF_KEY) || {}) : {};
  if (TEST) {
    if (qs.get('mode')) prefs.mode = qs.get('mode');
    if (/^[ABCD]$/.test(qs.get('cond') || '')) prefs.cond = qs.get('cond');
  }

  const root = document.getElementById('app');
  let MODE, KEY, screens, state, enteredAt = 0, timers = [];

  // ---------------------------------------------------------------- 啟動
  function boot(opts) {
    timers.forEach(clearTimeout); timers = [];
    MODE = (TEST && prefs.mode ? prefs.mode : CFG.mode) === 'main' ? 'main' : 'pretest';
    KEY = BASE_KEY + ':' + MODE + (TEST ? ':test' : '');
    if (qs.get('reset') === '1' && !(opts && opts.keep)) store.del(KEY);
    screens = buildScreens();
    state = store.get(KEY);
    if (state && (state.v !== 1 || (TEST && state.done) || (TEST && prefs.cond && state.cond && state.cond !== prefs.cond))) state = null;
    if (state && !state.done) state.reloads = (state.reloads || 0) + 1;
    if (!state) state = fresh();
    save();
    render();
    if (state.submitted && !state.sent && !DEMO) send();   // 上次送出失敗：自動重送
  }

  function fresh() {
    return { v: 1, pid: newPid(), mode: MODE, idx: 0, cond: null, assign: '', answers: {}, task: { stage: 0, runs: 0 },
      dur: {}, ts: {}, reloads: 0, terminal: null, submitted: false, sent: false, done: false, record: null };
  }

  function buildScreens() {
    const p = C.pages[MODE];
    return [{ kind: 'consent', id: 'consent' }]
      .concat(p.before.map(pg => ({ kind: 'form', id: pg.id, page: pg })))
      .concat([{ kind: 'brief', id: 'brief' }, { kind: 'task', id: 'task' }])
      .concat(p.after.map(pg => ({ kind: 'form', id: pg.id, page: pg })))
      .concat([{ kind: 'debrief', id: 'debrief' }]);
  }

  function save() { store.set(KEY, state); }

  function newPid() {
    const abc = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const buf = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    return Array.from(buf, n => abc[n % abc.length]).join('');
  }
  function randInt(n) { const b = new Uint32Array(1); window.crypto.getRandomValues(b); return b[0] % n; }

  // ---------------------------------------------------------------- 小工具
  function esc(s) { return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
  function placeholder(k) {
    if (k === 'pid') return '<span class="pid">' + esc(state.pid) + '</span>';
    if (k === 'minutes') return esc(C.minutes[MODE]);
    const v = CFG.researcher && CFG.researcher[k];
    return v == null ? '{' + k + '}' : esc(v);
  }
  // 純文字 → HTML：跳脫、代入 {…}、反引號變成程式碼字體
  function rich(t) {
    return esc(t).replace(/\{(\w+)\}/g, (m, k) => placeholder(k)).replace(/`([^`]+)`/g, '<code>$1</code>');
  }
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(children || []).forEach(c => { if (c != null) el.append(c); });
    return el;
  }
  function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; }
  function crit() { return COND[state.cond] && COND[state.cond].T ? 'high' : 'low'; }
  function syc() { return COND[state.cond] && COND[state.cond].S ? 'S1' : 'S2'; }

  // ---------------------------------------------------------------- 畫面
  function frame(width) {
    root.innerHTML = '';
    if (TEST) root.append(demoBar());
    const pct = Math.round(100 * state.idx / (screens.length - 1));
    root.append(h('header', { class: 'topbar' }, h('div', { class: 'topbar-inner' }, [
      h('div', { class: 'topbar-title', text: C.title }),
      h('div', { class: 'progress', role: 'progressbar', 'aria-label': '進度', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 },
        h('span', { style: 'width:' + pct + '%' })),
    ])));
    const page = h('main', { class: 'page ' + (width || 'narrow') });
    root.append(page);
    return page;
  }

  function render() {
    if (state.terminal) return renderTerminal();
    const s = screens[state.idx];
    enteredAt = Date.now();
    if (s.kind === 'consent') return renderConsent();
    if (s.kind === 'form') return renderForm(s.page);
    if (s.kind === 'brief') return renderBrief();
    if (s.kind === 'task') return renderTask();
    if (s.kind === 'debrief') return renderDebrief();
  }

  function leave() {
    const s = screens[state.idx];
    if (s && enteredAt) state.dur[s.id] = (state.dur[s.id] || 0) + (Date.now() - enteredAt);
    enteredAt = 0;
  }

  async function goNext() {
    leave();
    const next = screens[state.idx + 1];
    if (next && next.kind === 'brief' && !state.cond) await assign();
    state.idx += 1;
    save();
    render();
    window.scrollTo(0, 0);
  }

  function renderTerminal() {
    const t = state.terminal;
    const page = frame();
    let msg;
    if (t === 'already') msg = C.alreadyDone;
    else if (t && t.indexOf('screenout:') === 0) msg = C.screenOut[t.slice(10)] || C.screenOut.ineligible;
    else msg = { heading: C.consent.heading, text: C.consent.declined };
    page.append(h('h1', { text: msg.heading }), h('div', { class: 'panel' }, h('p', { html: rich(msg.text) })));
  }

  // 知情同意
  function renderConsent() {
    const page = frame();
    const c = C.consent;
    page.append(h('h1', { text: c.heading }));
    page.append(h('div', { class: 'panel' }, h('div', { class: 'stack' }, c.paragraphs.map(p => h('p', { html: rich(p) })))));
    const agree = h('button', { class: 'btn', type: 'button', id: 'agree', text: c.agree, onclick: () => {
      state.startedAt = state.startedAt || Date.now();
      state.ts.consent = Date.now();
      goNext();
    } });
    const decline = h('button', { class: 'btn secondary', type: 'button', id: 'decline', text: c.decline, onclick: () => {
      root.innerHTML = '';
      const p = frame();
      p.append(h('h1', { text: c.heading }), h('div', { class: 'panel' }, h('p', { text: c.declined })));
    } });
    page.append(h('div', { class: 'actions' }, [agree, decline]));
  }

  // 問卷頁
  function renderForm(pg) {
    const page = frame();
    page.append(h('h1', { text: pg.title }));
    if (pg.help) page.append(h('p', { class: 'lead', html: rich(pg.help) }));
    const list = h('div', { class: 'stack' });
    pg.items.forEach(it => list.append(renderItem(it)));
    page.append(list);
    const err = h('p', { class: 'form-error', role: 'alert', hidden: true, text: C.nav.requiredAll });
    const btn = h('button', { class: 'btn', type: 'button', id: 'next', text: pg.submit ? C.nav.submit : C.nav.next });
    btn.addEventListener('click', async () => {
      if (!collect(pg)) {
        err.hidden = false;
        const first = list.querySelector('.invalid');
        if (first) first.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
        return;
      }
      err.hidden = true;
      const out = pg.items.find(it => it.screenOut && state.answers[it.id] === it.screenOut);
      if (out) return screenOut(out);
      btn.disabled = true;
      if (pg.submit) return submit();
      await goNext();
    });
    page.append(h('div', { class: 'actions' }, [btn, err]));
  }

  function renderItem(it) {
    if (it.type === 'note') return h('div', { class: 'note', html: rich(it.text) });
    const saved = state.answers[it.id];
    const onChange = () => { wrap.classList.remove('invalid'); errEl.hidden = true; const v = readItem(it, wrap); if (v !== '') { state.answers[it.id] = v; save(); } };
    const errEl = h('p', { class: 'err', hidden: true, text: C.nav.required });
    let wrap;
    if (it.type === 'text') {
      const ta = h('textarea', { id: 'f-' + it.id, name: it.id, rows: 3 });
      if (saved) ta.value = saved;
      ta.addEventListener('input', onChange);
      wrap = h('div', { class: 'q', 'data-id': it.id }, [
        h('label', { class: 'qtext', for: 'f-' + it.id, html: rich(it.text) }),
        it.help ? h('p', { class: 'help', html: rich(it.help) }) : null,
        ta, errEl,
      ]);
      return wrap;
    }
    const opts = it.type === 'likert'
      ? h('div', { class: 'scale', role: 'radiogroup', 'aria-label': it.text }, [1, 2, 3, 4, 5, 6, 7].map(v =>
          h('label', { class: 'pt' }, [h('input', { type: 'radio', name: it.id, value: v, id: 'f-' + it.id + '-' + v, checked: saved === v, 'aria-label': v + '（' + C.likertLabels[v - 1] + '）' }), h('span', { text: String(v) })])))
      : h('div', { class: 'opts' }, it.options.map((o, i) =>
          h('label', { class: 'opt' }, [h('input', { type: 'radio', name: it.id, value: o, id: 'f-' + it.id + '-' + i, checked: saved === o }), h('span', { text: o })])));
    opts.addEventListener('change', onChange);
    wrap = h('fieldset', { class: 'q' + (it.type === 'likert' ? ' likert' : ''), 'data-id': it.id }, [
      h('legend', { html: rich(it.text) }),
      it.help ? h('p', { class: 'help', html: rich(it.help) }) : null,
      opts,
      it.type === 'likert' ? h('div', { class: 'ends', 'aria-hidden': 'true' }, [h('span', { text: '1 ' + C.likertLabels[0] }), h('span', { text: '7 ' + C.likertLabels[6] })]) : null,
      errEl,
    ]);
    return wrap;
  }

  function readItem(it, wrap) {
    // 換行改成空格：匯出 CSV 後，SPSS 才不會把一筆讀成兩筆
    if (it.type === 'text') return wrap.querySelector('textarea').value.replace(/\s*[\r\n]+\s*/g, ' ').trim();
    const el = wrap.querySelector('input:checked');
    if (!el) return '';
    return it.type === 'likert' ? Number(el.value) : el.value;
  }

  function collect(pg) {
    let ok = true;
    document.querySelectorAll('.q[data-id]').forEach(wrap => {
      const it = pg.items.find(x => x.id === wrap.getAttribute('data-id'));
      const v = readItem(it, wrap);
      if (v === '' && !it.optional) {
        ok = false;
        wrap.classList.add('invalid');
        wrap.querySelector('.err').hidden = false;
      } else state.answers[it.id] = v;
    });
    save();
    return ok;
  }

  function screenOut(it) {
    leave();
    state.terminal = 'screenout:' + (it.outKey || 'ineligible');
    save();
    beacon('screenout', { screen: it.id, detail: state.answers[it.id] });
    render();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- 分組
  async function assign() {
    if (state.cond) return;
    let cond = null, src = '';
    if (TEST && prefs.cond) { cond = prefs.cond; src = 'forced'; }
    else if (!TEST) {
      try {
        const url = CFG.endpoint + '?action=assign&mode=' + MODE + '&pid=' + encodeURIComponent(state.pid);
        const j = await getJSON(url, 10000);
        if (j && j.ok && COND[j.cond]) { cond = j.cond; src = 'server'; }
      } catch (e) { /* 改用瀏覽器端隨機 */ }
    }
    if (!cond) { cond = 'ABCD'[randInt(4)]; src = src || (DEMO ? 'demo' : TEST ? 'test' : 'client'); }
    state.cond = cond;
    state.assign = src;
    state.ts.assigned = Date.now();
    save();
    beacon('assigned', { detail: src });
  }

  // ---------------------------------------------------------------- 任務說明
  function renderBrief() {
    const page = frame();
    const b = C.brief;
    page.append(h('h1', { text: b.heading }));
    page.append(h('div', { class: 'panel' }, h('div', { class: 'stack' }, [
      h('p', { html: rich(b.lead) }),
      h('div', { class: 'scenario' }, h('p', { html: rich(b.base + b.criticality[crit()]) })),
      h('p', { text: '接下來的畫面中，請依序：' }),
      h('ol', { class: 'steps' }, b.steps.map(s => h('li', { text: s }))),
    ])));
    const btn = h('button', { class: 'btn', type: 'button', id: 'start', text: b.start, disabled: true, onclick: () => { state.ts.brief_done = Date.now(); goNext(); } });
    page.append(h('div', { class: 'actions' }, btn));
    later(() => { btn.disabled = false; }, TEST ? 300 : (CFG.minBriefMs || 0));
  }

  // ---------------------------------------------------------------- 互動任務
  function highlight(src) {
    const re = /(#.*$)|("[^"]*")|\b(def|if|elif|else|return|and|or|not|in|for|while|True|False|None)\b|\b(\d+)\b|([A-Za-z_]\w*)(?=\()/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'com' : m[2] ? 'str' : m[3] ? 'kw' : m[4] ? 'num' : 'fn';
      out += '<span class="tok-' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + esc(src.slice(last));
  }

  function codeLines() {
    const T = C.task, t = state.task;
    const lines = T.code.slice();
    let changed = -1;
    if (t.decision === 'fix') { lines[T.bugLine] = '    if item.stock >= qty:'; changed = T.bugLine; }
    if (t.decision === 'edit') { lines[T.bugLine] = /^\s/.test(t.edit_text) ? t.edit_text : '    ' + t.edit_text; changed = T.bugLine; }
    return { lines, changed };
  }

  function codeBlock(lines, changed) {
    return h('pre', { class: 'code', html: lines.map((ln, i) =>
      '<span class="ln' + (i === changed ? ' changed' : '') + '" data-n="' + (i + 1) + '">' + highlight(ln) + '</span>').join('') });
  }

  function editCorrect(s) {
    const x = String(s).replace(/[\s()]/g, '');
    return /item\.stock>=qty|qty<=item\.stock|item\.stock-qty>=0|item\.stock>qty-1|qty-1<item\.stock|notitem\.stock<qty/.test(x) ? 1 : 0;
  }

  function renderTask() {
    const T = C.task, t = state.task;
    if (!t.start) t.start = Date.now();
    if (t.stage === 2) t.stage = 3;            // 重新整理時，正在輸入的訊息直接顯示
    if (t.stage === 4) t.stage = 5;
    save();
    const page = frame('wide');

    page.append(h('section', { class: 'taskcard', 'aria-label': T.cardLabel }, [
      h('span', { class: 'label', text: T.cardLabel }),
      h('span', { class: 'deadline', text: T.deadline }),
      h('p', { html: rich(C.brief.criticality[crit()]) }),
      h('p', { class: 'stance' }, [h('span', { class: 'label', text: T.stanceLabel }), ' ', h('span', { html: rich(T.stance) })]),
    ]));

    // 左：程式碼與測試
    const codeHost = h('div');
    const consoleEl = h('pre', { class: 'console', 'aria-live': 'polite' });
    const runBtn = h('button', { class: 'btn secondary', type: 'button', id: 'run-tests', text: '▶ ' + T.runTests });
    const editor = h('section', { class: 'editor', 'aria-label': '程式碼' }, [
      h('div', { class: 'editor-head' }, [h('span', { class: 'filename', text: T.fileName })]),
      codeHost,
      h('div', { class: 'editor-actions' }, [runBtn]),
      consoleEl,
    ]);

    // 右：AI 助手
    const log = h('div', { class: 'chat-log', 'aria-live': 'polite' });
    const compose = h('div', { class: 'compose' });
    const chat = h('section', { class: 'chat', 'aria-label': T.assistantName }, [
      h('div', { class: 'chat-head' }, [h('span', { class: 'avatar', text: 'AI', 'aria-hidden': 'true' }),
        h('span', { class: 'chat-name', text: T.assistantName }), h('span', { class: 'chat-status', text: '● ' + T.assistantStatus })]),
      log, compose,
    ]);
    page.append(h('div', { class: 'workbench' }, [editor, chat]));

    function drawCode() { const c = codeLines(); codeHost.innerHTML = ''; codeHost.append(codeBlock(c.lines, c.changed)); }
    function drawConsole(running) {
      if (!t.runs && !running) { consoleEl.textContent = ''; return; }
      consoleEl.innerHTML = esc(T.testCommand) + '\n' + (running ? '…' : T.testLines.map(l =>
        '<span class="pass">' + (l.ok ? '✓' : '✗') + '</span> ' + esc(l.text)).join('\n') + '\n<span class="sum">' + esc(T.testSummary) + '</span>');
    }
    function bubble(cls, html, withCode) {
      const el = h('div', { class: 'msg ' + cls, html });
      if (withCode) el.append(h('div', { class: 'attach' }, codeBlock(T.code, -1)));
      return el;
    }
    function drawChat() {
      log.innerHTML = '';
      if (t.stage < 2) { log.append(h('p', { class: 'chat-empty', text: T.emptyChat })); return; }
      log.append(bubble('user', rich(T.ask), true));
      if (t.stage === 2) { log.append(typing()); return; }
      log.append(bubble('ai', rich(T.ai1)));
      if (t.stage < 4) return;
      log.append(bubble('user', rich(T.pushbacks[(t.pushback || 1) - 1])));
      if (t.stage === 4) { log.append(typing()); return; }
      log.append(bubble('ai', rich(T.ai2[syc()])));
    }
    function typing() { return h('div', { class: 'typing', 'aria-label': 'AI 助手正在輸入' }, [h('i'), h('i'), h('i')]); }
    function reveal() { compose.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' }); }

    function drawCompose() {
      compose.innerHTML = '';
      if (t.stage <= 1) {
        compose.append(h('p', { class: 'hint', text: T.composeHint }));
        compose.append(h('button', { class: 'chip', type: 'button', id: 'ask', disabled: t.stage < 1, html: rich(T.ask), onclick: ask }));
      } else if (t.stage === 2 || t.stage === 4) {
        compose.append(h('p', { class: 'hint', text: 'AI 程式開發助手正在輸入…' }));
      } else if (t.stage === 3) {
        compose.append(h('p', { class: 'prompt', text: T.pushbackPrompt }));
        const n = CFG.pushbackOptions === 1 ? 1 : T.pushbacks.length;
        T.pushbacks.slice(0, n).forEach((p, i) => compose.append(h('button', { class: 'chip', type: 'button', id: 'push-' + (i + 1), html: rich(p), onclick: () => pushback(i + 1) })));
      } else if (t.stage === 5) {
        if (CFG.askDecision === false) {
          compose.append(h('button', { class: 'btn', type: 'button', id: 'finish', text: T.next, onclick: () => decide('') }));
        } else {
          compose.append(h('p', { class: 'prompt', text: T.decisionPrompt }));
          T.decisions.forEach(d => compose.append(h('button', { class: 'chip', type: 'button', id: 'decide-' + d.value, html: rich(d.label), onclick: () => d.value === 'edit' ? openEdit() : decide(d.value) })));
        }
      } else if (t.stage === 6) {
        compose.append(h('p', { class: 'done-note', text: T.decided }));
        compose.append(h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', id: 'task-next', text: T.next, onclick: finish })));
      }
    }

    function openEdit() {
      compose.innerHTML = '';
      const input = h('input', { type: 'text', id: 'edit-line', value: T.code[T.bugLine].trim(), spellcheck: 'false', autocomplete: 'off', 'aria-label': '修改第 3 行' });
      const err = h('p', { class: 'err', hidden: true, text: C.nav.required });
      compose.append(h('p', { class: 'prompt', text: T.editPrompt }), h('div', { class: 'edit-line' }, [input,
        h('button', { class: 'btn', type: 'button', id: 'edit-ok', text: T.editConfirm, onclick: () => {
          const v = input.value.trim();
          if (!v) { err.hidden = false; return; }
          t.edit_text = v;
          t.edit_correct = editCorrect(v);
          decide('edit');
        } })]), err,
        h('button', { class: 'chip', type: 'button', id: 'edit-back', text: '← 回到選項', onclick: drawCompose }));
      input.focus();
    }

    function ask() {
      if (t.stage !== 1) return;
      t.ask = Date.now(); t.stage = 2; save();
      drawChat(); drawCompose(); reveal();
      later(() => { t.stage = 3; t.ai1 = Date.now(); save(); drawChat(); drawCompose(); reveal(); }, CFG.typingDelayMs || 0);
    }
    function pushback(i) {
      if (t.stage !== 3) return;
      t.pushback = i; t.push = Date.now(); t.stage = 4; save();
      drawChat(); drawCompose(); reveal();
      later(() => { t.stage = 5; t.ai2 = Date.now(); save(); drawChat(); drawCompose(); reveal(); }, CFG.typingDelayMs || 0);
    }
    function decide(v) {
      if (t.stage !== 5) return;
      t.decision = v; t.decide = Date.now(); t.stage = 6; save();
      drawCode(); drawCompose(); reveal();
    }
    function finish() {
      state.ts.task_done = Date.now();
      beacon('task_done', { detail: t.decision || '' });
      goNext();
    }

    runBtn.addEventListener('click', () => {
      runBtn.disabled = true;
      drawConsole(true);
      later(() => {
        t.runs = (t.runs || 0) + 1;
        if (!t.tests) t.tests = Date.now();
        if (t.stage === 0) t.stage = 1;
        save();
        drawConsole(false);
        runBtn.disabled = false;
        if (t.stage <= 1) drawCompose();
      }, 700);
    });

    drawCode(); drawConsole(false); drawChat(); drawCompose();
  }

  // ---------------------------------------------------------------- 送出與事後說明
  function sec(ms) { return ms == null || isNaN(ms) ? '' : Math.round(ms / 100) / 10; }
  function iso(ms) { return ms ? new Date(ms).toISOString() : ''; }

  function buildRecord() {
    const a = state.answers, t = state.task, c = COND[state.cond] || {};
    const span = (x, y) => (x && y ? sec(y - x) : '');
    const r = {
      pid: state.pid, mode: MODE, cond: state.cond, S: c.S, T: c.T, assign: state.assign, test: TEST ? 1 : 0, version: CFG.version || '',
      started_at: iso(state.startedAt), submitted_at: iso(state.ts.submit), total_s: span(state.ts.consent, state.ts.submit),
    };
    const items = pages => pages.forEach(pg => pg.items.forEach(it => { if (it.id) r[it.id] = a[it.id] == null ? '' : a[it.id]; }));
    items(C.pages[MODE].before);
    Object.assign(r, {
      tests_runs: t.runs || 0,
      pushback: t.pushback || '',
      decision: t.decision || '',
      edit_text: t.edit_text || '',
      edit_correct: t.decision === 'edit' ? t.edit_correct : '',
      t_to_tests_s: span(t.start, t.tests),     // 進入任務到第一次執行測試
      t_ai1_read_s: span(t.ai1, t.push),        // AI 第 1 則出現到送出質疑
      t_ai2_read_s: span(t.ai2, t.decide),      // AI 第 2 則出現到做出決定
      t_task_s: span(t.start, t.decide || state.ts.task_done),
    });
    items(C.pages[MODE].after);
    screens.forEach(s => { if (s.kind !== 'debrief') r['page_' + s.id + '_s'] = sec(state.dur[s.id]); });   // 各頁停留秒數
    Object.assign(r, {
      reloads: state.reloads || 0,
      pointer_coarse: window.matchMedia && matchMedia('(pointer: coarse)').matches ? 1 : 0,
      touch_points: navigator.maxTouchPoints || 0,
      screen_w: window.screen ? screen.width : '',
      viewport_w: window.innerWidth,
      ua: navigator.userAgent,
    });
    return r;
  }

  function submit() {
    leave();
    state.ts.submit = Date.now();
    state.record = buildRecord();
    state.submitted = true;
    state.idx = screens.length - 1;
    if (DEMO) { state.sent = false; state.done = true; }
    save();
    render();
    window.scrollTo(0, 0);
    if (!DEMO) send();
  }

  let sending = false;
  async function send() {
    if (sending || state.sent) return;
    sending = true;
    setBanner('info', C.sending);
    const ok = await postRecord(state.record);
    sending = false;
    if (ok) { state.sent = true; state.done = true; save(); setBanner('ok', '資料已送出，感謝您。'); }
    else setBanner('error', C.sendFailed, true);
  }

  async function postRecord(rec) {
    const body = JSON.stringify({ kind: 'response', mode: MODE, record: rec });
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetchTimeout(CFG.endpoint, { method: 'POST', body, redirect: 'follow', credentials: 'omit' }, 20000);
        const j = await res.json();
        if (j && j.ok) return true;
      } catch (e) {
        // 讀不到回應時，確認伺服器是否已收到（伺服器以編號去重，重送不會重複）
        try {
          const j = await getJSON(CFG.endpoint + '?action=check&mode=' + MODE + '&pid=' + encodeURIComponent(rec.pid), 10000);
          if (j && j.exists) return true;
        } catch (e2) { /* 繼續重試 */ }
      }
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
    return false;
  }

  function fetchTimeout(url, opts, ms) {
    const ctl = window.AbortController ? new AbortController() : null;
    const id = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
    return fetch(url, Object.assign({}, opts, ctl ? { signal: ctl.signal } : {})).finally(() => clearTimeout(id));
  }
  async function getJSON(url, ms) { const r = await fetchTimeout(url, { credentials: 'omit' }, ms); return r.json(); }

  function beacon(type, extra) {
    if (DEMO) return;
    const body = JSON.stringify({ kind: 'event', mode: MODE, event: Object.assign({
      type, pid: state.pid, mode: MODE, cond: state.cond || '', test: TEST ? 1 : 0, at: new Date().toISOString(), screen: '', detail: '',
    }, extra || {}) });
    try { if (navigator.sendBeacon && navigator.sendBeacon(CFG.endpoint, body)) return; } catch (e) { /* 改用 fetch */ }
    try { fetch(CFG.endpoint, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {}); } catch (e) { /* 不影響作答 */ }
  }

  let bannerEl = null;
  function setBanner(kind, text, retry) {
    if (!bannerEl) return;
    bannerEl.className = 'banner ' + kind;
    bannerEl.innerHTML = '';
    bannerEl.append(h('span', { html: rich(text) }));
    if (retry) bannerEl.append(' ', h('button', { class: 'btn secondary', type: 'button', id: 'retry', text: C.retry, onclick: send }));
  }

  function renderDebrief() {
    const page = frame();
    const d = C.debrief;
    bannerEl = h('div', { class: 'banner info', role: 'status' });
    page.append(bannerEl);
    if (DEMO) setBanner('info', '示範模式：config.js 沒有設定 endpoint，所以資料沒有送出。下方是這筆資料送出時的內容。');
    else if (state.sent) setBanner('ok', '資料已送出，感謝您。');
    else setBanner('info', C.sending);
    page.append(h('h1', { text: d.heading }));
    page.append(h('div', { class: 'panel' }, h('div', { class: 'stack' }, d.paragraphs.map(p => h('p', { html: rich(p) })))));
    if (CFG.lotteryUrl) page.append(h('p', {}, h('a', { href: CFG.lotteryUrl, target: '_blank', rel: 'noopener', text: d.lottery })));
    page.append(h('p', { class: 'lead', text: d.close }));
    if (DEMO && state.record) page.append(h('details', { class: 'preview' }, [h('summary', { text: '資料預覽（' + Object.keys(state.record).length + ' 個欄位）' }),
      h('pre', { text: JSON.stringify(state.record, null, 2) })]));
  }

  // ---------------------------------------------------------------- 示範工具列
  function demoBar() {
    const inner = h('div', { class: 'demo-bar-inner' });
    const bar = h('div', { class: 'demo-bar', role: 'group', 'aria-label': '示範模式工具' }, inner);
    const label = (DEMO ? '示範模式' : '測試模式') + '｜' + (MODE === 'main' ? '正式實驗' : '前測') +
      (state && state.cond ? '｜組別 ' + state.cond + '（' + COND[state.cond].label + '）' : '');
    inner.append(h('b', { text: label }));
    const restart = (p, jump) => {
      Object.assign(prefs, p);
      store.set(PREF_KEY, prefs);
      ['pretest', 'main'].forEach(m => store.del(BASE_KEY + ':' + m + ':test'));
      boot({ keep: true });
      if (jump) {
        state.startedAt = Date.now(); state.ts.consent = Date.now();
        state.idx = screens.findIndex(s => s.kind === 'brief') - 1;
        goNext();
      }
    };
    inner.append(h('span', { class: 'sep', text: '｜' }));
    [['pretest', '前測'], ['main', '正式']].forEach(([m, txt]) =>
      inner.append(h('button', { type: 'button', 'aria-pressed': MODE === m ? 'true' : 'false', text: txt, onclick: () => restart({ mode: m }) })));
    inner.append(h('span', { class: 'sep', text: '｜' }));
    Object.keys(COND).forEach(k =>
      inner.append(h('button', { type: 'button', title: COND[k].label, 'aria-pressed': prefs.cond === k ? 'true' : 'false', text: k, onclick: () => restart({ cond: k }, true) })));
    inner.append(h('button', { type: 'button', text: '從頭開始', onclick: () => restart({}) }));
    return bar;
  }

  // ---------------------------------------------------------------- 離開頁面
  window.addEventListener('beforeunload', e => {
    if (TEST || !state || state.terminal || state.submitted || state.idx === 0) return;
    e.preventDefault();
    e.returnValue = '';
  });
  window.addEventListener('pagehide', () => {
    if (!state || state.submitted || state.terminal || !state.cond) return;
    leave(); save();
    beacon('leave', { screen: screens[state.idx] ? screens[state.idx].id : '' });
  });
  window.addEventListener('pageshow', e => { if (e.persisted && state && !state.submitted) enteredAt = Date.now(); });

  boot();
})();
