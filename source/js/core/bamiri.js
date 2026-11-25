// バミリ番号と「まわりの人」の計算（画面に触らない・保存しない。毎回の表示のときに計算する）
'use strict';
/* ===== 上手・下手の向き ===== */
// 画面の左右と、正面（客席側の縁）が上か下か。x がプラス＝客席から見て右＝上手（ステージの座標）
// 客席から：正面が下・左が下手・右が上手　／　ダンサー目線（舞台の奥から客席を向く）：正面が上・左が上手・右が下手
function stageSides(view) {
  return view !== 'audience'
    ? { frontAtTop: true, left: '上手', right: '下手' }
    : { frontAtTop: false, left: '下手', right: '上手' };
}

/* ===== バミリ番号 ===== */
// 前の縁の中央を 0 とし、左右へ 1m ごとに 1・2・3…（現場でテープを貼る間隔）。上手・下手は文字で添える
const BAMIRI_STEP_M = 1;
const BAMIRI_MIN_PX = 20; // 番号どうしの画面上の間隔の下限。狭い画面・広いステージでは 2・5・10 個おきにする
const bamiriNum = v => Math.abs(Math.round(v * 100) / 100); // 2.5 → 2.5・2.35 → 2.35（0.01m まで。-0 にしない）
// 前の縁に出す番号：[{ x: ステージの x(m), n: 番号 }]。every 個おき（every は 1・2・5…）
function bamiriTicks(stageW, every = 1) {
  const out = [], half = stageW / 2, max = Math.floor(half / BAMIRI_STEP_M + 1e-9);
  for (let k = -max; k <= max; k++) if (k % every === 0) out.push({ x: k * BAMIRI_STEP_M, n: Math.abs(k) });
  return out;
}
// 1m あたり sc px の画面で、番号を何個おきに出すか
function bamiriEvery(sc) {
  const need = BAMIRI_MIN_PX / (sc * BAMIRI_STEP_M);
  return [1, 2, 5, 10, 20].find(m => m >= need) || 20;
}
// 横の位置の読み：「上手2.5」「下手1」「中央0」
function bamiriX(x) {
  const a = bamiriNum(x);
  return a === 0 ? '中央0' : (x > 0 ? '上手' : '下手') + a;
}
// 立ち位置の読み：「上手2.5・前から2.35m」
const bamiriText = (x, y) => `${bamiriX(x)}・前から${bamiriNum(y)}m`;

/* ===== まわりの人（目印の仲間） ===== */
// 隣・前後と呼ぶ最大の距離（m）。見本の並び（0.9〜2m 間隔）の隣は入り、4m 以上離れた人は入らないように決めた値
const NEAR_MAX_M = 2.5;
// i 番の人のまわり。ほかの人を、向き（|dx|≥|dy| なら横、そうでなければ前後）で4つに分け、それぞれ最も近い1人（距離 NEAR_MAX_M 以内）
// 戻り値 { kami, shimo, front, back }：それぞれ { j: 人の番号, d: 距離 } か null。前＝客席側（y が小さい）、後＝奥
function neighborsOf(pos, i, maxM = NEAR_MAX_M) {
  const out = { kami: null, shimo: null, front: null, back: null }, p = pos[i];
  if (!p) return out;
  for (let j = 0; j < pos.length; j++) {
    const q = pos[j];
    if (j === i || !q) continue;
    const dx = q[0] - p[0], dy = q[1] - p[1], d = Math.hypot(dx, dy);
    if (d < 0.01 || d > maxM) continue; // 同じ場所（重なり）と遠い人は出さない
    const key = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'kami' : 'shimo') : (dy < 0 ? 'front' : 'back');
    if (!out[key] || d < out[key].d) out[key] = { j, d };
  }
  return out;
}
// 「左 けい・右 しゅ・前 こは・後 うた」。左右は画面の左右（今の向きに合わせる）。いない側は「なし」
function neighborText(near, names, view) {
  const sd = stageSides(view), pick = side => (side === '上手' ? near.kami : near.shimo);
  const nm = o => (o ? names[o.j] : 'なし');
  return `左 ${nm(pick(sd.left))}・右 ${nm(pick(sd.right))}・前 ${nm(near.front)}・後 ${nm(near.back)}`;
}
