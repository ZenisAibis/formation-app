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
$('#title').addEventListener('change', e => {
  S.title = e.target.value.slice(0, 40) || '無題';
  $('#hdrTitle').textContent = S.title;
  save();
});
$('#stW').addEventListener('change', e => {
  S.stage.w = Math.min(40, Math.max(3, parseFloat(e.target.value) || 10));
  save();
  fitCanvas();
  renderAdvice();
  renderKeyChips();
});
$('#stD').addEventListener('change', e => {
  S.stage.d = Math.min(30, Math.max(2, parseFloat(e.target.value) || 6));
  save();
  fitCanvas();
  renderAdvice();
  renderKeyChips();
});
$('#totalEights').addEventListener('change', e => {
  S.totalEights = Math.min(400, Math.max(1, parseInt(e.target.value) || 24));
  save();
  renderAdvice();
  requestRender();
});
$('#bpm').addEventListener('change', e => {
  S.bpm = Math.min(240, Math.max(40, parseFloat(e.target.value) || 120));
  afterTempoChange();
});
$('#offset').addEventListener('change', e => {
  S.offset = Math.max(0, parseFloat(e.target.value) || 0);
  afterTempoChange();
});
const shiftOff = d => {
  S.offset = Math.max(0, r2(S.offset + d));
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
  S.offset = r2(audio.currentTime);
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
let taps = [];
$('#btnTap').addEventListener('click', () => {
  const t = performance.now();
  if (taps.length && t - taps[taps.length - 1] > 2000) taps = [];
  taps.push(t);
  if (taps.length > 9) taps.shift();
  if (taps.length >= 4) {
    const iv = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
    S.bpm = Math.round(60000 / iv * 10) / 10;
    $('#tapInfo').textContent = `${taps.length}回 → BPM ${S.bpm}`;
    afterTempoChange();
  }
  else $('#tapInfo').textContent = `拍に合わせて押してください（${taps.length}回）`;
});
$('#btnAddDancer').addEventListener('click', () => {
  if (S.dancers.length >= 40) return;
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
function loadObj(o) {
  const s = validState(o);
  if (!s) {
    toast('読み込めませんでした（形式が違います）');
    return false;
  }
  pushUndo();
  S = s;
  ui.sel = 0;
  ui.me = -1;
  refreshAll();
  setCount(S.keys[0].at);
  save();
  toast('読み込みました');
  return true;
}
$('#loadFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  try { loadObj(JSON.parse(await f.text())); } catch (x) { toast('読み込めませんでした'); }
  e.target.value = '';
});
$('#btnPasteLoad').addEventListener('click', () => {
  const t = $('#pasteJson').value, i = t.indexOf('{'), j = t.lastIndexOf('}');
  try { loadObj(JSON.parse(t.slice(i, j + 1))); } catch (x) { toast('JSONとして読めませんでした'); }
});
$('#btnDemo').addEventListener('click', () => ask('今の内容を消して見本に戻しますか？（「元に戻す」で戻せます）', '見本に戻す', () => {
  pushUndo();
  S = demoState();
  ui.sel = 0;
  refreshAll();
  setCount(0);
  save();
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
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) {
    e.preventDefault();
    toggle();
  }
  if (e.key === 'Escape' && document.body.classList.contains('proj')) $('#projExit').click();
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
