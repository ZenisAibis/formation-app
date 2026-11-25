// ロック：隊形 k の keys[k].lock = { pos: [人の番号…], cross: [[小, 大]…] }。画面に触らない
// pos＝その隊形で位置を固定する人（自動の直し・反転・中央寄せ・形の当てはめ・ドラッグで動かさない）
// cross＝前の隊形→k の移動で、わざと交わる2人の組（ぶつかりの警告と行き先の入れ替えの対象から外す）
// 両方空なら lock ごと書かない（ロックを使わない作品は今までと同じ JSON のまま）
'use strict';
/* ===== ロック ===== */
const lockPosOf = k => (k && k.lock && k.lock.pos) || [];
const lockCrossOf = k => (k && k.lock && k.lock.cross) || [];
const isLockedPos = (k, i) => lockPosOf(k).includes(i);
const isIntendedCross = (k, a, b) => lockCrossOf(k).some(c => c[0] === Math.min(a, b) && c[1] === Math.max(a, b));
const usesLock = st => [st.keys, st.baseKeys].some(ks => (ks || []).some(k => lockPosOf(k).length > 0 || lockCrossOf(k).length > 0));
// 行き先の入れ替えで、行き先を動かさない人：位置を固定した人と、意図したクロスの2人
function assignPins(k) {
  const s = new Set(lockPosOf(k));
  lockCrossOf(k).forEach(c => { s.add(c[0]); s.add(c[1]); });
  return [...s];
}
// ダンサーの番号を含む項目の確かめ（読み込みと「ダンサーを消す」の両方から使う）。k.lock を、人数 n の範囲に直して置き直す。
// 範囲外の番号・番号でない値・重なり・自分どうしの組は、その1件だけ捨てる（作品は断らない）。空になったら lock ごと消す
function cleanDancerRefs(k, n) {
  const raw = k.lock;
  delete k.lock;
  if (!raw || typeof raw !== 'object') return k;
  const okIdx = v => Number.isInteger(v) && v >= 0 && v < n;
  const pos = [...new Set((Array.isArray(raw.pos) ? raw.pos : []).filter(okIdx))].sort((a, b) => a - b);
  const seen = new Set(), cross = [];
  (Array.isArray(raw.cross) ? raw.cross : []).forEach(c => {
    if (!Array.isArray(c) || c.length !== 2 || !okIdx(c[0]) || !okIdx(c[1]) || c[0] === c[1]) return;
    const a = Math.min(c[0], c[1]), b = Math.max(c[0], c[1]), key = a + ',' + b;
    if (seen.has(key)) return;
    seen.add(key);
    cross.push([a, b]);
  });
  cross.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (pos.length || cross.length) {
    k.lock = {};
    if (pos.length) k.lock.pos = pos;
    if (cross.length) k.lock.cross = cross;
  }
  return k;
}
// 隊形の位置を作り直すときは、かならずここを通す。固定した人の座標は、いまの座標のまま残す
function setPos(k, pos) {
  k.pos = lockedPos(k, pos);
}
// pos の中の固定した人を、k のいまの座標に戻した物（k は変えない）
function lockedPos(k, pos) {
  const L = lockPosOf(k);
  return L.length ? pos.map((p, i) => L.includes(i) && k.pos[i] ? [k.pos[i][0], k.pos[i][1]] : p) : pos;
}
// 付け外し（呼ぶ側が先に pushUndo する）。空になったら lock ごと消す
function tidyLock(k) {
  if (!lockPosOf(k).length) delete k.lock.pos;
  if (!lockCrossOf(k).length) delete k.lock.cross;
  if (!Object.keys(k.lock).length) delete k.lock;
}
function toggleLockPos(k, i) {
  if (!k.lock) k.lock = {};
  const L = lockPosOf(k).slice();
  const at = L.indexOf(i);
  if (at >= 0) L.splice(at, 1);
  else L.push(i);
  k.lock.pos = L.sort((a, b) => a - b);
  tidyLock(k);
}
function toggleLockCross(k, a, b) {
  if (!k.lock) k.lock = {};
  const lo = Math.min(a, b), hi = Math.max(a, b), C = lockCrossOf(k).filter(c => !(c[0] === lo && c[1] === hi));
  if (C.length === lockCrossOf(k).length) C.push([lo, hi]);
  k.lock.cross = C.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  tidyLock(k);
}
