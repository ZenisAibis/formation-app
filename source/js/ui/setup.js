// 設定タブ・保存と読み込みの操作・タブ切り替え・起動
/* ===== 設定タブ ===== */
function fillSetup() {
  $('#title').value = S.title;
  $('#stW').value = S.stage.w;
  $('#stD').value = S.stage.d;
  $('#totalEights').value = S.totalEights;
  $('#bpm').value = S.bpm;
  $('#offset').value = S.offset.toFixed(2);
  $('#hdrTitle').textContent = S.title;
  $('#dCount').textContent = S.dancers.length;
  const box = $('#dancerList');
  box.textContent = '';
  S.dancers.forEach((d, i) => {
    const inp = el('input', { type: 'text', maxlength: '16', value: d.name, 'aria-label': `${i + 1}人目の名前` });
    inp.addEventListener('change', () => {
      pushUndo();
      d.name = inp.value.trim().slice(0, 16) || `No.${i + 1}`;
      save();
      fillMeSel();
      fillCueTargets();
      renderKeyChips();
      renderAdvice();
      requestRender();
    });
    box.append(el('div', { class: 'drow' }, [el('span', { class: 'sw', style: `background:${d.color}` }), inp]));
  });
}
// 設定の入力欄は、change のとき（打ち終わったとき）に1回だけ履歴に積む。値が変わらなければ積まない
$('#title').addEventListener('change', e => {
  const v = e.target.value.slice(0, 40) || '無題';
  if (v !== S.title) pushUndo();
  S.title = v;
  e.target.value = v;
  $('#hdrTitle').textContent = S.title;
  save();
});
$('#stW').addEventListener('change', e => {
  const v = Math.min(40, Math.max(3, parseFloat(e.target.value) || 10));
  if (v !== S.stage.w) pushUndo();
  S.stage.w = v;
  e.target.value = v;
  save();
  fitCanvas();
  renderAdvice();
  renderKeyChips();
});
$('#stD').addEventListener('change', e => {
  const v = Math.min(30, Math.max(2, parseFloat(e.target.value) || 6));
  if (v !== S.stage.d) pushUndo();
  S.stage.d = v;
  e.target.value = v;
  save();
  fitCanvas();
  renderAdvice();
  renderKeyChips();
});
$('#totalEights').addEventListener('change', e => {
  const v = Math.min(400, Math.max(1, parseInt(e.target.value) || 24));
  if (v !== S.totalEights) pushUndo();
  S.totalEights = v;
  e.target.value = v;
  save();
  renderAdvice();
  requestRender();
});
$('#bpm').addEventListener('change', e => {
  const v = Math.min(240, Math.max(40, parseFloat(e.target.value) || 120));
  if (v !== S.bpm) pushUndo();
  S.bpm = v;
  afterTempoChange();
});
$('#offset').addEventListener('change', e => {
  const v = Math.max(0, parseFloat(e.target.value) || 0);
  if (v !== S.offset) pushUndo();
  S.offset = v;
  afterTempoChange();
});
const shiftOff = d => {
  const v = Math.max(0, r2(S.offset + d));
  if (v !== S.offset) pushUndo();
  S.offset = v;
  afterTempoChange();
};
$('#offM1').addEventListener('click', () => shiftOff(-beatSec()));
$('#offP1').addEventListener('click', () => shiftOff(beatSec()));
$('#offMs').addEventListener('click', () => shiftOff(-0.05));
$('#offPs').addEventListener('click', () => shiftOff(0.05));
$('#btnNowIsOne').addEventListener('click', () => {
  if (!audioReady) {
    toast('先に曲を読み込んでください');
    return;
  }
  const v = r2(audio.currentTime);
  if (v !== S.offset) pushUndo();
  S.offset = v;
  afterTempoChange();
  toast('今の時刻を 1-1 にしました');
});
function afterTempoChange() {
  if (analysis) {
    S.energy = energyPerEight(analysis);
    S.totalEights = Math.max(1, Math.ceil((analysis.duration - S.offset) / (8 * beatSec())));
  }
  save();
  fillSetup();
  renderAdvice();
  renderKeyChips();
  if (audioReady && !ui.playing) ui.count = (audio.currentTime - S.offset) / beatSec();
  requestRender();
}
let taps = [], tapPushed = false;
$('#btnTap').addEventListener('click', () => {
  const t = performance.now();
  if (taps.length && t - taps[taps.length - 1] > 2000) {
    taps = [];
    tapPushed = false;
  }
  taps.push(t);
  if (taps.length > 9) taps.shift();
  if (taps.length >= 4) {
    if (!tapPushed) { // 連続して叩く間の BPM の変更は、1回の操作として1つだけ積む
      pushUndo();
      tapPushed = true;
    }
    const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
    S.bpm = Math.round(60000 / iv * 10) / 10;
    $('#tapInfo').textContent = `${taps.length}回 → BPM ${S.bpm}`;
    afterTempoChange();
  } else $('#tapInfo').textContent = `拍に合わせて押してください（${taps.length}回）`;
});
$('#btnAddDancer').addEventListener('click', () => {
  if (S.dancers.length >= MAX_DANCERS) return;
  pushUndo();
  const i = S.dancers.length;
  S.dancers.push({ name: `No.${i + 1}`, color: PALETTE[i % PALETTE.length] });
  const add = ks => ks && ks.forEach(k => k.pos.push([0, r2(Math.min(S.stage.d - 0.5, 0.8))]));
  add(S.keys);
  add(S.baseKeys);
  changed(true);
  toast('前の真ん中に追加しました。位置を直してください');
});
$('#btnDelDancer').addEventListener('click', () => {
  if (S.dancers.length <= 1) return;
  const d = S.dancers[S.dancers.length - 1];
  ask(`${d.name} を削除しますか？`, '削除する', () => {
    pushUndo();
    S.dancers.pop();
    S.keys.forEach(k => k.pos.pop());
    (S.cues || []).forEach(q => { if (q.target >= S.dancers.length) q.target = -1; });
    if (S.baseKeys) S.baseKeys.forEach(k => k.pos.pop());
    if (ui.me >= S.dancers.length) ui.me = -1;
    changed(true);
  });
});

/* 曲の読み込みと解析 */
$('#audioFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  pause();
  if (audio.src) URL.revokeObjectURL(audio.src);
  audio.src = URL.createObjectURL(f);
  audioReady = true;
  $('#audioName').textContent = f.name + '（解析中…）';
  try {
    const buf = await f.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
    const ab = await new Promise((res, rej) => {
      const p = ac.decodeAudioData(buf, res, rej);
      if (p && p.then) p.then(res, rej);
    });
    try { ac.close(); } catch (x) { }
    analysis = analyzeAudio(ab);
    pushUndo(); // 曲を読み込んで BPM・頭の位置・長さ・盛り上がりが変わるのも、1つの操作
    S.bpm = analysis.bpm;
    S.offset = analysis.offset;
    afterTempoChange();
    $('#audioName').textContent = `${f.name}（${Math.floor(analysis.duration / 60)}分${Math.round(analysis.duration % 60)}秒）`;
    toast(`BPM ${S.bpm}、1カウント目は ${S.offset.toFixed(2)}秒 と推定しました。曲を流して合っているか確かめてください`, 5000);
  } catch (err) {
    $('#audioName').textContent = f.name + '（解析できませんでした。BPMは手で入れてください）';
  }
  setCount(0);
});

/* 保存・読み込み */
$('#btnSave').addEventListener('click',
  () => download(new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), safeName(S.title) + '.json'));
// 作品を丸ごと置き換える（読み込み・見本に戻す）。元に戻すと置き換える前の作品が丸ごと戻る（1つの単位）
function replaceWork(st, count) {
  pushUndo();
  S = st;
  ui.sel = 0;
  ui.selDancer = -1;
  ui.selCue = null;
  ui.me = -1;
  refreshAll();
  setCount(count == null ? S.keys[0].at : count);
  save();
}
// 読み込み：確かめて、断るなら理由を知らせる。読めなかった隊形があるときは、何が起きるかを知らせて、押されてから読み込む
function loadObj(o) {
  const r = inspectLoad(o);
  if (!r.ok) {
    toast(`読み込めませんでした（${r.reason}）`, 6000);
    return false;
  }
  if (r.dropped > 0) {
    ask(`${r.dropped} 個の隊形を読み込めませんでした（人数と座標の数が合わないため）。残りの ${r.state.keys.length} 個で読み込みますか？`,
      '読み込む', () => {
        replaceWork(r.state);
        toast(`読み込みました（${r.dropped} 個の隊形は読み込めませんでした）`, 6000);
      });
    return false;
  }
  replaceWork(r.state);
  toast('読み込みました');
  return true;
}
// JSON の読み取りだけを try に入れる（読み込みの中のエラーを「JSONとして読めない」にしない）
function parseJson(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch (x) { return { ok: false }; }
}
$('#loadFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  const p = parseJson(await f.text());
  if (p.ok) loadObj(p.value);
  else toast('読み込めませんでした');
  e.target.value = '';
});
$('#btnPasteLoad').addEventListener('click', () => {
  const t = $('#pasteJson').value, i = t.indexOf('{'), j = t.lastIndexOf('}');
  const p = parseJson(t.slice(i, j + 1));
  if (p.ok) loadObj(p.value);
  else toast('JSONとして読めませんでした');
});
$('#btnDemo').addEventListener('click', () => ask('今の内容を消して見本に戻しますか？（「元に戻す」で戻せます）', '見本に戻す', () => {
  replaceWork(demoState(), 0);
}));

/* ===== タブ・全体 ===== */
function switchTab(t) {
  currentTab = t;
  document.querySelectorAll('nav#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  document.querySelectorAll('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
  if (t === 'advice') renderAdvice();
  requestRender();
}
document.querySelectorAll('nav#tabs button').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
function refreshAll() {
  if (!Array.isArray(S.cues)) S.cues = [];
  sortKeys();
  fillSetup();
  fillMeSel();
  fillCueTargets();
  renderCueChips();
  renderKeyChips();
  fillKeyForm();
  renderAdvice();
  fitCanvas();
}
$('#btnPlay').addEventListener('click', toggle);
$('#projPlay').addEventListener('click', toggle);
$('#btnBack').addEventListener('click', () => {
  const k = S.keys[ui.sel];
  pause();
  setCount(Math.max(0, k.at - 8));
});
$('#rate').addEventListener('change', e => {
  ui.rate = parseFloat(e.target.value);
  if (audioReady) audio.playbackRate = ui.rate;
  if (ui.playing) {
    ui.clockT0 = performance.now();
    ui.clockC0 = ui.count;
  }
});
$('#btnProj').addEventListener('click', () => {
  document.body.classList.add('proj');
  try {
    const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
    if (p && p.catch) p.catch(() => { });
  } catch (e) { }
  fitCanvas();
});
$('#projExit').addEventListener('click', () => {
  document.body.classList.remove('proj');
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) { }
  fitCanvas();
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('proj')) {
    document.body.classList.remove('proj');
    fitCanvas();
  }
});
// 文字を打つ欄。ここでは Ctrl+Z を文字の取り消しに任せる（アプリの元に戻すは効かせない）
function isTypingTarget(t) {
  if (!t || !t.tagName) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA') return true;
  return t.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(t.type);
}
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
    e.preventDefault();
    toggle();
  }
  if (e.key === 'Escape' && document.body.classList.contains('proj')) $('#projExit').click();
  // Ctrl/Cmd+Z＝元に戻す、Ctrl/Cmd+Shift+Z と Ctrl+Y＝やり直す
  if ((e.ctrlKey || e.metaKey) && !e.altKey && !isTypingTarget(e.target)) {
    const key = String(e.key).toLowerCase();
    if (key === 'z') {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if (key === 'y' && e.ctrlKey) {
      e.preventDefault();
      redo();
    }
  }
});
window.addEventListener('resize', fitCanvas);
if (window.ResizeObserver) new ResizeObserver(fitCanvas).observe($('#stageWrap'));
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && ui.playing) {
    try {
      if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { }
  }
});
// 閉じる・隠れるときは、待っている保存をすぐ行う（300ms の待ちの間に閉じても消えない）
window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
// 保存に失敗したら黙らず知らせる（続けて失敗しても、同じ知らせは1回。成功すると、次の失敗でまた知らせる）
saveHooks.onFail = () => toast('この端末に保存できませんでした。「ファイルに保存」で作品を書き出してください', 8000);

S = load();
try {
  const m = parseInt(localStorage.getItem(LS_KEY + '.me'));
  if (m >= 0 && m < S.dancers.length) ui.me = m;
  const v = localStorage.getItem(LS_KEY + '.view');
  if (v === 'dancer' || v === 'audience') {
    ui.view = v;
    $('#viewSel').value = v;
  }
} catch (e) { }
refreshAll();
setCount(S.keys[0].at);
requestAnimationFrame(tick);
if ('serviceWorker' in navigator && location.protocol === 'https:' && document.querySelector('link[rel=manifest]')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
