// 編集タブの下半分：照明・きっかけ／拍のクリック音
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
// 照明の入力欄を S から作り直す。選んでいる照明があればその値、無ければ空の入力欄
function fillCueForm() {
  const q = S.cues.find(x => x.id === ui.selCue);
  $('#cKind').value = q ? q.kind : $('#cKind').options[0].value;
  $('#cName').value = q ? q.name : '';
  $('#cColor').value = q ? q.color : '#ff3b6b';
  $('#cTarget').value = q ? String(q.target) : '-1';
  $('#cFade').value = q ? q.fade : '';
  $('#cEight').value = q ? Math.floor(q.at / 8) + 1 : '';
  $('#cCount').value = q ? q.at % 8 + 1 : '';
}
function selectCue(id) {
  const q = S.cues.find(x => x.id === id);
  if (!q) return;
  ui.selCue = id;
  pause();
  setCount(q.at);
  fillCueForm();
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
