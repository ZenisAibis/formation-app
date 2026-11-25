// ロックの画面：丸のカードの「固定する／外す」・隊形のカードの固定の一覧と意図したクロスの付け外し・ステージの × を押して付け外し
// 変えるときは、1つの操作＝1つの元に戻す単位（保存の形は core/locks.js）
/* ===== ロックの画面 ===== */
function commitLockChange() {
  changed(false); // 保存・助言の描き直し・カードの一覧の描き直しまで行う
}
// ステージに鍵の印を出す人：カウントがちょうど隊形の時刻にあるとき、その隊形で固定している人（移動の途中では出さない）
function lockMarksAt(count) {
  const k = S.keys[keyIndexAt(count)];
  return k && Math.abs(count - k.at) < 0.01 ? lockPosOf(k) : [];
}
// 丸のカード：選んだ丸を、いま選んでいる隊形で固定する・外す
function fillDancerLock(i) {
  const k = S.keys[ui.sel], on = !!k && isLockedPos(k, i), b = $('#btnLockDancer');
  const text = on ? 'ロックを外す（動かせるようにする）' : 'この隊形で位置を固定する（ロック）';
  if (b.textContent !== text) b.textContent = text;
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  $('#cardDancerLockHint').hidden = !on;
}
$('#btnLockDancer').addEventListener('click', () => {
  const k = S.keys[ui.sel], i = ui.selDancer;
  if (!k || i < 0 || i >= S.dancers.length) return;
  const was = isLockedPos(k, i);
  pushUndo();
  toggleLockPos(k, i);
  commitLockChange();
  toast(was ? `${S.dancers[i].name} のロックを外しました。動かせます`
    : `${S.dancers[i].name} の位置を固定しました（この隊形では、自動の直し・反転・中央寄せ・ドラッグでも動きません）`, 3600);
});
// 意図したクロスの付け外し（隊形 ui.sel に着く移動の中の2人。ステージの × とカードの一覧の両方から）
function toggleCrossIntent(a, b) {
  const k = S.keys[ui.sel];
  if (!k || ui.sel <= 0) return;
  const was = isIntendedCross(k, a, b);
  pushUndo();
  toggleLockCross(k, a, b);
  commitLockChange();
  toast(was ? '意図したクロスの印を外しました'
    : `${nm(a)} と ${nm(b)} のクロスを「意図したクロス」にしました（ぶつかりの警告と行き先の入れ替えの対象から外れます）`, 3800);
}
// ステージの × の近く（18px 以内）を押したときの、そのクロス（無ければ null）
function crossHitAt(sx, sy) {
  if (ui.sel <= 0 || !lastLayout) return null;
  let best = null, bd = 18;
  crossesInto(ui.sel).forEach(cr => {
    const [x, y] = lastLayout.map(cr.pt[0], cr.pt[1]), d = hyp(x - sx, y - sy);
    if (d < bd) {
      bd = d;
      best = cr;
    }
  });
  return best;
}
// 隊形のカード：固定している人の一覧・全部外す・クロスする組の一覧（押すと意図したクロスを付け外し）
const CROSS_LIST_MAX = 12;
function renderLockCard() {
  const k = S.keys[ui.sel];
  if (!k) return;
  const L = lockPosOf(k);
  $('#lockSummary').textContent = L.length ? `位置を固定している人（${L.length}人）：${names(L)}` : '位置を固定している人はいません（丸を押すと、カードで固定できます）';
  $('#rowLockClear').hidden = !L.length;
  const items = (ui.sel > 0 ? crossesInto(ui.sel) : []).map(cr => ({ a: cr.a, b: cr.b, on: cr.intended, now: true }));
  lockCrossOf(k).forEach(c => { if (!items.some(x => x.a === c[0] && x.b === c[1])) items.push({ a: c[0], b: c[1], on: true, now: false }); });
  items.sort((p, q) => (q.on - p.on) || (p.a - q.a) || (p.b - q.b));
  const box = $('#crossList');
  box.textContent = '';
  $('#crossBox').hidden = !items.length;
  items.slice(0, CROSS_LIST_MAX).forEach(it => box.append(el('button', {
    type: 'button', class: 'small crossbtn', 'aria-pressed': it.on ? 'true' : 'false',
    text: `${it.on ? '◎ 意図 ' : ''}${nm(it.a)} × ${nm(it.b)}${it.now ? '' : '（今は交わっていません）'}`,
    onclick: () => toggleCrossIntent(it.a, it.b) })));
  if (items.length > CROSS_LIST_MAX) box.append(el('span', { class: 'muted', text: `ほか ${items.length - CROSS_LIST_MAX} 組（ステージの × を押しても付け外しできます）` }));
}
$('#btnLockClear').addEventListener('click', () => {
  const k = S.keys[ui.sel];
  if (!k || !lockPosOf(k).length) return;
  pushUndo();
  delete k.lock.pos;
  tidyLock(k);
  commitLockChange();
  toast('この隊形の位置の固定を全部外しました');
});
