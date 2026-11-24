// 編集・照明・アドバイス・練習・書き出しの各タブ
function undo() {
  const t = undoStack.pop();
  if (!t) {
    toast('戻せる操作はありません');
    return;
  }
  const o = JSON.parse(t);
  S.keys = o.keys;
  S.baseKeys = o.baseKeys;
  S.dancers = o.dancers;
  S.cues = o.cues || [];
  ui.sel = Math.min(ui.sel, S.keys.length - 1);
  changed(true);
  toast('1つ前に戻しました');
}
function changed(all) {
  sortKeys();
  save();
  if (all) refreshAll();
  else {
    renderKeyChips();
    renderAdvice();
  }
  requestRender();
}

/* ===== 編集タブ ===== */
let currentTab = 'edit';
function selectKey(i) {
  ui.sel = i;
  pause();
  setCount(S.keys[i].at);
  renderKeyChips();
  fillKeyForm();
}
function renderKeyChips() {
  const box = $('#keyChips');
  box.textContent = '';
  const adv = analyze(), bad = {};
  adv.forEach(a => { if (a.lv === 0 && a.key >= 0) bad[a.key] = (bad[a.key] || 0) + 1; });
  S.keys.forEach((k, i) => {
    const b = el('button', { class: 'chip' + (i === ui.sel ? ' on' : ''), onclick: () => selectKey(i) }, [`${cLabel(k.at)} ${k.name}`]);
    if (bad[i]) b.append(el('span', { class: 'bad', text: String(bad[i]) }));
    box.append(b);
  });
  const on = box.children[ui.sel];
  if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function fillKeyForm() {
  const k = S.keys[ui.sel];
  if (!k) return;
  $('#kName').value = k.name;
  $('#kEight').value = Math.floor(k.at / 8) + 1;
  $('#kCount').value = k.at % 8 + 1;
  $('#kMove').value = k.move;
  $('#kMove').disabled = ui.sel === 0;
}
$('#kName').addEventListener('change', e => {
  pushUndo();
  S.keys[ui.sel].name = e.target.value.slice(0, 20) || '隊形';
  changed(false);
});
function atFromForm() {
  const e = Math.max(1, parseInt($('#kEight').value) || 1), c = Math.min(8, Math.max(1, parseInt($('#kCount').value) || 1));
  return (e - 1) * 8 + (c - 1);
}
['#kEight', '#kCount'].forEach(s => $(s).addEventListener('change', () => {
  const at = atFromForm();
  if (S.keys.some((k, i) => i !== ui.sel && k.at === at)) {
    toast('同じ時刻に別の隊形があります');
    fillKeyForm();
    return;
  }
  pushUndo();
  S.keys[ui.sel].at = at;
  if (at >= S.totalEights * 8) S.totalEights = Math.floor(at / 8) + 2;
  changed(true);
  setCount(S.keys[ui.sel].at);
}));
$('#kMove').addEventListener('change', e => {
  pushUndo();
  S.keys[ui.sel].move = Math.max(1, Math.min(64, parseInt(e.target.value) || 4));
  changed(false);
  requestRender();
});
$('#btnAddKey').addEventListener('click', () => {
  const k = S.keys[ui.sel];
  let at = Math.round(ui.count);
  if (S.keys.some(x => x.at === at)) at = k.at + 16;
  while (S.keys.some(x => x.at === at)) at += 8;
  pushUndo();
  const nk = { id: newId(), name: '隊形' + (S.keys.length + 1), at, move: 4, pos: clone(positionsAt(S.keys, at)) };
  S.keys.push(nk);
  if (at >= S.totalEights * 8) S.totalEights = Math.floor(at / 8) + 2;
  sortKeys();
  ui.sel = S.keys.indexOf(nk);
  changed(true);
  setCount(at);
  toast('今の立ち位置をコピーした隊形を追加しました。丸を動かすか「形を当てはめる」で形を作ってください', 3600);
});
$('#btnDelKey').addEventListener('click', () => {
  if (S.keys.length <= 1) {
    toast('最後の1つは消せません');
    return;
  }
  ask(`「${S.keys[ui.sel].name}」を削除しますか？`, '削除する', () => {
    pushUndo();
    S.keys.splice(ui.sel, 1);
    ui.sel = Math.max(0, ui.sel - 1);
    changed(true);
    setCount(S.keys[ui.sel].at);
  });
});
$('#btnUndo').addEventListener('click', undo);
$('#btnUndo2').addEventListener('click', undo);
Object.keys(TEMPLATES).forEach(t => $('#tplSel').append(el('option', { value: t, text: t })));
$('#btnTpl').addEventListener('click', () => {
  const k = S.keys[ui.sel], spots = TEMPLATES[$('#tplSel').value](S.dancers.length, S.stage.w, S.stage.d);
  pushUndo();
  const from = ui.sel > 0 ? S.keys[ui.sel - 1].pos : k.pos;
  k.pos = assignSpots(from, spots).map(p => [r2(p[0]), r2(p[1])]);
  k.pos = clampPos(k.pos);
  if (k.name.startsWith('隊形')) k.name = $('#tplSel').value.replace(/（.*）/, '');
  changed(true);
  toast('前の隊形から近い人が近い場所に行くように割り当てました');
});
$('#btnMirror').addEventListener('click', () => {
  pushUndo();
  const k = S.keys[ui.sel];
  k.pos = k.pos.map(p => [-p[0], p[1]]);
  changed(false);
});
$('#btnCenter').addEventListener('click', () => {
  pushUndo();
  const k = S.keys[ui.sel];
  k.pos = centerPos(k.pos);
  changed(false);
});

/* 照明・きっかけ */
Object.entries(LIGHT_KINDS).forEach(([k, v]) => $('#cKind').append(el('option', { value: k, text: v })));
function fillCueTargets() {
  const s = $('#cTarget');
  s.textContent = '';
  s.append(el('option', { value: '-1', text: '（なし）' }));
  S.dancers.forEach((d, i) => s.append(el('option', { value: String(i), text: d.name })));
}
function renderCueChips() {
  const box = $('#cueChips');
  box.textContent = '';
  if (!S.cues.length) box.append(el('span', { class: 'muted', text: 'まだありません' }));
  S.cues.forEach(q => box.append(el('button',
    { class: 'chip' + (q.id === ui.selCue ? ' on' : ''), onclick: () => selectCue(q.id) },
    [`${cLabel(q.at)} ${q.kind === 'memo' ? '♪' : '💡'}${q.name}`])));
}
function selectCue(id) {
  const q = S.cues.find(x => x.id === id);
  if (!q) return;
  ui.selCue = id;
  pause();
  setCount(q.at);
  $('#cKind').value = q.kind;
  $('#cName').value = q.name;
  $('#cColor').value = q.color;
  $('#cTarget').value = String(q.target);
  $('#cFade').value = q.fade;
  $('#cEight').value = Math.floor(q.at / 8) + 1;
  $('#cCount').value = q.at % 8 + 1;
  renderCueChips();
}
function cueFromForm(at) {
  const kind = $('#cKind').value;
  return {
    kind, name: ($('#cName').value.trim() || LIGHT_KINDS[kind]).slice(0, 20),
    color: $('#cColor').value, target: parseInt($('#cTarget').value),
    fade: Math.max(0, Math.min(32, parseInt($('#cFade').value) || 0)), at };
}
$('#btnAddCue').addEventListener('click', () => {
  const at = Math.max(0, Math.round(ui.count));
  pushUndo();
  const q = Object.assign({ id: newId() }, cueFromForm(at));
  if (q.kind === 'spot' && q.target < 0) q.target = ui.me >= 0 ? ui.me : 0;
  S.cues.push(q);
  S.cues.sort((a, b) => a.at - b.at);
  ui.selCue = q.id;
  save();
  renderCueChips();
  renderAdvice();
  requestRender();
  toast(`${cLabel(at)} に「${q.name}」を追加しました`);
});
$('#btnUpdCue').addEventListener('click', () => {
  const q = S.cues.find(x => x.id === ui.selCue);
  if (!q) {
    toast('先に上の一覧から選んでください');
    return;
  }
  pushUndo();
  const e = Math.max(1, parseInt($('#cEight').value) || 1), cc = Math.min(8, Math.max(1, parseInt($('#cCount').value) || 1));
  Object.assign(q, cueFromForm((e - 1) * 8 + cc - 1));
  S.cues.sort((a, b) => a.at - b.at);
  save();
  renderCueChips();
  requestRender();
  setCount(q.at);
  toast('更新しました');
});
$('#btnDelCue').addEventListener('click', () => {
  const i = S.cues.findIndex(x => x.id === ui.selCue);
  if (i < 0) {
    toast('先に上の一覧から選んでください');
    return;
  }
  pushUndo();
  S.cues.splice(i, 1);
  ui.selCue = null;
  save();
  renderCueChips();
  requestRender();
});
let clickCtx = null, lastBeat = null;
function clickSound(strong) {
  try {
    if (!clickCtx) clickCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = clickCtx.createOscillator(), g = clickCtx.createGain(), t = clickCtx.currentTime;
    o.frequency.value = strong ? 1600 : 1000;
    g.gain.setValueAtTime(strong ? 0.5 : 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g);
    g.connect(clickCtx.destination);
    o.start(t);
    o.stop(t + 0.07);
  } catch (e) { }
}
$('#clickOn').addEventListener('change', e => {
  if (e.target.checked) {
    try {
      if (!clickCtx) clickCtx = new (window.AudioContext || window.webkitAudioContext)();
      clickCtx.resume();
    } catch (x) { }
  }
});


/* ===== アドバイスタブ ===== */
function renderAdvice() {
  const list = $('#advList'), adv = analyze();
  list.textContent = '';
  const c = [0, 0, 0];
  adv.forEach(a => c[a.lv]++);
  const sm = $('#advSummary');
  sm.textContent = '';
  sm.append(
    el('span', {}, [el('b', { text: String(c[0]), style: 'color:var(--red)' }), ' 要修正']),
    el('span', {}, [el('b', { text: String(c[1]), style: 'color:var(--amber)' }), ' 提案']),
    el('span', {}, [el('b', { text: String(c[2]) }), ' 参考']));
  if (S.baseKeys) sm.append(el('span', { class: 'muted', text: '（ベースを保存済み）' }));
  if (!adv.length) list.append(el('div', { class: 'card', text: '気になる所は見つかりませんでした。完成形です。' }));
  adv.forEach(a => {
    const where = a.key >= 0 ? el('span', { class: 'where', text: `${cLabel(S.keys[a.key].at)} ${S.keys[a.key].name}`, onclick: () => {
      switchTab('edit');
      selectKey(a.key);
    } }) : null;
    const body = el('div', { class: 'body' }, [where ? el('div', {}, [where]) : null, el('div', { text: a.msg })]);
    const row = el('div', { class: 'adv l' + a.lv }, [el('span', { class: 'tag', text: ['要修正', '提案', '参考'][a.lv] }), body]);
    if (a.fix) row.append(el('button', { class: 'small', text: a.fixLabel, onclick: () => {
      pushUndo();
      if (!S.baseKeys) S.baseKeys = clone(S.keys);
      a.fix();
      changed(true);
      toast('直しました（元に戻すで戻せます）');
    } }));
    list.append(row);
  });
}
$('#btnImprove').addEventListener('click', autoImprove);
$('#compare').addEventListener('change', e => {
  ui.compare = e.target.checked;
  if (ui.compare && !S.baseKeys) toast('まだ改善していないので、ベースはありません');
  requestRender();
});
$('#btnRestoreBase').addEventListener('click', () => {
  if (!S.baseKeys) {
    toast('ベースは保存されていません');
    return;
  }
  pushUndo();
  S.keys = clone(S.baseKeys);
  ui.sel = 0;
  changed(true);
  toast('ベースに戻しました');
});
$('#btnSetBase').addEventListener('click', () => {
  pushUndo();
  S.baseKeys = clone(S.keys);
  changed(true);
  toast('今の形をベースとして保存しました');
});
$('#btnAiText').addEventListener('click', async () => {
  const adv = analyze(), L = [];
  L.push(`ダンスのフォーメーションについて、振付の観点で改善案をください。`, `作品：${S.title} ／ ${S.dancers.length}人 ／ ステージ 横${S.stage.w}m×奥行${S.stage.d}m ／ BPM ${S.bpm} ／ 長さ ${S.totalEights}×8カウント`,
    `座標：x はステージ中央が0で、客席から見て右（上手）がプラス。y は客席側の端が0で、奥へ行くほど大きい（単位 m）。`, '');
  S.keys.forEach(k => {
    L.push(`■ ${cLabel(k.at)}「${k.name}」（移動 ${k.move}カウント）`);
    L.push(k.pos.map((p, i) => `${S.dancers[i].name}(${p[0].toFixed(1)},${p[1].toFixed(1)})`).join(' '));
  });
  if (S.cues && S.cues.length) L.push('',
    '照明・きっかけ：' + S.cues.map(q => `${cLabel(q.at)} ${LIGHT_KINDS[q.kind]}「${q.name}」`
      + `${q.kind === 'spot' && q.target >= 0 ? '→' + S.dancers[q.target].name : ''}${q.fade ? `（フェード${q.fade}）` : ''}`).join(' ／ '));
  if (S.energy) L.push('', '曲の盛り上がり（8カウントごと、0〜1）：' + S.energy.map(e => e.toFixed(2)).join(' '));
  L.push('', 'アプリが自動で見つけた点：');
  adv.forEach(a => L.push(`- [${['要修正', '提案', '参考'][a.lv]}] ${a.key >= 0 ? cLabel(S.keys[a.key].at) + ' ' : ''}${a.msg}`));
  L.push('', '見せ方・流れ・センターの使い方などの意見と、直した後の座標を同じ書き方で返してください。');
  const txt = L.join('\n');
  try {
    await navigator.clipboard.writeText(txt);
    toast('コピーしました。Claude や ChatGPT に貼り付けてください');
  }
  catch (e) {
    $('#pasteJson').value = txt;
    switchTab('setup');
    toast('自動でコピーできなかったので、設定タブの入力欄に入れました');
  }
});
$('#allowSwap').addEventListener('change', () => { });

function autoImprove() {
  const before = analyze();
  const nb = before.filter(a => a.lv === 0).length, ns = before.filter(a => a.lv === 1).length;
  pushUndo();
  if (!S.baseKeys) S.baseKeys = clone(S.keys);
  const allowSwap = $('#allowSwap').checked;
  const energies = S.keys.map((_, i) => keyEnergy(i)), eS = energies.filter(e => e != null).sort((a, b) => a - b);
  const eHigh = eS.length ? eS[Math.floor(eS.length * 0.7)] : null;
  const sMed = [...S.keys.map(k => spreadOf(k.pos))].sort((a, b) => a - b)[Math.floor(S.keys.length / 2)];
  S.keys.forEach((k, i) => {
    k.pos = clampPos(k.pos);
    const cx = k.pos.reduce((s, p) => s + p[0], 0) / k.pos.length;
    if (Math.abs(cx) > S.stage.w * 0.12) k.pos = centerPos(k.pos);
    if (eHigh != null && energies[i] != null && energies[i] >= eHigh && spreadOf(k.pos) < sMed * 0.95) k.pos = spreadOut(k.pos);
    k.pos = fixFormation(k.pos);
  });
  for (let i = 1; i < S.keys.length; i++) {
    const p = S.keys[i - 1], k = S.keys[i], gap = k.at - p.at;
    if (allowSwap) {
      const opt = optimalNext(p.pos, k.pos), cur = totalDist(p.pos, k.pos), best = totalDist(p.pos, opt);
      const crash = minPathGap(p.pos, k.pos).d < TH.crash, crash2 = minPathGap(p.pos, opt).d < TH.crash;
      if ((crash && !crash2) || cur - best > Math.max(2, cur * 0.15)) k.pos = opt;
    }
    if (k.move > gap) k.move = gap;
    const v = Math.max(...p.pos.map((q, j) => hyp(q[0] - k.pos[j][0], q[1] - k.pos[j][1]))) / (k.move * beatSec());
    if (v > TH.speed) k.move = Math.min(gap, Math.max(k.move, neededMove(p.pos, k.pos)));
  }
  changed(true);
  const after = analyze();
  const na = after.filter(a => a.lv === 0).length, sa = after.filter(a => a.lv === 1).length;
  toast(`要修正 ${nb}→${na}件、提案 ${ns}→${sa}件になりました。気に入らなければ「元に戻す」で戻せます。`, 4200);
}

/* ===== 練習タブ ===== */
function fillMeSel() {
  const s = $('#meSel');
  s.textContent = '';
  s.append(el('option', { value: '-1', text: '（選ばない）' }));
  S.dancers.forEach((d, i) => s.append(el('option', { value: String(i), text: d.name })));
  if (ui.me >= S.dancers.length) ui.me = -1;
  s.value = String(ui.me);
}
$('#meSel').addEventListener('change', e => {
  ui.me = parseInt(e.target.value);
  try { localStorage.setItem(LS_KEY + '.me', String(ui.me)); } catch (x) { }
  requestRender();
});
$('#viewSel').addEventListener('change', e => {
  ui.view = e.target.value;
  try { localStorage.setItem(LS_KEY + '.view', ui.view); } catch (x) { }
  requestRender();
});
$('#showNames').addEventListener('change', e => {
  ui.showNames = e.target.checked;
  requestRender();
});
$('#showPaths').addEventListener('change', e => {
  ui.showPaths = e.target.checked;
  requestRender();
});
let dlCap; // claude.ai の中で開いたときは、保存の仕組み（downloads）を使う
if (window.claude && window.claude.use) dlCap = window.claude.use('downloads').catch(() => null);
async function download(blob, name) {
  const cap = dlCap ? await dlCap : null;
  if (cap) {
    try {
      await cap.save({ filename: name, data: blob });
      toast('保存しました');
    }
    catch (e) {
      toast(e && e.code === 'declined' ? '保存をやめました'
        : e && e.code === 'host_unavailable' ? 'このアプリでは保存できません。ブラウザかパソコンで開いてください'
          : '保存できませんでした');
    }
    return;
  }
  // iPhone などは共有シートから「写真」「ファイル」に保存する
  try {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      ask(`「${name}」ができました。`, '保存・共有する', () => { navigator.share({ files: [file] }).catch(() => { }); });
      return;
    }
  } catch (e) { }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 4000);
}
function ask(msg, okLabel, fn) { // 画面の中で確かめる（埋め込み先では確認ダイアログが出ないため）
  const box = $('#askBox');
  box.textContent = '';
  const close = () => { box.hidden = true; };
  box.append(el('div', { text: msg, style: 'margin-bottom:8px' }), el('div', { class: 'row', style: 'margin:0' }, [
    el('button', { class: 'primary', text: okLabel, onclick: () => {
      close();
      fn();
    } }), el('button', { text: 'やめる', onclick: close })]));
  box.hidden = false;
}
const safeName = s => (s || 'formation').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30);
function legend(c, x, y, w, fs) {
  let cx = x, cy = y;
  c.font = `${fs}px sans-serif`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  S.dancers.forEach(d => {
    const tw = c.measureText(d.name).width + fs * 1.8;
    if (cx + tw > x + w) {
      cx = x;
      cy += fs * 1.6;
    }
    c.fillStyle = d.color;
    c.beginPath();
    c.arc(cx + fs * 0.5, cy, fs * 0.45, 0, 7);
    c.fill();
    c.fillStyle = '#e8ecf3';
    c.fillText(d.name, cx + fs * 1.1, cy);
    cx += tw;
  });
  return cy + fs;
}
$('#btnSheet').addEventListener('click', () => {
  const cols = S.keys.length > 4 ? 3 : 2, cw = 520;
  const ch = Math.round(cw * (S.stage.d + 1.3) / (S.stage.w + 0.6)) + 34, rows = Math.ceil(S.keys.length / cols);
  const c = document.createElement('canvas'), W = cols * cw + 20, H = 70 + rows * (ch + 10) + 120;
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0e14';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#fff';
  x.font = '700 28px sans-serif';
  x.textBaseline = 'top';
  x.textAlign = 'left';
  x.fillText(`${S.title}（${S.dancers.length}人・BPM ${S.bpm}）`, 14, 18);
  S.keys.forEach((k, i) => {
    const ox = 10 + (i % cols) * cw, oy = 70 + Math.floor(i / cols) * (ch + 10);
    x.save();
    x.translate(ox, oy + 34);
    drawStage(x, cw - 10, ch - 34, k.at, { view: ui.view, me: -1, names: true });
    x.restore();
    x.fillStyle = '#4fb3ff';
    x.font = '700 20px sans-serif';
    x.textBaseline = 'top';
    x.textAlign = 'left';
    x.fillText(`${i + 1}. ${cLabel(k.at)} ${k.name}`, ox + 4, oy + 6);
  });
  legend(x, 14, 70 + rows * (ch + 10) + 20, W - 28, 18);
  c.toBlob(b => download(b, safeName(S.title) + '_全隊形.png'), 'image/png');
});
$('#btnKeyPng').addEventListener('click', () => {
  const c = document.createElement('canvas'), w = 1200, h = Math.round(w * (S.stage.d + 1.3) / (S.stage.w + 0.6)) + 140;
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0e14';
  x.fillRect(0, 0, w, h);
  x.save();
  x.translate(0, 60);
  drawStage(x, w, h - 140, ui.count, { view: ui.view, me: ui.me, names: true });
  x.restore();
  const k = S.keys[keyIndexAt(ui.count)];
  x.fillStyle = '#fff';
  x.font = '700 30px sans-serif';
  x.textBaseline = 'top';
  x.textAlign = 'left';
  x.fillText(`${S.title} ／ ${cLabel(ui.count)} ${k.name}`, 16, 14);
  legend(x, 16, h - 60, w - 32, 20);
  c.toBlob(b => download(b, `${safeName(S.title)}_${cLabel(ui.count)}.png`), 'image/png');
});
/* 動画 */
let rec = null, recChunks = [], recCanvas = null, recCtx = null, audioCtx = null, mediaDest = null;
function drawRecFrame() {
  if (!recCtx) return;
  const w = recCanvas.width, h = recCanvas.height;
  drawStage(recCtx, w, h, ui.count, { view: ui.view, me: ui.me, names: true, showPaths: ui.showPaths });
  recCtx.fillStyle = '#fff';
  recCtx.font = '800 64px sans-serif';
  recCtx.textAlign = 'right';
  recCtx.textBaseline = 'top';
  recCtx.fillText(cLabel(ui.count), w - 24, 14);
  const k = S.keys[keyIndexAt(ui.count)];
  recCtx.font = '700 30px sans-serif';
  recCtx.textAlign = 'left';
  recCtx.fillText(`${S.title} ／ ${k.name}`, 20, 20);
}
$('#btnVideo').addEventListener('click', async () => {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    toast('この端末のブラウザは動画の書き出しに対応していません');
    return;
  }
  if (ui.recording) {
    stopRecording();
    return;
  }
  pause();
  recCanvas = document.createElement('canvas');
  recCanvas.width = 1280;
  recCanvas.height = 720;
  recCtx = recCanvas.getContext('2d');
  const stream = recCanvas.captureStream(30);
  if (audioReady) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaElementSource(audio);
        mediaDest = audioCtx.createMediaStreamDestination();
        src.connect(audioCtx.destination);
        src.connect(mediaDest);
      }
      await audioCtx.resume();
      mediaDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { toast('音を入れられなかったので、映像だけで作ります'); }
  }
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  const mime = types.find(t => MediaRecorder.isTypeSupported(t)) || '';
  try {
    rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4e6 } : undefined);
  } catch (e) {
    toast('動画を作れませんでした');
    return;
  }
  recChunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) recChunks.push(e.data); };
  rec.onstop = () => {
    const type = rec.mimeType || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    download(new Blob(recChunks, { type }), `${safeName(S.title)}.${ext}`);
    recCtx = null;
    $('#btnVideo').textContent = '動画に書き出す';
    toast('動画を保存しました');
  };
  ui.recording = true;
  setCount(0);
  drawRecFrame();
  rec.start(500);
  $('#btnVideo').textContent = '■ 書き出しを止める';
  toast('最後まで再生すると動画ができます。途中で止めるとそこまでの動画になります', 4000);
  play();
});
function stopRecording() {
  ui.recording = false;
  try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (e) { }
}
