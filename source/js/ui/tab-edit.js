// 編集タブ：隊形の一覧・入力欄・追加・削除・形の当てはめ
/* ===== 編集タブ ===== */
let currentTab = 'edit';
function selectKey(i) {
  ui.sel = i;
  pause();
  setCount(S.keys[i].at);
  renderKeyChips();
  fillKeyForm();
  setCard('key');
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
  $('#cardKeyTitle').textContent = `隊形 ${ui.sel + 1}「${k.name}」`;
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
  fillKeyForm();
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
    setCard(null);
  });
});
$('#btnUndo').addEventListener('click', undo);
$('#btnRedo').addEventListener('click', redo);
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

/* 選んだ物のカード：ふだんは出さず、隊形・丸（ダンサー）・照明を選んだときだけ、その物のカードを出す */
function syncCards() {
  // 選びが無くなっていたら、そのカードは閉じる
  if (ui.card === 'dancer' && ui.selDancer < 0) ui.card = null;
  if (ui.card === 'cue' && ui.selCue == null) ui.card = null;
  $('#cardKey').hidden = ui.card !== 'key';
  $('#cardDancer').hidden = ui.card !== 'dancer';
  $('#cardCue').hidden = ui.card !== 'cue';
  $('#editHint').hidden = ui.card !== null;
  if (ui.card === 'dancer') fillDancerCard();
  else syncDancerPalette();
}
function setCard(c) {
  ui.card = c;
  syncCards();
}
// 丸のカード：名前・色・今の位置（客席から見て。x は中央が0で上手＝右がプラス、y は客席側の端が0）
function fillDancerCard() {
  const i = ui.selDancer, d = S.dancers[i], k = S.keys[ui.sel];
  if (!d || !k || !k.pos[i]) return;
  const p = k.pos[i];
  $('#cardDancerName').textContent = d.name;
  $('#cardDancerSw').style.background = d.color;
  syncDancerPalette();
  fillDancerGroup(i);
  $('#cardDancerPos').textContent = `中央から${p[0] < 0 ? '左' : '右'} ${Math.abs(p[0]).toFixed(2)}m・前から ${p[1].toFixed(2)}m（客席から見て）`;
  $('#cardDancerBami').textContent = `バミリ ${bamiriText(p[0], p[1])}`;
  $('#cardDancerNear').textContent = `まわり（画面の左右） ${neighborText(neighborsOf(k.pos, i), S.dancers.map(x => x.name), ui.view)}`;
  $('#btnSetMe').textContent = ui.me === i ? '「自分」を外す' : 'この人を「自分」にする';
}
$('#btnCloseKey').addEventListener('click', () => setCard(null));
$('#btnCloseDancer').addEventListener('click', () => {
  ui.selDancer = -1;
  setCard(null);
  requestRender();
});
$('#btnCloseCue').addEventListener('click', () => {
  ui.selCue = null;
  renderCueChips();
  setCard(null);
  requestRender();
});
$('#btnSetMe').addEventListener('click', () => {
  setMe(ui.me === ui.selDancer ? -1 : ui.selDancer);
  fillDancerCard();
});
